const mongoose = require('mongoose');

// Learns merchant -> category mapping over time to support auto-categorization (Phase 4).
const merchantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    aliases: [{ type: String, trim: true }],
    defaultCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    transactionCount: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

merchantSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Merchant', merchantSchema);
