const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Coupon = require('../models/Coupon');

const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt');
  res.status(200).json({ success: true, count: coupons.length, data: coupons });
});

const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, data: coupon });
});

const updateCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!coupon) return next(new AppError('Coupon not found.', 404));
  res.status(200).json({ success: true, data: coupon });
});

const deleteCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return next(new AppError('Coupon not found.', 404));
  res.status(200).json({ success: true, data: null });
});

const validateCode = asyncHandler(async (req, res, next) => {
  const { code, subtotal } = req.body;

  const coupon = await Coupon.findOne({ code: String(code).toUpperCase() });
  if (!coupon) return next(new AppError('Invalid coupon code.', 404));

  const error = coupon.getValidationError(Number(subtotal) || 0);
  if (error) return next(new AppError(error, 400));

  const discount = coupon.calculateDiscount(Number(subtotal) || 0);

  res.status(200).json({
    success: true,
    data: { code: coupon.code, type: coupon.type, value: coupon.value, discount },
  });
});

module.exports = { listCoupons, createCoupon, updateCoupon, deleteCoupon, validateCode };
