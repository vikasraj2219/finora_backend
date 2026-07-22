const Merchant = require('../models/Merchant.model');
const ApiError = require('../utils/ApiError');

const createMerchant = (userId, payload) => Merchant.create({ ...payload, user: userId });

const listMerchants = (userId, query) => {
  const filter = { user: userId, isDeleted: false };
  if (query.search) filter.name = { $regex: query.search, $options: 'i' };
  return Merchant.find(filter).populate('defaultCategory', 'name type color icon').sort({ name: 1 });
};

const getMerchantById = async (userId, id) => {
  const merchant = await Merchant.findOne({ _id: id, user: userId, isDeleted: false }).populate(
    'defaultCategory',
    'name type color icon'
  );
  if (!merchant) throw new ApiError(404, 'Merchant not found');
  return merchant;
};

const updateMerchant = async (userId, id, payload) => {
  const merchant = await getMerchantById(userId, id);
  Object.assign(merchant, payload);
  await merchant.save();
  return merchant;
};

const softDeleteMerchant = async (userId, id) => {
  const merchant = await getMerchantById(userId, id);
  merchant.isDeleted = true;
  await merchant.save();
  return merchant;
};

// Finds an existing merchant matching this name, or creates one. Used by the
// statement-import confirm step when the user types a brand-new merchant name.
const findOrCreateByName = async (userId, name) => {
  const existing = await Merchant.findOne({ user: userId, name, isDeleted: false });
  if (existing) return existing;
  return Merchant.create({ user: userId, name });
};

module.exports = {
  createMerchant,
  listMerchants,
  getMerchantById,
  updateMerchant,
  softDeleteMerchant,
  findOrCreateByName,
};
