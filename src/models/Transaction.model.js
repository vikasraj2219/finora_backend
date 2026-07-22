const mongoose = require('mongoose');

// Used only when type === 'transfer'. 'cash' refers to the user's single CashAccount,
// so bankAccount is only required when type === 'bank'.
const transferPartySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['bank', 'cash'], required: true },
    bankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true, default: Date.now },

    // income / expense fields
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank', 'upi', 'card', 'other'],
      required() {
        return this.type !== 'transfer';
      },
    },
    bankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    upiAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'UpiAccount' },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required() {
        return this.type !== 'transfer';
      },
    },
    merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant' },

    // transfer-only fields
    transferFrom: { type: transferPartySchema },
    transferTo: { type: transferPartySchema },

    note: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    receiptUrl: { type: String },
    importBatchId: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1 });
transactionSchema.index({ user: 1, isDeleted: 1 });
transactionSchema.index({ user: 1, bankAccount: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
