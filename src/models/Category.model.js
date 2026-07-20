const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    icon: { type: String, default: 'category' },
    color: { type: String, default: '#146C43' },
    isDefault: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.index({ user: 1, name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
