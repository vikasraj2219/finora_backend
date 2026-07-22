const mongoose = require('mongoose');
const Transaction = require('../models/Transaction.model');
const BankAccount = require('../models/BankAccount.model');
const UpiAccount = require('../models/UpiAccount.model');
const CashAccount = require('../models/CashAccount.model');
const Category = require('../models/Category.model');

const sumAgg = (agg) => agg[0]?.total || 0;

// The single "everything you need for the dashboard's top stats" call.
const getSummary = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [
    totalIncomeAgg,
    totalExpenseAgg,
    monthlyIncomeAgg,
    monthlyExpenseAgg,
    todaySpendingAgg,
    bankAccounts,
    cashAccount,
    largestExpense,
    largestIncome,
    mostUsedBankAgg,
    mostUsedUpiAgg,
    highestCategoryAgg,
  ] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: uid, type: 'income', isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { user: uid, type: 'expense', isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { user: uid, type: 'income', isDeleted: false, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { user: uid, type: 'expense', isDeleted: false, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user: uid,
          type: 'expense',
          isDeleted: false,
          date: { $gte: startOfToday, $lt: endOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    BankAccount.find({ user: userId, isDeleted: false }),
    CashAccount.findOne({ user: userId }),
    Transaction.findOne({ user: uid, type: 'expense', isDeleted: false })
      .sort({ amount: -1 })
      .populate('category', 'name'),
    Transaction.findOne({ user: uid, type: 'income', isDeleted: false })
      .sort({ amount: -1 })
      .populate('category', 'name'),
    Transaction.aggregate([
      { $match: { user: uid, bankAccount: { $ne: null }, isDeleted: false } },
      { $group: { _id: '$bankAccount', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
    Transaction.aggregate([
      { $match: { user: uid, upiAccount: { $ne: null }, isDeleted: false } },
      { $group: { _id: '$upiAccount', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
    Transaction.aggregate([
      { $match: { user: uid, type: 'expense', isDeleted: false, category: { $ne: null } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
    ]),
  ]);

  const totalIncome = sumAgg(totalIncomeAgg);
  const totalExpense = sumAgg(totalExpenseAgg);
  const monthlyIncome = sumAgg(monthlyIncomeAgg);
  const monthlyExpense = sumAgg(monthlyExpenseAgg);
  const todaySpending = sumAgg(todaySpendingAgg);

  const cashInHand =
    bankAccounts.reduce((sum, b) => sum + b.currentBalance, 0) + (cashAccount?.currentBalance || 0);

  let mostUsedBank = null;
  if (mostUsedBankAgg[0]) {
    const bank = await BankAccount.findById(mostUsedBankAgg[0]._id);
    if (bank) mostUsedBank = { id: bank._id, name: bank.bankName, transactionCount: mostUsedBankAgg[0].count };
  }

  let mostUsedUpi = null;
  if (mostUsedUpiAgg[0]) {
    const upi = await UpiAccount.findById(mostUsedUpiAgg[0]._id);
    if (upi) {
      mostUsedUpi = {
        id: upi._id,
        name: upi.nickname || upi.provider,
        transactionCount: mostUsedUpiAgg[0].count,
      };
    }
  }

  let highestSpendingCategory = null;
  if (highestCategoryAgg[0]) {
    const category = await Category.findById(highestCategoryAgg[0]._id);
    if (category) {
      highestSpendingCategory = { id: category._id, name: category.name, total: highestCategoryAgg[0].total };
    }
  }

  const expenseRatio = monthlyIncome > 0 ? Math.round((monthlyExpense / monthlyIncome) * 1000) / 10 : null;

  return {
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
    cashInHand,
    bankBalances: bankAccounts.map((b) => ({
      id: b._id,
      bankName: b.bankName,
      currentBalance: b.currentBalance,
    })),
    todaySpending,
    monthlyIncome,
    monthlyExpense,
    monthlySaving: monthlyIncome - monthlyExpense,
    expenseRatio,
    mostUsedBank,
    mostUsedUpi,
    highestSpendingCategory,
    largestExpense: largestExpense
      ? {
          id: largestExpense._id,
          amount: largestExpense.amount,
          category: largestExpense.category?.name || null,
          date: largestExpense.date,
        }
      : null,
    largestIncome: largestIncome
      ? {
          id: largestIncome._id,
          amount: largestIncome.amount,
          category: largestIncome.category?.name || null,
          date: largestIncome.date,
        }
      : null,
  };
};

// Monthly income/expense/net-flow series for the last N months (default 6) — powers the
// Income vs Expense bar chart and the Cash Flow / Savings Trend line charts.
const getTrends = async (userId, months = 6) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const agg = await Transaction.aggregate([
    {
      $match: {
        user: uid,
        isDeleted: false,
        type: { $in: ['income', 'expense'] },
        date: { $gte: rangeStart },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const find = (year, month, type) =>
    agg.find((a) => a._id.year === year && a._id.month === month && a._id.type === type)?.total || 0;

  const result = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const income = find(year, month, 'income');
    const expense = find(year, month, 'expense');
    result.push({
      label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      year,
      month,
      income,
      expense,
      netFlow: income - expense,
      saving: income - expense,
    });
  }
  return result;
};

// Category-wise spend (or income) share for a date range, defaults to all-time.
const getCategoryBreakdown = async (userId, query) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const type = query.type === 'income' ? 'income' : 'expense';

  const match = { user: uid, isDeleted: false, type, category: { $ne: null } };
  if (query.dateFrom || query.dateTo) {
    match.date = {};
    if (query.dateFrom) match.date.$gte = new Date(query.dateFrom);
    if (query.dateTo) match.date.$lte = new Date(query.dateTo);
  }

  const agg = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ]);

  const categories = await Category.find({ _id: { $in: agg.map((a) => a._id) } });
  const categoryMap = new Map(categories.map((c) => [String(c._id), c]));
  const grandTotal = agg.reduce((sum, a) => sum + a.total, 0);

  return agg.map((a) => {
    const category = categoryMap.get(String(a._id));
    return {
      categoryId: a._id,
      name: category?.name || 'Unknown',
      color: category?.color || '#64748B',
      total: a.total,
      percentage: grandTotal > 0 ? Math.round((a.total / grandTotal) * 1000) / 10 : 0,
    };
  });
};

// Total spend/income split by how it was paid — powers the Payment Method Distribution chart.
const getPaymentMethodDistribution = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const agg = await Transaction.aggregate([
    {
      $match: {
        user: uid,
        isDeleted: false,
        type: { $in: ['income', 'expense'] },
        paymentMethod: { $ne: null },
      },
    },
    { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  return agg.map((a) => ({ method: a._id, total: a.total, count: a.count }));
};

// How much volume/count flows through each bank account and each UPI app.
const getAccountUsage = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const [bankAgg, upiAgg] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: uid, isDeleted: false, bankAccount: { $ne: null } } },
      { $group: { _id: '$bankAccount', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Transaction.aggregate([
      { $match: { user: uid, isDeleted: false, upiAccount: { $ne: null } } },
      { $group: { _id: '$upiAccount', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  const [banks, upis] = await Promise.all([
    BankAccount.find({ _id: { $in: bankAgg.map((b) => b._id) } }),
    UpiAccount.find({ _id: { $in: upiAgg.map((u) => u._id) } }),
  ]);
  const bankMap = new Map(banks.map((b) => [String(b._id), b]));
  const upiMap = new Map(upis.map((u) => [String(u._id), u]));

  return {
    banks: bankAgg.map((b) => ({
      id: b._id,
      name: bankMap.get(String(b._id))?.bankName || 'Unknown',
      total: b.total,
      count: b.count,
    })),
    upi: upiAgg.map((u) => ({
      id: u._id,
      name: upiMap.get(String(u._id))?.nickname || upiMap.get(String(u._id))?.provider || 'Unknown',
      total: u.total,
      count: u.count,
    })),
  };
};

// 12-month income/expense/saving breakdown for a given calendar year (defaults to current year).
const getYearlySummary = async (userId, yearParam) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const year = parseInt(yearParam, 10) || new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const agg = await Transaction.aggregate([
    {
      $match: {
        user: uid,
        isDeleted: false,
        type: { $in: ['income', 'expense'] },
        date: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: { month: { $month: '$date' }, type: '$type' }, total: { $sum: '$amount' } } },
  ]);

  const find = (month, type) => agg.find((a) => a._id.month === month && a._id.type === type)?.total || 0;

  const months = [];
  for (let m = 1; m <= 12; m += 1) {
    const income = find(m, 'income');
    const expense = find(m, 'expense');
    months.push({
      month: m,
      label: new Date(year, m - 1, 1).toLocaleString('en-IN', { month: 'short' }),
      income,
      expense,
      saving: income - expense,
    });
  }

  return { year, months };
};

module.exports = {
  getSummary,
  getTrends,
  getCategoryBreakdown,
  getPaymentMethodDistribution,
  getAccountUsage,
  getYearlySummary,
};
