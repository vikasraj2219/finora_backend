const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const User = require('../models/User.model');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');
const { seedDefaultCategories } = require('../services/category.service');
const { createCashAccountForUser } = require('../services/cash.service');

const issueTokens = async (user) => {
  const payload = { id: user._id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  currency: user.currency,
  createdAt: user.createdAt,
});

// POST /auth/register — the very first user created in the system becomes admin.
const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const isFirstUser = (await User.countDocuments()) === 0;

  const user = await User.create({
    name,
    email,
    password,
    role: isFirstUser ? 'admin' : 'member',
  });

  await Promise.all([seedDefaultCategories(user._id), createCashAccountForUser(user._id)]);

  const { accessToken, refreshToken } = await issueTokens(user);

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: sanitizeUser(user), accessToken, refreshToken },
        'Account created successfully'
      )
    );
});

// POST /auth/login
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated');
  }

  const { accessToken, refreshToken } = await issueTokens(user);

  res
    .status(200)
    .json(
      new ApiResponse(200, { user: sanitizeUser(user), accessToken, refreshToken }, 'Login successful')
    );
});

// POST /auth/refresh
const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new ApiError(400, 'refreshToken is required');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    throw new ApiError(401, 'Refresh token is no longer valid');
  }

  const { accessToken, refreshToken: newRefreshToken } = await issueTokens(user);

  res
    .status(200)
    .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, 'Token refreshed'));
});

// GET /auth/me
const me = catchAsync(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { user: sanitizeUser(req.user) }));
});

// PATCH /auth/update-password
const updatePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json(new ApiResponse(200, null, 'Password updated successfully'));
});

// POST /auth/logout
const logout = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

module.exports = { register, login, refresh, me, updatePassword, logout };
