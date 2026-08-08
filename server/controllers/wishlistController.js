const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [] });
  }
  return wishlist;
};

const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user.id);
  await wishlist.populate('products');
  res.status(200).json({ success: true, data: wishlist });
});

const addProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.body;

  const product = await Product.findById(productId);
  if (!product) return next(new AppError('Product not found.', 404));

  const wishlist = await getOrCreateWishlist(req.user.id);
  if (!wishlist.products.some((p) => p.toString() === productId)) {
    wishlist.products.push(productId);
    await wishlist.save();
  }

  await wishlist.populate('products');
  res.status(200).json({ success: true, data: wishlist });
});

const removeProduct = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user.id);
  wishlist.products = wishlist.products.filter((p) => p.toString() !== req.params.productId);
  await wishlist.save();
  await wishlist.populate('products');

  res.status(200).json({ success: true, data: wishlist });
});

module.exports = { getWishlist, addProduct, removeProduct };
