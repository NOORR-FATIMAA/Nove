const jwt = require('jsonwebtoken');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieExpiresDays = Number(process.env.JWT_COOKIE_EXPIRES_DAYS) || 30;

  res.cookie('token', token, {
    expires: new Date(Date.now() + cookieExpiresDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.status(statusCode).json({
    success: true,
    token,
    data: user.toSafeObject(),
  });
};

module.exports = { signToken, sendTokenResponse };
