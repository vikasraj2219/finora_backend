const mongoose = require('mongoose');

// Immutable trail of create/update/delete actions on financial entities.
const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['created', 'updated', 'deleted'], required: true },
    entityType: { type: String, required: true }, // e.g. 'Transaction', 'BankAccount'
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    description: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
