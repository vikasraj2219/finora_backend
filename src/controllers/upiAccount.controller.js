const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const service = require('../services/upiAccount.service');

const create = catchAsync(async (req, res) => {
  const account = await service.createUpiAccount(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, account, 'UPI account created'));
});

const list = catchAsync(async (req, res) => {
  const { items, meta } = await service.listUpiAccounts(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, { items, meta }));
});

const getOne = catchAsync(async (req, res) => {
  const account = await service.getUpiAccountById(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, account));
});

const update = catchAsync(async (req, res) => {
  const account = await service.updateUpiAccount(req.user._id, req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, account, 'UPI account updated'));
});

const toggleActive = catchAsync(async (req, res) => {
  const account = await service.toggleActive(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, account, 'Status updated'));
});

const remove = catchAsync(async (req, res) => {
  await service.softDeleteUpiAccount(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'UPI account deleted'));
});

module.exports = { create, list, getOne, update, toggleActive, remove };
