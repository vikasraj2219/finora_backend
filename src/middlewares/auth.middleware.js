const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User.model');

// Verifies the access token and attaches the current user to req.user
const protect = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authenticated. Missing bearer token.');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired access token');
  }

  const user = await User.findById(decoded.id).select('-password -refreshToken');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User no longer exists or is inactive');
  }

  req.user = user;
  next();
});

// Restrict a route to one or more roles, e.g. authorize('admin')
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }
  next();
};

module.exports = { protect, authorize };
