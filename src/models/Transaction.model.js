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
    type: {
      type: String,
      enum: ['income', 'expense', 'transfer', 'adjustment', 'opening_balance'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true, default: Date.now },

    // income / expense / adjustment / opening_balance fields
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank', 'upi', 'card', 'other'],
      required() {
        return this.type !== 'transfer';
      },
    },
    bankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    upiAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'UpiAccount' },
    // Only meaningful for 'adjustment': amount is always stored positive, this says
    // which way it moves the balance. Not used for opening_balance (always a starting
    // credit) or income/expense/transfer (direction is implied by their type).
    direction: {
      type: String,
      enum: ['increase', 'decrease'],
      required() {
        return this.type === 'adjustment';
      },
    },
    // Category/subcategory are intentionally optional at the schema level (not just for
    // transfers): an imported transaction can land with only a type known, and the
    // allocationStatus field (below) tracks how complete its classification is. The
    // Type → Category → Subcategory hierarchy is enforced in transaction.service.js —
    // a subcategory can never be set without its category, nor a category without a type.
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory' },
    merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant' },

    // Where this transaction came from — set once at creation, never user-editable after.
    entrySource: { type: String, enum: ['IMPORTED', 'MANUAL'], default: 'MANUAL' },

    // Derived by transaction.service.js from type/category/subcategory on every
    // create/update — never accepted directly from the request body.
    allocationStatus: {
      type: String,
      enum: ['UNALLOCATED', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED'],
      default: 'UNALLOCATED',
    },

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
transactionSchema.index({ user: 1, subcategory: 1 });
transactionSchema.index({ user: 1, isDeleted: 1 });
transactionSchema.index({ user: 1, bankAccount: 1 });
transactionSchema.index({ user: 1, allocationStatus: 1 });
transactionSchema.index({ user: 1, entrySource: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
