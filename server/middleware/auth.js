const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');

const extractToken = (req) => {
  if (req.cookies && req.cookies.token) return req.cookies.token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to continue.', 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id).select('+passwordChangedAt');
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  if (currentUser.isDeactivated) {
    return next(new AppError('This account has been deactivated.', 403));
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('Password was recently changed. Please log in again.', 401));
  }

  req.user = currentUser;
  next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id).select('+passwordChangedAt');
    if (
      currentUser &&
      !currentUser.isDeactivated &&
      !currentUser.changedPasswordAfter(decoded.iat)
    ) {
      req.user = currentUser;
    }
  } catch (err) {
    // ignore invalid token for optional auth
  }
  next();
});

const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};

module.exports = { protect, optionalAuth, restrictTo };
