const Transaction = require('../models/Transaction.model');
const BankAccount = require('../models/BankAccount.model');
const CashAccount = require('../models/CashAccount.model');
const Merchant = require('../models/Merchant.model');
const ApiError = require('../utils/ApiError');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');
const { logAction } = require('./audit.service');
const { createNotification } = require('./notification.service');

const LARGE_EXPENSE_THRESHOLD = 10000;

const assertBankAccountOwnership = async (userId, bankAccountId) => {
  const account = await BankAccount.findOne({ _id: bankAccountId, user: userId, isDeleted: false });
  if (!account) throw new ApiError(400, 'Bank account not found or does not belong to you');
  return account;
};

const getCashAccount = async (userId) => {
  const account = await CashAccount.findOne({ user: userId });
  if (!account) throw new ApiError(404, 'Cash account not found');
  return account;
};

const validateTransferPayload = async (userId, txn) => {
  const { transferFrom, transferTo } = txn;
  if (!transferFrom || !transferTo) {
    throw new ApiError(400, 'transferFrom and transferTo are required for transfers');
  }
  if (transferFrom.type === 'bank') await assertBankAccountOwnership(userId, transferFrom.bankAccount);
  if (transferTo.type === 'bank') await assertBankAccountOwnership(userId, transferTo.bankAccount);

  const sameBank =
    transferFrom.type === 'bank' &&
    transferTo.type === 'bank' &&
    String(transferFrom.bankAccount) === String(transferTo.bankAccount);
  const sameCash = transferFrom.type === 'cash' && transferTo.type === 'cash';

  if (sameBank || sameCash) {
    throw new ApiError(400, 'fromAccount and toAccount must be different');
  }
};

// Applies (sign = 1) or reverses (sign = -1) a transaction's effect on account balances.
// Used symmetrically on create (+1), update (-1 then +1), and delete (-1).
const applyEffect = async (userId, txn, sign) => {
  if (txn.type === 'transfer') {
    const moveOut = async (party) => {
      if (party.type === 'bank') {
        const account = await BankAccount.findById(party.bankAccount);
        if (account) {
          account.currentBalance -= sign * txn.amount;
          await account.save();
        }
      } else {
        const cash = await getCashAccount(userId);
        cash.currentBalance -= sign * txn.amount;
        await cash.save();
      }
    };
    const moveIn = async (party) => {
      if (party.type === 'bank') {
        const account = await BankAccount.findById(party.bankAccount);
        if (account) {
          account.currentBalance += sign * txn.amount;
          await account.save();
        }
      } else {
        const cash = await getCashAccount(userId);
        cash.currentBalance += sign * txn.amount;
        await cash.save();
      }
    };
    await moveOut(txn.transferFrom);
    await moveIn(txn.transferTo);
    return;
  }

  const delta = txn.type === 'income' ? sign * txn.amount : -sign * txn.amount;

  if (txn.bankAccount) {
    const account = await BankAccount.findById(txn.bankAccount);
    if (account) {
      account.currentBalance += delta;
      await account.save();
    }
  } else if (txn.paymentMethod === 'cash') {
    const cash = await getCashAccount(userId);
    cash.currentBalance += delta;
    await cash.save();
  }
  // paymentMethod 'upi' with no linked bankAccount, or 'other', is tracked for
  // reporting only and does not move a balance.
};

const updateMerchantStats = async (txn) => {
  if (!txn.merchant) return;
  await Merchant.findByIdAndUpdate(txn.merchant, {
    $inc: {
      transactionCount: 1,
      totalPaid: txn.type === 'expense' ? txn.amount : 0,
    },
  });
};

// Best-effort alerts — a large expense, or a bank account that's gone negative.
// Failures inside createNotification are already swallowed, so this never throws.
const maybeNotify = async (userId, txn) => {
  if (txn.type === 'expense' && txn.amount >= LARGE_EXPENSE_THRESHOLD) {
    await createNotification(
      userId,
      'Large expense recorded',
      `An expense of ${txn.amount} was recorded${txn.note ? `: ${txn.note}` : ''}.`,
      'warning'
    );
  }

  if (txn.bankAccount) {
    const account = await BankAccount.findById(txn.bankAccount);
    if (account && account.currentBalance < 0) {
      await createNotification(
        userId,
        'Bank account overdrawn',
        `${account.bankName} balance has gone negative (${account.currentBalance}).`,
        'error'
      );
    }
  }
};

const createTransaction = async (userId, payload) => {
  const doc = { ...payload, user: userId };

  if (doc.type === 'transfer') {
    await validateTransferPayload(userId, doc);
    delete doc.category;
    delete doc.merchant;
    delete doc.paymentMethod;
    delete doc.bankAccount;
    delete doc.upiAccount;
  } else {
    if (doc.bankAccount) await assertBankAccountOwnership(userId, doc.bankAccount);
    delete doc.transferFrom;
    delete doc.transferTo;
  }

  const txn = await Transaction.create(doc);
  await applyEffect(userId, txn, 1);
  await updateMerchantStats(txn);
  await logAction(userId, 'created', 'Transaction', txn._id, `${txn.type} of ${txn.amount} recorded`);
  await maybeNotify(userId, txn);

  return txn;
};

