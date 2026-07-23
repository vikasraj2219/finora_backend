const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const service = require('../services/report.service');

const MIME_TYPES = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

const exportTransactions = catchAsync(async (req, res) => {
  const format = ['csv', 'xlsx', 'pdf'].includes(req.query.format) ? req.query.format : 'csv';
  const { buffer, ext } = await service.exportTransactions(req.user._id, format, req.query);

  res.setHeader('Content-Type', MIME_TYPES[ext]);
  res.setHeader('Content-Disposition', `attachment; filename="transactions.${ext}"`);
  res.send(buffer);
});

const exportSummary = catchAsync(async (req, res) => {
  if (req.query.format && req.query.format !== 'pdf') {
    throw new ApiError(400, 'Only pdf is supported for the summary report');
  }
  const { buffer } = await service.exportSummary(req.user._id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="financial-summary.pdf"');
  res.send(buffer);
});

module.exports = { exportTransactions, exportSummary };
