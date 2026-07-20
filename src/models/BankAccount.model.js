const mongoose = require('mongoose');

// Represents a bank account belonging to a user. Balance is maintained by the
// transaction service (Phase 3), never edited directly through this model's API.
const bankAccountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bankName: { type: String, required: true, trim: true },
    accountNickname: { type: String, trim: true },
    accountNumberLast4: { type: String, trim: true },
    accountType: {
      type: String,
      enum: ['savings', 'current', 'salary', 'other'],
      default: 'savings',
    },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    color: { type: String, default: '#146C43' },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bankAccountSchema.index({ user: 1, isDeleted: 1 });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
