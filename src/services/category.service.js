const Category = require('../models/Category.model');
const Subcategory = require('../models/Subcategory.model');
const ApiError = require('../utils/ApiError');
const { buildDefaultCategories } = require('../utils/categoryTaxonomy');

// Called once at registration so every new user starts with the full default
// category/subcategory taxonomy instead of an empty list.
const seedDefaultCategories = async (userId) => {
  const { docs, subcategoriesByKey } = buildDefaultCategories();

  const categoryDocs = docs.map((c) => ({ ...c, user: userId, isDefault: true }));
  await Category.insertMany(categoryDocs, { ordered: false }).catch(() => {
    // ignore duplicate-key races; safe to no-op since categories are unique per user+name+type
  });

  if (subcategoriesByKey.size === 0) return;

  // Re-fetch to get generated _ids, then seed subcategories against the right parent.
  const created = await Category.find({ user: userId, isDeleted: false });
  const byKey = new Map(created.map((c) => [`${c.type}::${c.name.toLowerCase()}`, c]));

  const subDocs = [];
  for (const [key, names] of subcategoriesByKey.entries()) {
    const category = byKey.get(key);
    if (!category) continue;
    for (const name of names) {
      subDocs.push({ user: userId, category: category._id, type: category.type, name, isDefault: true });
    }
  }

  if (subDocs.length) {
    await Subcategory.insertMany(subDocs, { ordered: false }).catch(() => {});
  }
};

const createCategory = async (userId, payload) => {
  return Category.create({ ...payload, user: userId, isDefault: false });
};

const listCategories = async (userId, query) => {
  const filter = { user: userId, isDeleted: false };
  if (query.type) filter.type = query.type;
  return Category.find(filter).sort({ group: 1, name: 1 });
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
