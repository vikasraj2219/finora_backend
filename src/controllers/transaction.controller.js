const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const service = require('../services/transaction.service');

const create = catchAsync(async (req, res) => {
  const txn = await service.createTransaction(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, txn, 'Transaction recorded'));
});

const list = catchAsync(async (req, res) => {
  const { items, meta } = await service.listTransactions(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, { items, meta }));
});

const getOne = catchAsync(async (req, res) => {
  const txn = await service.getTransactionById(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, txn));
});

const update = catchAsync(async (req, res) => {
  const txn = await service.updateTransaction(req.user._id, req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, txn, 'Transaction updated'));
});

const remove = catchAsync(async (req, res) => {
  await service.softDeleteTransaction(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Transaction deleted'));
});

module.exports = { create, list, getOne, update, remove };
