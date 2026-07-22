const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { listAuditLogs } = require('../services/audit.service');

const list = catchAsync(async (req, res) => {
  const { items, meta } = await listAuditLogs(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, { items, meta }));
});

module.exports = { list };
