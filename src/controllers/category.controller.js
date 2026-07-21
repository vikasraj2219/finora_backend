const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const service = require('../services/category.service');

const create = catchAsync(async (req, res) => {
  const category = await service.createCategory(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, category, 'Category created'));
});

const list = catchAsync(async (req, res) => {
  const categories = await service.listCategories(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, categories));
});

const getOne = catchAsync(async (req, res) => {
  const category = await service.getCategoryById(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, category));
});

const update = catchAsync(async (req, res) => {
  const category = await service.updateCategory(req.user._id, req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, category, 'Category updated'));
});

const remove = catchAsync(async (req, res) => {
  await service.softDeleteCategory(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Category deleted'));
});

module.exports = { create, list, getOne, update, remove };
