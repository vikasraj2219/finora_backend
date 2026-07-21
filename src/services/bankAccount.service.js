const BankAccount = require('../models/BankAccount.model');
const UpiAccount = require('../models/UpiAccount.model');
const ApiError = require('../utils/ApiError');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

const createBankAccount = async (userId, payload) => {
  const account = await BankAccount.create({
    ...payload,
    user: userId,
    currentBalance: payload.openingBalance || 0,
  });
  return account;
};

const listBankAccounts = async (userId, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = { user: userId, isDeleted: false };
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.search) filter.bankName = { $regex: query.search, $options: 'i' };

  const [items, totalItems] = await Promise.all([
    BankAccount.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    BankAccount.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(totalItems, page, limit) };
};

const getBankAccountById = async (userId, id) => {
  const account = await BankAccount.findOne({ _id: id, user: userId, isDeleted: false });
  if (!account) throw new ApiError(404, 'Bank account not found');
  return account;
};

// openingBalance / currentBalance are intentionally excluded from the generic
// update path — use adjustBalance or the (Phase 3) transaction flow instead.
const updateBankAccount = async (userId, id, payload) => {
  const { openingBalance, currentBalance, ...safePayload } = payload;
  const account = await getBankAccountById(userId, id);
  Object.assign(account, safePayload);
  await account.save();
  return account;
};

const adjustBankAccountBalance = async (userId, id, delta, note) => {
  const account = await getBankAccountById(userId, id);
  account.currentBalance += delta;
  await account.save();
  return { account, delta, note: note || null };
};

const toggleActive = async (userId, id) => {
  const account = await getBankAccountById(userId, id);
  account.isActive = !account.isActive;
  await account.save();
  return account;
};

const softDeleteBankAccount = async (userId, id) => {
  const account = await getBankAccountById(userId, id);

  const linkedUpiCount = await UpiAccount.countDocuments({
    linkedBankAccount: id,
    isDeleted: false,
  });
  if (linkedUpiCount > 0) {
    throw new ApiError(
      409,
      `Cannot delete: ${linkedUpiCount} UPI account(s) are linked to this bank account`
    );
  }

  account.isDeleted = true;
  account.isActive = false;
  await account.save();
  return account;
};

module.exports = {
  createBankAccount,
  listBankAccounts,
  getBankAccountById,
  updateBankAccount,
  adjustBankAccountBalance,
  toggleActive,
  softDeleteBankAccount,
};
