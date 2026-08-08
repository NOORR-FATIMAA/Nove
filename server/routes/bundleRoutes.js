const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const { uploadBundleImages } = require('../middleware/upload');
const {
  listBundles,
  getBundle,
  createBundle,
  updateBundle,
  deleteBundle,
} = require('../controllers/bundleController');

const router = express.Router();

router.get('/', optionalAuth, listBundles);
router.get('/:slug', optionalAuth, getBundle);

router.post(
  '/',
  protect,
  restrictTo('admin'),
  uploadBundleImages.array('images', 4),
  [
    body('name').trim().notEmpty().withMessage('Bundle name is required'),
    body('bundlePrice').isFloat({ min: 0 }).withMessage('Bundle price must be a positive number'),
    body('products').notEmpty().withMessage('At least one product is required'),
  ],
  validate,
  createBundle
);

router.patch(
  '/:id',
  protect,
  restrictTo('admin'),
  uploadBundleImages.array('images', 4),
  [param('id').isMongoId()],
  validate,
  updateBundle
);

router.delete('/:id', protect, restrictTo('admin'), [param('id').isMongoId()], validate, deleteBundle);

module.exports = router;
