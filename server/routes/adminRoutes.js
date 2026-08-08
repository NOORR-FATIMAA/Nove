const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const { uploadHeroMedia } = require('../middleware/upload');
const { getDashboardStats } = require('../controllers/adminController');
const { updateSettings } = require('../controllers/settingsController');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/dashboard', getDashboardStats);

router.patch(
  '/settings',
  uploadHeroMedia,
  [
    body('usdExchangeRate').optional().isFloat({ min: 1 }).withMessage('Exchange rate must be a positive number'),
    body('heroMediaType').optional().isIn(['video', 'image']).withMessage('Invalid hero media type'),
    body('bannerEnabled').optional().isIn(['true', 'false']).withMessage('Invalid banner toggle'),
    body('bannerText').optional().isLength({ max: 200 }).withMessage('Banner text is too long'),
  ],
  validate,
  updateSettings
);

module.exports = router;
