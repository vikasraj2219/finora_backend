const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const service = require('../services/subcategory.service');

const create = catchAsync(async (req, res) => {
  const subcategory = await service.createSubcategory(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, subcategory, 'Subcategory created'));
});

const list = catchAsync(async (req, res) => {
  const subcategories = await service.listSubcategories(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, subcategories));
});

const getOne = catchAsync(async (req, res) => {
  const subcategory = await service.getSubcategoryById(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, subcategory));
});

const update = catchAsync(async (req, res) => {
  const subcategory = await service.updateSubcategory(req.user._id, req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, subcategory, 'Subcategory updated'));
});

const remove = catchAsync(async (req, res) => {
  await service.softDeleteSubcategory(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Subcategory deleted'));
});

module.exports = { create, list, getOne, update, remove };
