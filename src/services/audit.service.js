const AuditLog = require('../models/AuditLog.model');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

// Audit logging must never break the primary operation it's recording, so failures
// here are swallowed (and logged server-side) rather than thrown.
const logAction = async (userId, action, entityType, entityId, description, metadata) => {
  try {
    await AuditLog.create({ user: userId, action, entityType, entityId, description, metadata });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
};

const listAuditLogs = async (userId, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = { user: userId };
  if (query.entityType) filter.entityType = query.entityType;

  const [items, totalItems] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(totalItems, page, limit) };
};

module.exports = { logAction, listAuditLogs };
