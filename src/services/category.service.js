const Category = require('../models/Category.model');
const ApiError = require('../utils/ApiError');

const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income', icon: 'work', color: '#146C43' },
  { name: 'Freelance', type: 'income', icon: 'laptop', color: '#22C55E' },
  { name: 'Investment Returns', type: 'income', icon: 'trending_up', color: '#3B82F6' },
  { name: 'Other Income', type: 'income', icon: 'attach_money', color: '#84CC16' },
  { name: 'Food & Dining', type: 'expense', icon: 'restaurant', color: '#EF4444' },
  { name: 'Groceries', type: 'expense', icon: 'shopping_cart', color: '#F97316' },
  { name: 'Transport', type: 'expense', icon: 'directions_car', color: '#F59E0B' },
  { name: 'Rent', type: 'expense', icon: 'home', color: '#8B5CF6' },
  { name: 'Utilities & Bills', type: 'expense', icon: 'bolt', color: '#06B6D4' },
  { name: 'Shopping', type: 'expense', icon: 'shopping_bag', color: '#EC4899' },
  { name: 'Health', type: 'expense', icon: 'favorite', color: '#DC2626' },
  { name: 'Entertainment', type: 'expense', icon: 'movie', color: '#7C3AED' },
  { name: 'Education', type: 'expense', icon: 'school', color: '#2563EB' },
  { name: 'Other', type: 'expense', icon: 'category', color: '#64748B' },
];

// Called once at registration so every new user starts with a usable category set.
const seedDefaultCategories = async (userId) => {
  const docs = DEFAULT_CATEGORIES.map((c) => ({ ...c, user: userId, isDefault: true }));
  await Category.insertMany(docs, { ordered: false }).catch(() => {
    // ignore duplicate-key races; safe to no-op since categories are unique per user+name+type
  });
};

const createCategory = async (userId, payload) => {
  return Category.create({ ...payload, user: userId, isDefault: false });
};

const listCategories = async (userId, query) => {
  const filter = { user: userId, isDeleted: false };
  if (query.type) filter.type = query.type;
  return Category.find(filter).sort({ name: 1 });
};

const getCategoryById = async (userId, id) => {
  const category = await Category.findOne({ _id: id, user: userId, isDeleted: false });
  if (!category) throw new ApiError(404, 'Category not found');
  return category;
};

const updateCategory = async (userId, id, payload) => {
  const category = await getCategoryById(userId, id);
  Object.assign(category, payload);
  await category.save();
  return category;
};

const softDeleteCategory = async (userId, id) => {
  const category = await getCategoryById(userId, id);
  category.isDeleted = true;
  await category.save();
  return category;
};

module.exports = {
  seedDefaultCategories,
  createCategory,
  listCategories,
  getCategoryById,
  updateCategory,
  softDeleteCategory,
};
