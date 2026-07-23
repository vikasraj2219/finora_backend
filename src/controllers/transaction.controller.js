const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
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

const uploadReceipt = catchAsync(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'A receipt file is required');
  const fileUrl = `/uploads/${req.file.filename}`;
  const txn = await service.uploadReceipt(req.user._id, req.params.id, fileUrl);
  res.status(200).json(new ApiResponse(200, txn, 'Receipt attached'));
});

const removeReceipt = catchAsync(async (req, res) => {
  const txn = await service.removeReceipt(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, txn, 'Receipt removed'));
});

module.exports = { create, list, getOne, update, remove, uploadReceipt, removeReceipt };
