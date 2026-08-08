const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const { uploadCategoryImage } = require('../middleware/upload');
const {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const router = express.Router();

router.get('/', optionalAuth, listCategories);
router.get('/:slug', getCategory);

router.post(
  '/',
  protect,
  restrictTo('admin'),
  uploadCategoryImage.single('image'),
  [body('name').trim().notEmpty().withMessage('Category name is required')],
  validate,
  createCategory
);

router.patch(
  '/:id',
  protect,
  restrictTo('admin'),
  uploadCategoryImage.single('image'),
  [param('id').isMongoId()],
  validate,
  updateCategory
);

router.delete('/:id', protect, restrictTo('admin'), [param('id').isMongoId()], validate, deleteCategory);

module.exports = router;
