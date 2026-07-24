const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    // Matches a Type document's `code` (see Type.model.js) rather than a hard-coded
    // enum — validated against the real Type collection in category.validator.js so
    // custom category-eligible types can be added without a schema change here.
    type: { type: String, required: true, trim: true, lowercase: true },
    // Section this category belongs to in the full taxonomy, e.g. "Food & Dining",
    // "Loans & Debt" — used to group the category picker instead of one long flat list.
    group: { type: String, trim: true, default: 'Other' },
    // True for categories that move money but aren't real income/expense for P&L purposes:
    // loan principal received/repaid (only interest is a true expense), investments (they
    // build assets, not spend them), and cash withdrawals/deposits (should really be
    // Transfers). Dashboard totals exclude these; the transaction itself is still recorded.
    excludeFromTotals: { type: Boolean, default: false },
    icon: { type: String, default: 'category' },
    color: { type: String, default: '#146C43' },
    isDefault: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.index({ user: 1, name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
