const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const {
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
} = require('../controllers/authController');

const router = express.Router();

router.use(authLimiter);

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.post(
  '/admin-login',
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  adminLogin
);

router.post('/logout', logout);
router.get('/me', protect, getMe);

router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('A valid email is required').normalizeEmail()],
  validate,
  forgotPassword
);

router.patch(
  '/reset-password/:token',
  [
    param('token').notEmpty(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  resetPassword
);

router.patch(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  validate,
  changePassword
);

router.get('/verify-email/:token', [param('token').notEmpty()], validate, verifyEmail);

router.post(
  '/resend-verification',
  [body('email').isEmail().withMessage('A valid email is required').normalizeEmail()],
  validate,
  resendVerification
);

module.exports = router;
