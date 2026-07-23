const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const service = require('../services/notification.service');

const list = catchAsync(async (req, res) => {
  const { items, meta, unreadCount } = await service.listNotifications(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, { items, meta, unreadCount }));
});

const markRead = catchAsync(async (req, res) => {
  const notification = await service.markRead(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, notification, 'Marked as read'));
});

const markAllRead = catchAsync(async (req, res) => {
  await service.markAllRead(req.user._id);
  res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
});

const remove = catchAsync(async (req, res) => {
  await service.removeNotification(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Notification deleted'));
});

module.exports = { list, markRead, markAllRead, remove };
