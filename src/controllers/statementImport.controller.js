const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const service = require('../services/statementImport.service');

const preview = catchAsync(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'A statement file is required');
  const { bankAccount } = req.body;
  if (!bankAccount) throw new ApiError(400, 'bankAccount is required');

  const result = await service.previewImport(req.user._id, bankAccount, req.file.path, req.file.mimetype);
  res.status(200).json(new ApiResponse(200, result, 'Statement parsed — review before confirming'));
});

const confirm = catchAsync(async (req, res) => {
  const { bankAccount, importBatchId, rows } = req.body;
  if (!bankAccount) throw new ApiError(400, 'bankAccount is required');

  const result = await service.confirmImport(req.user._id, bankAccount, importBatchId, rows);
  res.status(201).json(new ApiResponse(201, result, 'Import completed'));
});

module.exports = { preview, confirm };
