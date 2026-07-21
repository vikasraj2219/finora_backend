const CashAccount = require('../models/CashAccount.model');
const ApiError = require('../utils/ApiError');

// Called once at registration alongside default categories.
const createCashAccountForUser = async (userId) => {
  return CashAccount.create({ user: userId, currentBalance: 0 });
};

const getCashAccount = async (userId) => {
  const account = await CashAccount.findOne({ user: userId });
  if (!account) throw new ApiError(404, 'Cash account not found');
  return account;
};

// Positive delta = cash added (e.g. withdrawal, cash income); negative = cash spent.
const adjustCashBalance = async (userId, delta) => {
  const account = await getCashAccount(userId);
  account.currentBalance += delta;
  await account.save();
  return account;
};

module.exports = { createCashAccountForUser, getCashAccount, adjustCashBalance };
