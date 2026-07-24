const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    // Denormalized from the parent category (matches a Type document's `code` — see
    // Type.model.js) so subcategory queries/filters don't need a join to know the type.
    type: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: 'category' },
    isDefault: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

subcategorySchema.index({ user: 1, category: 1, name: 1 }, { unique: true });
subcategorySchema.index({ user: 1, category: 1, isDeleted: 1 });

module.exports = mongoose.model('Subcategory', subcategorySchema);
