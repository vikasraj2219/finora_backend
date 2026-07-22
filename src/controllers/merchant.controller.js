const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const service = require('../services/merchant.service');

const create = catchAsync(async (req, res) => {
  const merchant = await service.createMerchant(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, merchant, 'Merchant created'));
});

const list = catchAsync(async (req, res) => {
  const merchants = await service.listMerchants(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, merchants));
});

const getOne = catchAsync(async (req, res) => {
  const merchant = await service.getMerchantById(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, merchant));
});

const update = catchAsync(async (req, res) => {
  const merchant = await service.updateMerchant(req.user._id, req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, merchant, 'Merchant updated'));
});

const remove = catchAsync(async (req, res) => {
  await service.softDeleteMerchant(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Merchant deleted'));
});

module.exports = { create, list, getOne, update, remove };
