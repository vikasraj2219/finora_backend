const Merchant = require('../models/Merchant.model');

// Best-effort substring match against merchant name/aliases — used to suggest a
// merchant + default category for a raw statement description during import preview.
const matchMerchant = async (userId, description) => {
  if (!description) return null;
  const descLower = description.toLowerCase();

  const merchants = await Merchant.find({ user: userId, isDeleted: false }).populate(
    'defaultCategory',
    'name type color icon'
  );

  return (
    merchants.find((m) => {
      if (descLower.includes(m.name.toLowerCase())) return true;
      return (m.aliases || []).some((alias) => descLower.includes(alias.toLowerCase()));
    }) || null
  );
};

module.exports = { matchMerchant };
