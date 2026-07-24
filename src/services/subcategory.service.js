const Subcategory = require('../models/Subcategory.model');
const Category = require('../models/Category.model');
const ApiError = require('../utils/ApiError');

const assertCategoryOwnership = async (userId, categoryId) => {
  const category = await Category.findOne({ _id: categoryId, user: userId, isDeleted: false });
  if (!category) throw new ApiError(400, 'Category not found or does not belong to you');
  return category;
};

const createSubcategory = async (userId, payload) => {
  const category = await assertCategoryOwnership(userId, payload.category);
  return Subcategory.create({
    user: userId,
    category: category._id,
    type: category.type,
    name: payload.name,
    icon: payload.icon,
    isDefault: false,
  });
};

// query.category is required by the route validator — subcategories are always
// browsed in the context of a specific category (per the Type → Category → Subcategory
// cascade), never as one flat cross-category list.
const listSubcategories = async (userId, query) => {
  const filter = { user: userId, isDeleted: false };
  if (query.category) filter.category = query.category;
  if (query.type) filter.type = query.type;
  return Subcategory.find(filter).sort({ name: 1 });
};

const getSubcategoryById = async (userId, id) => {
  const sub = await Subcategory.findOne({ _id: id, user: userId, isDeleted: false });
  if (!sub) throw new ApiError(404, 'Subcategory not found');
  return sub;
};

const updateSubcategory = async (userId, id, payload) => {
  const sub = await getSubcategoryById(userId, id);
  if (payload.name !== undefined) sub.name = payload.name;
  if (payload.icon !== undefined) sub.icon = payload.icon;
  await sub.save();
  return sub;
};

const softDeleteSubcategory = async (userId, id) => {
  const sub = await getSubcategoryById(userId, id);
  sub.isDeleted = true;
  await sub.save();
  return sub;
};

// Used by the allocation-status calculation: a category with zero subcategories can
// still be "fully allocated" with no subcategory chosen, since there's nothing further
// to pick. A category with subcategories requires one to be selected.
const categoryHasSubcategories = async (userId, categoryId) => {
  if (!categoryId) return false;
  const count = await Subcategory.countDocuments({ user: userId, category: categoryId, isDeleted: false });
  return count > 0;
};

module.exports = {
  createSubcategory,
  listSubcategories,
  getSubcategoryById,
  updateSubcategory,
  softDeleteSubcategory,
  categoryHasSubcategories,
};
