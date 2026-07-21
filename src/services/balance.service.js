const Transaction = require('../models/Transaction.model');
const BankAccount = require('../models/BankAccount.model');
const CashAccount = require('../models/CashAccount.model');
const ApiError = require('../utils/ApiError');

// Recomputes a bank account's currentBalance from openingBalance + its non-deleted
// income/expense transactions. Transfers are excluded here — the transfer model is
// finalized in Phase 3, where this service will be extended to net both legs.
const recalculateBankAccountBalance = async (bankAccountId) => {
  const account = await BankAccount.findById(bankAccountId);
  if (!account) throw new ApiError(404, 'Bank account not found');

  const [incomeAgg, expenseAgg] = await Promise.all([
    Transaction.aggregate([
      { $match: { bankAccount: account._id, type: 'income', isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { bankAccount: account._id, type: 'expense', isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const totalIncome = incomeAgg[0]?.total || 0;
  const totalExpense = expenseAgg[0]?.total || 0;

  account.currentBalance = account.openingBalance + totalIncome - totalExpense;
  await account.save();
  return account;
};

// Recomputes the user's single cash ledger the same way, filtering on paymentMethod
// instead of a linked account id (cash has no dedicated account reference on Transaction).
const recalculateCashBalance = async (userId) => {
  const cashAccount = await CashAccount.findOne({ user: userId });
  if (!cashAccount) throw new ApiError(404, 'Cash account not found');

  const [incomeAgg, expenseAgg] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: cashAccount.user, type: 'income', paymentMethod: 'cash', isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { user: cashAccount.user, type: 'expense', paymentMethod: 'cash', isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const totalIncome = incomeAgg[0]?.total || 0;
  const totalExpense = expenseAgg[0]?.total || 0;

  // Cash has no "opening balance" concept here — it starts at 0 and is otherwise
  // only moved by transactions or a manual adjustment (see cash.service.js).
  cashAccount.currentBalance = totalIncome - totalExpense;
  await cashAccount.save();
  return cashAccount;
};

module.exports = { recalculateBankAccountBalance, recalculateCashBalance };
