const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { getCart, addItem, updateItem, removeItem, clearCart, mergeCart } = require('../controllers/cartController');

const router = express.Router();

router.use(protect);

router.get('/', getCart);

router.post(
  '/items',
  [
    body('productId').isMongoId().withMessage('A valid product ID is required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validate,
  addItem
);

router.patch(
  '/items/:productId',
  [param('productId').isMongoId(), body('quantity').isInt({ min: 0 }).withMessage('Invalid quantity')],
  validate,
  updateItem
);

router.delete('/items/:productId', [param('productId').isMongoId()], validate, removeItem);

router.delete('/', clearCart);

router.post('/merge', mergeCart);

module.exports = router;
