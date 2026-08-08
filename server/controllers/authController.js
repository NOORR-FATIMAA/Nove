const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { sendTokenResponse } = require('../utils/token');

const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return next(new AppError('An account with this email already exists.', 400));
  }

  const user = await User.create({ name, email, password, phone });

  const verifyToken = user.createEmailVerifyToken();
  await user.save({ validateBeforeSave: false });

  const verifyURL = `${process.env.CLIENT_URL}/verify-email.html?token=${verifyToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Welcome to Nove - Verify your email',
    text: `Welcome to Nove! Please verify your email by visiting: ${verifyURL}`,
  });

  sendTokenResponse(user, 201, res);
});

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +passwordChangedAt');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }

  if (user.isDeactivated) {
    return next(new AppError('This account has been deactivated.', 403));
  }

  sendTokenResponse(user, 200, res);
});

const adminLogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +passwordChangedAt');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }

  if (user.role !== 'admin') {
    return next(new AppError('You do not have permission to access the admin panel.', 403));
  }

  if (user.isDeactivated) {
    return next(new AppError('This account has been deactivated.', 403));
  }

  sendTokenResponse(user, 200, res);
});

const logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'loggedout', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.status(200).json({ success: true, data: null });
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: req.user.toSafeObject() });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const genericMessage = 'If an account with that email exists, a password reset link has been sent.';

  const user = await User.findOne({ email });
  if (user) {
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.CLIENT_URL}/reset-password.html?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Nove - Password Reset (valid for 1 hour)',
      text: `Forgot your password? Reset it here: ${resetURL}\nIf you didn't request this, please ignore this email.`,
    });
  }

  res.status(200).json({ success: true, message: genericMessage });
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired.', 400));
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

const changePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.comparePassword(req.body.currentPassword))) {
    return next(new AppError('Current password is incorrect.', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

const verifyEmail = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    emailVerifyToken: hashedToken,
    emailVerifyExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Verification link is invalid or has expired.', 400));
  }

  user.emailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: 'Email verified successfully.' });
});

const resendVerification = asyncHandler(async (req, res) => {
  const genericMessage = 'If an account with that email exists and is unverified, a verification link has been sent.';
  const user = await User.findOne({ email: req.body.email });

  if (user && !user.emailVerified) {
    const verifyToken = user.createEmailVerifyToken();
    await user.save({ validateBeforeSave: false });

    const verifyURL = `${process.env.CLIENT_URL}/verify-email.html?token=${verifyToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Nove - Verify your email',
      text: `Please verify your email by visiting: ${verifyURL}`,
    });
  }

  res.status(200).json({ success: true, message: genericMessage });
});

module.exports = {
  register,
  login,
  adminLogin,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerification,
};
