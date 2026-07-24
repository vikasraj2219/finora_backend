// The 5 system types, mirroring Transaction.model.js's type enum exactly. Seeded once
// at server boot (see type.service.js#seedSystemTypes) so the Type collection always
// has these even on a brand-new database — no manual migration step required.
//
// appliesToCategory marks which of these a Category/Subcategory can actually be created
// under: income/expense have a real P&L category breakdown, the other three don't
// (a transfer or an opening balance isn't "spent" on anything).
const SYSTEM_TYPES = [
  { code: 'income', label: 'Income', appliesToCategory: true, icon: 'trending_up', color: '#22C55E' },
  { code: 'expense', label: 'Expense', appliesToCategory: true, icon: 'trending_down', color: '#EF4444' },
  { code: 'transfer', label: 'Transfer', appliesToCategory: false, icon: 'swap_horiz', color: '#3B82F6' },
  { code: 'adjustment', label: 'Adjustment', appliesToCategory: false, icon: 'tune', color: '#94A3B8' },
  {
    code: 'opening_balance',
    label: 'Opening Balance',
    appliesToCategory: false,
    icon: 'account_balance_wallet',
    color: '#8B5CF6',
  },
];

module.exports = { SYSTEM_TYPES };
