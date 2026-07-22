const Transaction = require('../models/Transaction.model');

// Flags a probable duplicate: same bank account, same amount, same calendar day.
// Used during import preview so the user can skip re-importing a statement line
// that's already in the system.
const findDuplicateTransaction = async (userId, bankAccountId, date, amount) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return Transaction.findOne({
    user: userId,
    bankAccount: bankAccountId,
    amount,
    date: { $gte: dayStart, $lte: dayEnd },
    isDeleted: false,
  });
};

module.exports = { findDuplicateTransaction };
