const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const service = require('../services/type.service');

const create = catchAsync(async (req, res) => {
  const type = await service.createType(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, type, 'Type created'));
});

const list = catchAsync(async (req, res) => {
  const types = await service.listTypes(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, types));
});

const getOne = catchAsync(async (req, res) => {
  const type = await service.getTypeById(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, type));
});

const update = catchAsync(async (req, res) => {
  const type = await service.updateType(req.user._id, req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, type, 'Type updated'));
});

const remove = catchAsync(async (req, res) => {
  await service.softDeleteType(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Type deleted'));
});

module.exports = { create, list, getOne, update, remove };
