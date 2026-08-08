const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Review = require('../models/Review');
const Product = require('../models/Product');

const listReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId })
    .populate('user', 'name')
    .sort('-createdAt');
  res.status(200).json({ success: true, count: reviews.length, data: reviews });
});

// Top-rated reviews across all products, for the homepage testimonials strip.
const listFeaturedReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ rating: { $gte: 4 } })
    .populate('user', 'name')
    .populate('product', 'name slug')
    .sort('-rating -createdAt')
    .limit(8);
  res.status(200).json({ success: true, count: reviews.length, data: reviews });
});

const createReview = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.productId);
  if (!product) return next(new AppError('Product not found.', 404));

  const existing = await Review.findOne({ product: req.params.productId, user: req.user.id });
  if (existing) {
    return next(new AppError('You have already reviewed this product.', 400));
  }

  const review = await Review.create({
    product: req.params.productId,
    user: req.user.id,
    rating: req.body.rating,
    comment: req.body.comment,
  });

  await review.populate('user', 'name');

  res.status(201).json({ success: true, data: review });
});

const updateReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findOne({ _id: req.params.id, product: req.params.productId });
  if (!review) return next(new AppError('Review not found.', 404));

  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You can only edit your own review.', 403));
  }

  if (req.body.rating !== undefined) review.rating = req.body.rating;
  if (req.body.comment !== undefined) review.comment = req.body.comment;
  await review.save();

  res.status(200).json({ success: true, data: review });
});

const deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findOne({ _id: req.params.id, product: req.params.productId });
  if (!review) return next(new AppError('Review not found.', 404));

  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You can only delete your own review.', 403));
  }

  await Review.findOneAndDelete({ _id: review._id });

  res.status(200).json({ success: true, data: null });
});

module.exports = { listReviews, listFeaturedReviews, createReview, updateReview, deleteReview };
