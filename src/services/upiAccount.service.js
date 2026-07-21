const UpiAccount = require('../models/UpiAccount.model');
const BankAccount = require('../models/BankAccount.model');
const ApiError = require('../utils/ApiError');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

const assertLinkedBankBelongsToUser = async (userId, bankAccountId) => {
  if (!bankAccountId) return;
  const bank = await BankAccount.findOne({ _id: bankAccountId, user: userId, isDeleted: false });
  if (!bank) throw new ApiError(400, 'linkedBankAccount does not exist or does not belong to you');
};

const createUpiAccount = async (userId, payload) => {
  await assertLinkedBankBelongsToUser(userId, payload.linkedBankAccount);
  return UpiAccount.create({ ...payload, user: userId });
};

const listUpiAccounts = async (userId, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = { user: userId, isDeleted: false };
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.provider) filter.provider = query.provider;

  const [items, totalItems] = await Promise.all([
    UpiAccount.find(filter)
      .populate('linkedBankAccount', 'bankName accountNickname accountNumberLast4')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    UpiAccount.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(totalItems, page, limit) };
};

const getUpiAccountById = async (userId, id) => {
  const account = await UpiAccount.findOne({ _id: id, user: userId, isDeleted: false }).populate(
    'linkedBankAccount',
    'bankName accountNickname accountNumberLast4'
  );
  if (!account) throw new ApiError(404, 'UPI account not found');
  return account;
};

const updateUpiAccount = async (userId, id, payload) => {
  if (payload.linkedBankAccount) {
    await assertLinkedBankBelongsToUser(userId, payload.linkedBankAccount);
  }
  const account = await UpiAccount.findOne({ _id: id, user: userId, isDeleted: false });
  if (!account) throw new ApiError(404, 'UPI account not found');
  Object.assign(account, payload);
  await account.save();
  return account;
};

const toggleActive = async (userId, id) => {
  const account = await UpiAccount.findOne({ _id: id, user: userId, isDeleted: false });
  if (!account) throw new ApiError(404, 'UPI account not found');
  account.isActive = !account.isActive;
  await account.save();
  return account;
};

const softDeleteUpiAccount = async (userId, id) => {
  const account = await UpiAccount.findOne({ _id: id, user: userId, isDeleted: false });
  if (!account) throw new ApiError(404, 'UPI account not found');
  account.isDeleted = true;
  account.isActive = false;
  await account.save();
  return account;
};

module.exports = {
  createUpiAccount,
  listUpiAccounts,
  getUpiAccountById,
  updateUpiAccount,
  toggleActive,
  softDeleteUpiAccount,
};
