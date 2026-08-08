const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

const populateCart = (cart) =>
  cart.populate({
    path: 'items.product',
    select: 'name slug images price salePrice saleStartsAt saleEndsAt stock isActive',
  });

const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  await populateCart(cart);
  res.status(200).json({ success: true, data: cart });
});

const addItem = asyncHandler(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) return next(new AppError('Product not found or unavailable.', 404));

  const cart = await getOrCreateCart(req.user.id);
  const existingItem = cart.items.find((item) => item.product.toString() === productId);

  if (existingItem) {
    existingItem.quantity += Number(quantity);
  } else {
    cart.items.push({ product: productId, quantity: Number(quantity) });
  }

  await cart.save();
  await populateCart(cart);

  res.status(200).json({ success: true, data: cart });
});

const updateItem = asyncHandler(async (req, res, next) => {
  const { quantity } = req.body;
  const cart = await getOrCreateCart(req.user.id);

  const item = cart.items.find((i) => i.product.toString() === req.params.productId);
  if (!item) return next(new AppError('Item not found in cart.', 404));

  if (quantity <= 0) {
    cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId);
  } else {
    item.quantity = Number(quantity);
  }

  await cart.save();
  await populateCart(cart);

  res.status(200).json({ success: true, data: cart });
});

const removeItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId);
  await cart.save();
  await populateCart(cart);

  res.status(200).json({ success: true, data: cart });
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  cart.items = [];
  await cart.save();

  res.status(200).json({ success: true, data: cart });
});

const mergeCart = asyncHandler(async (req, res) => {
  const { items } = req.body; // [{ productId, quantity }]
  const cart = await getOrCreateCart(req.user.id);

  if (Array.isArray(items)) {
    for (const guestItem of items) {
      if (!guestItem.productId || !guestItem.quantity) continue;
      const existingItem = cart.items.find((i) => i.product.toString() === guestItem.productId);
      if (existingItem) {
        existingItem.quantity += Number(guestItem.quantity);
      } else {
        cart.items.push({ product: guestItem.productId, quantity: Number(guestItem.quantity) });
      }
    }
    await cart.save();
  }

  await populateCart(cart);
  res.status(200).json({ success: true, data: cart });
});

module.exports = { getCart, addItem, updateItem, removeItem, clearCart, mergeCart };
