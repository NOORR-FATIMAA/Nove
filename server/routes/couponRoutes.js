const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCode,
} = require('../controllers/couponController');

const router = express.Router();

router.post(
  '/validate-code',
  [body('code').trim().notEmpty().withMessage('Coupon code is required')],
  validate,
  validateCode
);

router.use(protect, restrictTo('admin'));

router.get('/', listCoupons);

router.post(
  '/',
  [
    body('code').trim().notEmpty().withMessage('Coupon code is required'),
    body('type').isIn(['percent', 'fixed']).withMessage('Type must be percent or fixed'),
    body('value').isFloat({ min: 0 }).withMessage('Value must be a positive number'),
  ],
  validate,
  createCoupon
);

router.patch('/:id', [param('id').isMongoId()], validate, updateCoupon);
router.delete('/:id', [param('id').isMongoId()], validate, deleteCoupon);

module.exports = router;
