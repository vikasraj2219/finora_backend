const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const service = require('../services/bankAccount.service');
const { recalculateBankAccountBalance } = require('../services/balance.service');

const create = catchAsync(async (req, res) => {
  const account = await service.createBankAccount(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, account, 'Bank account created'));
});

const list = catchAsync(async (req, res) => {
  const { items, meta } = await service.listBankAccounts(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, { items, meta }));
});

const getOne = catchAsync(async (req, res) => {
  const account = await service.getBankAccountById(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, account));
});

const update = catchAsync(async (req, res) => {
  const account = await service.updateBankAccount(req.user._id, req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, account, 'Bank account updated'));
});

const adjustBalance = catchAsync(async (req, res) => {
  const { amount, note } = req.body;
  const result = await service.adjustBankAccountBalance(req.user._id, req.params.id, amount, note);
  res.status(200).json(new ApiResponse(200, result, 'Balance adjusted'));
});

const recalculate = catchAsync(async (req, res) => {
  await service.getBankAccountById(req.user._id, req.params.id); // ownership check
  const account = await recalculateBankAccountBalance(req.params.id);
  res.status(200).json(new ApiResponse(200, account, 'Balance recalculated from transactions'));
});

const toggleActive = catchAsync(async (req, res) => {
  const account = await service.toggleActive(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, account, 'Status updated'));
});

const remove = catchAsync(async (req, res) => {
  await service.softDeleteBankAccount(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Bank account deleted'));
});

module.exports = { create, list, getOne, update, adjustBalance, recalculate, toggleActive, remove };
