const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const { uploadProductImages } = require('../middleware/upload');
const {
  listProducts,
  getFeaturedProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  removeProductImage,
} = require('../controllers/productController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

router.use('/:productId/reviews', reviewRouter);

router.get('/', optionalAuth, listProducts);
router.get('/featured', getFeaturedProducts);
router.get('/:slug', optionalAuth, getProduct);

router.post(
  '/',
  protect,
  restrictTo('admin'),
  uploadProductImages.array('images', 6),
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('sku').trim().notEmpty().withMessage('SKU is required'),
    body('category').isMongoId().withMessage('A valid category is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  ],
  validate,
  createProduct
);

router.patch(
  '/:id',
  protect,
  restrictTo('admin'),
  uploadProductImages.array('images', 6),
  [param('id').isMongoId()],
  validate,
  updateProduct
);

router.patch(
  '/:id/remove-image',
  protect,
  restrictTo('admin'),
  [param('id').isMongoId(), body('imagePath').notEmpty()],
  validate,
  removeProductImage
);

router.delete('/:id', protect, restrictTo('admin'), [param('id').isMongoId()], validate, deleteProduct);

module.exports = router;
