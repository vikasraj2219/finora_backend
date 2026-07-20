const mongoose = require('mongoose');

// Base schema for Phase 1 — full transaction business logic (transfers, imports,
// duplicate detection, audit trail) is implemented in Phase 3/4.
const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank', 'upi', 'card', 'other'],
      required: true,
    },
    bankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    upiAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'UpiAccount' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant' },
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

module.exports = mongoose.model('Transaction', transactionSchema);
