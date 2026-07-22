const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const service = require('../services/dashboard.service');

const summary = catchAsync(async (req, res) => {
  const data = await service.getSummary(req.user._id);
  res.status(200).json(new ApiResponse(200, data));
});

const trends = catchAsync(async (req, res) => {
  const months = Math.min(Math.max(parseInt(req.query.months, 10) || 6, 1), 24);
  const data = await service.getTrends(req.user._id, months);
  res.status(200).json(new ApiResponse(200, data));
});

const categoryBreakdown = catchAsync(async (req, res) => {
  const data = await service.getCategoryBreakdown(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, data));
});

const paymentMethodDistribution = catchAsync(async (req, res) => {
  const data = await service.getPaymentMethodDistribution(req.user._id);
  res.status(200).json(new ApiResponse(200, data));
});

const accountUsage = catchAsync(async (req, res) => {
  const data = await service.getAccountUsage(req.user._id);
  res.status(200).json(new ApiResponse(200, data));
});

const yearlySummary = catchAsync(async (req, res) => {
  const data = await service.getYearlySummary(req.user._id, req.query.year);
  res.status(200).json(new ApiResponse(200, data));
});

module.exports = {
  summary,
  trends,
  categoryBreakdown,
  paymentMethodDistribution,
  accountUsage,
  yearlySummary,
};
