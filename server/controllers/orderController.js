const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const APIFeatures = require('../utils/apiFeatures');

const SHIPPING_COST = 200; // flat rate, PKR — the store's base currency
const FREE_SHIPPING_THRESHOLD = 5000;

// Loyalty points: earn 1 point per Rs 100 spent, redeem 1 point = Rs 1 off.
const POINTS_EARN_PER_PKR = 100;
const POINTS_REDEEM_RATE = 1;

const createOrder = asyncHandler(async (req, res, next) => {
  const { items, shippingAddress, paymentMethod, couponCode, guestEmail, redeemPoints } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return next(new AppError('Your cart is empty.', 400));
  }

  if (!req.user && !guestEmail) {
    return next(new AppError('An email address is required for guest checkout.', 400));
  }

  const orderItems = [];
  let subtotal = 0;

  for (const cartItem of items) {
    const product = await Product.findById(cartItem.product || cartItem.productId);

    if (!product || !product.isActive) {
      return next(new AppError(`Product ${cartItem.product || cartItem.productId} is unavailable.`, 400));
    }

    const quantity = Number(cartItem.quantity);
    if (!quantity || quantity < 1) {
      return next(new AppError(`Invalid quantity for ${product.name}.`, 400));
    }

    if (product.stock < quantity) {
      return next(new AppError(`Insufficient stock for ${product.name}. Only ${product.stock} left.`, 400));
    }

    const unitPrice = product.currentPrice();
    subtotal += unitPrice * quantity;

    orderItems.push({
      product: product._id,
      name: product.name,
      image: (product.images && product.images[0]) || '',
      price: unitPrice,
      quantity,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;

  let discount = 0;
  let couponDoc = null;

  if (couponCode) {
    couponDoc = await Coupon.findOne({ code: String(couponCode).toUpperCase() });
    if (!couponDoc) return next(new AppError('Invalid coupon code.', 400));

    const error = couponDoc.getValidationError(subtotal);
    if (error) return next(new AppError(error, 400));

    discount = couponDoc.calculateDiscount(subtotal);
  }

  // Loyalty points can only be redeemed by logged-in users, capped at their
  // balance and at what's left of the order after the coupon discount.
  let pointsToRedeem = 0;
  if (req.user && redeemPoints) {
    const requested = Math.max(0, Math.floor(Number(redeemPoints) || 0));
    const remainingAfterCoupon = Math.max(0, subtotal - discount);
    pointsToRedeem = Math.min(requested, req.user.pointsBalance || 0, Math.floor(remainingAfterCoupon / POINTS_REDEEM_RATE));
  }
  const pointsDiscount = pointsToRedeem * POINTS_REDEEM_RATE;

  const shippingCost = subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = Math.round((subtotal - discount - pointsDiscount + shippingCost) * 100) / 100;

  // Decrement stock for each product
  for (const item of orderItems) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: -item.quantity } });
  }

  if (couponDoc) {
    couponDoc.usedCount += 1;
    await couponDoc.save();
  }

  if (pointsToRedeem > 0) {
    await User.updateOne({ _id: req.user.id }, { $inc: { pointsBalance: -pointsToRedeem } });
  }

  const order = await Order.create({
    user: req.user ? req.user.id : null,
    guestEmail: req.user ? '' : guestEmail,
    orderNumber: Order.generateOrderNumber(),
    items: orderItems,
    subtotal,
    shippingCost,
    discount,
    pointsRedeemed: pointsToRedeem,
    total,
    coupon: couponDoc ? couponDoc._id : null,
    shippingAddress,
    paymentMethod,
  });

  res.status(201).json({ success: true, data: order });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort('-createdAt');
  res.status(200).json({ success: true, count: orders.length, data: orders });
});

const getMyOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) return next(new AppError('Order not found.', 404));
  res.status(200).json({ success: true, data: order });
});

const listAllOrders = asyncHandler(async (req, res) => {
  const features = new APIFeatures(Order.find().populate('user', 'name email'), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const orders = await features.query;
  const total = await Order.countDocuments();

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    pagination: features.pagination,
    data: orders,
  });
});

const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { orderStatus, paymentStatus } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found.', 404));

  if (orderStatus) order.orderStatus = orderStatus;
  if (paymentStatus) order.paymentStatus = paymentStatus;

  // Award loyalty points exactly once, the first time an order reaches "delivered".
  if (orderStatus === 'delivered' && !order.pointsAwarded && order.user) {
    const pointsEarned = Math.floor(order.total / POINTS_EARN_PER_PKR);
    if (pointsEarned > 0) {
      await User.updateOne({ _id: order.user }, { $inc: { pointsBalance: pointsEarned } });
    }
    order.pointsEarned = pointsEarned;
    order.pointsAwarded = true;
  }

  await order.save();

  res.status(200).json({ success: true, data: order });
});

module.exports = { createOrder, getMyOrders, getMyOrder, listAllOrders, updateOrderStatus };
