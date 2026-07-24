const mongoose = require('mongoose');

const typeSchema = new mongoose.Schema(
  {
    // null for global system types shared by every user; set for a custom type a
    // specific user added on top of the system list.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Machine key stored on Category/Subcategory.type — lowercase, stable, never
    // changes after creation even if the label does. Transaction.type is intentionally
    // NOT tied to this collection: transfer/adjustment/opening_balance each drive real
    // balance-side-effect logic in balance.service.js/transaction.service.js that a
    // custom type wouldn't have, so that field stays a fixed schema enum.
    code: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    // Whether a Category/Subcategory can be created with this type. income/expense are
    // true; transfer/adjustment/opening_balance are false (those transactions don't
    // carry a P&L category).
    appliesToCategory: { type: Boolean, default: false },
    icon: { type: String, default: 'label' },
    color: { type: String, default: '#64748B' },
    // System types are seeded once at server boot (see type.service.js#seedSystemTypes)
    // and represent the types the rest of the app's business logic is hard-coded
    // against — their code can't be changed and they can't be deleted, but label/icon/
    // color are safe cosmetic edits. Custom types are purely descriptive/for category
    // grouping and carry no special balance-side-effect logic.
    isSystem: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// System types: unique by code globally (user: null). Custom types: unique per user+code.
typeSchema.index({ user: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Type', typeSchema);
