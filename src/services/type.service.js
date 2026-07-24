const Type = require('../models/Type.model');
const Category = require('../models/Category.model');
const ApiError = require('../utils/ApiError');
const { SYSTEM_TYPES } = require('../utils/typeTaxonomy');

// Idempotent — safe to call on every server boot. Only inserts a system type that isn't
// already there (so adding a 6th system type later just means adding it to SYSTEM_TYPES,
// no manual migration), and never overwrites an existing doc, so an admin's cosmetic
// edits to label/icon/color survive restarts.
const seedSystemTypes = async () => {
  for (const t of SYSTEM_TYPES) {
    await Type.updateOne(
      { user: null, code: t.code },
      { $setOnInsert: { ...t, user: null, isSystem: true } },
      { upsert: true }
    );
  }
};

const createType = async (userId, payload) => {
  const code = payload.code.toLowerCase().trim();
  const exists = await Type.findOne({
    isDeleted: false,
    code,
    $or: [{ user: null }, { user: userId }],
  });
  if (exists) throw new ApiError(409, 'A type with this code already exists');

  return Type.create({
    code,
    label: payload.label,
    appliesToCategory: Boolean(payload.appliesToCategory),
    icon: payload.icon,
    color: payload.color,
    user: userId,
    isSystem: false,
  });
};

// System types (shared by everyone) + this user's own custom types.
const listTypes = async (userId, query) => {
  const filter = { isDeleted: false, $or: [{ user: null }, { user: userId }] };
  if (query.appliesToCategory !== undefined) {
    filter.appliesToCategory = query.appliesToCategory === 'true';
  }
  return Type.find(filter).sort({ isSystem: -1, label: 1 });
};

const getTypeById = async (userId, id) => {
  const type = await Type.findOne({ _id: id, isDeleted: false, $or: [{ user: null }, { user: userId }] });
  if (!type) throw new ApiError(404, 'Type not found');
  return type;
};

const updateType = async (userId, id, payload) => {
  const type = await getTypeById(userId, id);
  const { label, icon, color, appliesToCategory } = payload;

  if (type.isSystem) {
    // code/isSystem are permanently fixed on system types — the rest of the app's
    // balance/transaction logic is hard-coded against these exact codes. Cosmetic
    // fields and appliesToCategory (whether it shows up as a category option) are
    // still adjustable.
    if (label !== undefined) type.label = label;
    if (icon !== undefined) type.icon = icon;
    if (color !== undefined) type.color = color;
    if (appliesToCategory !== undefined) type.appliesToCategory = appliesToCategory;
  } else {
    if (type.user.toString() !== userId.toString()) {
      throw new ApiError(403, 'You can only edit your own custom types');
    }
    if (label !== undefined) type.label = label;
    if (icon !== undefined) type.icon = icon;
    if (color !== undefined) type.color = color;
    if (appliesToCategory !== undefined) type.appliesToCategory = Boolean(appliesToCategory);
  }

  await type.save();
  return type;
};

const softDeleteType = async (userId, id) => {
  const type = await getTypeById(userId, id);
  if (type.isSystem) {
    throw new ApiError(400, 'System types cannot be deleted');
  }
  if (type.user.toString() !== userId.toString()) {
    throw new ApiError(403, 'You can only delete your own custom types');
  }
  const inUse = await Category.countDocuments({ user: userId, type: type.code, isDeleted: false });
  if (inUse > 0) {
    throw new ApiError(400, 'Cannot delete a type that still has categories using it');
  }
  type.isDeleted = true;
  await type.save();
  return type;
};

// Used by category.validator.js so 'type must be income/expense' isn't hard-coded there
// anymore — it's real if it exists in the Type collection (system or this user's own)
// and is flagged as category-eligible.
const isValidCategoryType = async (userId, code) => {
  if (!code) return false;
  const type = await Type.findOne({
    code: String(code).toLowerCase().trim(),
    isDeleted: false,
    appliesToCategory: true,
    $or: [{ user: null }, { user: userId }],
  });
  return Boolean(type);
};

module.exports = {
  seedSystemTypes,
  createType,
  listTypes,
  getTypeById,
  updateType,
  softDeleteType,
  isValidCategoryType,
};
