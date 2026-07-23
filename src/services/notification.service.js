const Notification = require('../models/Notification.model');
const ApiError = require('../utils/ApiError');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

// Never let a notification failure break the operation that triggered it.
const createNotification = async (userId, title, message, type = 'info') => {
  try {
    await Notification.create({ user: userId, title, message, type });
  } catch (err) {
    console.error('Notification create failed:', err.message);
  }
};

const listNotifications = async (userId, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = { user: userId };
  if (query.unreadOnly === 'true') filter.isRead = false;

  const [items, totalItems, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);

  return { items, meta: buildPaginationMeta(totalItems, page, limit), unreadCount };
};

const markRead = async (userId, id) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'Notification not found');
  return notification;
};

const markAllRead = async (userId) => {
  await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
};

const removeNotification = async (userId, id) => {
  const result = await Notification.findOneAndDelete({ _id: id, user: userId });
  if (!result) throw new ApiError(404, 'Notification not found');
};

module.exports = { createNotification, listNotifications, markRead, markAllRead, removeNotification };
