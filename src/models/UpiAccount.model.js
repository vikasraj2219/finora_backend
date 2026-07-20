const mongoose = require('mongoose');

const upiAccountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: {
      type: String,
      enum: ['GPay', 'PhonePe', 'Paytm', 'BHIM', 'AmazonPay', 'Other'],
      required: true,
    },
    upiId: { type: String, trim: true },
    linkedBankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    nickname: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

upiAccountSchema.index({ user: 1, isDeleted: 1 });

module.exports = mongoose.model('UpiAccount', upiAccountSchema);
