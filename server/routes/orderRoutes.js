const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const {
  createOrder,
  getMyOrders,
  getMyOrder,
  listAllOrders,
  updateOrderStatus,
} = require('../controllers/orderController');

const router = express.Router();

router.post(
  '/',
  optionalAuth,
  [
    body('items').isArray({ min: 1 }).withMessage('Cart items are required'),
    body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name is required'),
    body('shippingAddress.phone').trim().notEmpty().withMessage('Phone is required'),
    body('shippingAddress.line1').trim().notEmpty().withMessage('Address line 1 is required'),
    body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
    body('shippingAddress.postalCode').trim().notEmpty().withMessage('Postal code is required'),
    body('shippingAddress.country').trim().notEmpty().withMessage('Country is required'),
    body('paymentMethod').isIn(['cod', 'card']).withMessage('Invalid payment method'),
    body('redeemPoints').optional().isInt({ min: 0 }).withMessage('Invalid points amount'),
  ],
  validate,
  createOrder
);

router.get('/mine', protect, getMyOrders);
router.get('/mine/:id', protect, [param('id').isMongoId()], validate, getMyOrder);

router.get('/', protect, restrictTo('admin'), listAllOrders);
router.patch('/:id/status', protect, restrictTo('admin'), [param('id').isMongoId()], validate, updateOrderStatus);

module.exports = router;
