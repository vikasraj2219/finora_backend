const mongoose = require('mongoose');

// One cash-in-hand ledger per user. Auto-created at registration.
// Balance is adjusted directly here in Phase 2; from Phase 3 onward, cash
// transactions (paymentMethod: 'cash') also flow through the balance service.
const cashAccountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentBalance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CashAccount', cashAccountSchema);