const listTransactions = async (userId, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = { user: userId, isDeleted: false };

  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;
  if (query.bankAccount) filter.bankAccount = query.bankAccount;
  if (query.upiAccount) filter.upiAccount = query.upiAccount;
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
  if (query.merchant) filter.merchant = query.merchant;

  if (query.dateFrom || query.dateTo) {
    filter.date = {};
    if (query.dateFrom) filter.date.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.date.$lte = new Date(query.dateTo);
  }
  if (query.minAmount || query.maxAmount) {
    filter.amount = {};
    if (query.minAmount) filter.amount.$gte = Number(query.minAmount);
    if (query.maxAmount) filter.amount.$lte = Number(query.maxAmount);
  }
  if (query.search) filter.note = { $regex: query.search, $options: 'i' };

  const sortableFields = ['date', 'amount', 'createdAt'];
  const sortField = sortableFields.includes(query.sortBy) ? query.sortBy : 'date';
  const sortDir = query.sortDir === 'asc' ? 1 : -1;

  const [items, totalItems] = await Promise.all([
    Transaction.find(filter)
      .populate('category', 'name type color icon')
      .populate('merchant', 'name')
      .populate('bankAccount', 'bankName accountNickname')
      .populate('upiAccount', 'provider nickname')
      .populate('transferFrom.bankAccount', 'bankName accountNickname')
      .populate('transferTo.bankAccount', 'bankName accountNickname')
      .sort({ [sortField]: sortDir, _id: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(totalItems, page, limit) };
};

const getTransactionById = async (userId, id) => {
  const txn = await Transaction.findOne({ _id: id, user: userId, isDeleted: false })
    .populate('category', 'name type color icon')
    .populate('merchant', 'name')
    .populate('bankAccount', 'bankName accountNickname')
    .populate('upiAccount', 'provider nickname')
    .populate('transferFrom.bankAccount', 'bankName accountNickname')
    .populate('transferTo.bankAccount', 'bankName accountNickname');
  if (!txn) throw new ApiError(404, 'Transaction not found');
  return txn;
};

// Reverses the transaction's old balance effect, applies the merged changes, then
// re-applies the effect with the new values — keeps balances correct across edits
// that change amount, account, or type.
const updateTransaction = async (userId, id, payload) => {
  const txn = await Transaction.findOne({ _id: id, user: userId, isDeleted: false });
  if (!txn) throw new ApiError(404, 'Transaction not found');

  const before = txn.toObject();
  await applyEffect(userId, txn, -1);

  Object.assign(txn, payload);

  if (txn.type === 'transfer') {
    await validateTransferPayload(userId, txn);
    txn.category = undefined;
    txn.merchant = undefined;
    txn.paymentMethod = undefined;
    txn.bankAccount = undefined;
    txn.upiAccount = undefined;
  } else {
    if (txn.bankAccount) await assertBankAccountOwnership(userId, txn.bankAccount);
    txn.transferFrom = undefined;
    txn.transferTo = undefined;
  }

  await txn.save();
  await applyEffect(userId, txn, 1);

  await logAction(userId, 'updated', 'Transaction', txn._id, 'Transaction updated', {
    before,
    after: txn.toObject(),
  });
  await maybeNotify(userId, txn);

  return txn;
};

const softDeleteTransaction = async (userId, id) => {
  const txn = await Transaction.findOne({ _id: id, user: userId, isDeleted: false });
  if (!txn) throw new ApiError(404, 'Transaction not found');

  await applyEffect(userId, txn, -1);
  txn.isDeleted = true;
  await txn.save();

  await logAction(userId, 'deleted', 'Transaction', txn._id, `${txn.type} of ${txn.amount} deleted`);
  return txn;
};

const uploadReceipt = async (userId, id, fileUrl) => {
  const txn = await Transaction.findOne({ _id: id, user: userId, isDeleted: false });
  if (!txn) throw new ApiError(404, 'Transaction not found');
  txn.receiptUrl = fileUrl;
  await txn.save();
  await logAction(userId, 'updated', 'Transaction', txn._id, 'Receipt attached');
  return txn;
};

const removeReceipt = async (userId, id) => {
  const txn = await Transaction.findOne({ _id: id, user: userId, isDeleted: false });
  if (!txn) throw new ApiError(404, 'Transaction not found');
  txn.receiptUrl = undefined;
  await txn.save();
  await logAction(userId, 'updated', 'Transaction', txn._id, 'Receipt removed');
  return txn;
};

module.exports = {
  createTransaction,
  listTransactions,
  getTransactionById,
  updateTransaction,
  softDeleteTransaction,
  uploadReceipt,
  removeReceipt,
};
