const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const cashService = require('../services/cash.service');
const { recalculateCashBalance } = require('../services/balance.service');

const getBalance = catchAsync(async (req, res) => {
  const account = await cashService.getCashAccount(req.user._id);
  res.status(200).json(new ApiResponse(200, account));
});

const adjust = catchAsync(async (req, res) => {
  const { amount } = req.body;
  const account = await cashService.adjustCashBalance(req.user._id, amount);
  res.status(200).json(new ApiResponse(200, account, 'Cash balance adjusted'));
});

const recalculate = catchAsync(async (req, res) => {
  const account = await recalculateCashBalance(req.user._id);
  res.status(200).json(new ApiResponse(200, account, 'Cash balance recalculated from transactions'));
});

module.exports = { getBalance, adjust, recalculate };
