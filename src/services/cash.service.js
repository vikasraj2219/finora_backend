const CashAccount = require('../models/CashAccount.model');

// Called once at registration alongside default categories.
const createCashAccountForUser = async (userId) => {
  return CashAccount.create({ user: userId, currentBalance: 0 });
};

// Self-healing: a user should always have exactly one CashAccount (created at
// registration), but older accounts or edge cases can end up without one.
// Rather than 404ing forever, create it lazily on first access.
const getCashAccount = async (userId) => {
  let account = await CashAccount.findOne({ user: userId });
  if (!account) {
    account = await createCashAccountForUser(userId);
  }
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
