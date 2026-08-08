const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Product = require('../models/Product');
const Review = require('../models/Review');
const APIFeatures = require('../utils/apiFeatures');
const cloudinary = require('../config/cloudinary');
const { destroyByUrl } = require('../utils/cloudinaryHelpers');

const buildPublicFilter = (req) => {
  const filter = {};
  if (!req.user || req.user.role !== 'admin') {
    filter.isActive = true;
  }
  return filter;
};

const buildProductFilter = (req) => {
  const filter = buildPublicFilter(req);

  if (req.query.type) filter['attributes.type'] = req.query.type;
  if (req.query.category) filter.category = req.query.category;

  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
  }

  if (req.query.inStock === 'true') filter.stock = { $gt: 0 };

  if (req.query.ids) {
    const idList = req.query.ids
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^[a-f0-9]{24}$/i.test(s));
    filter._id = { $in: idList };
  }

  const term = req.query.search || req.query.keyword;
  if (term) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { description: regex }];
  }

  return filter;
};

const listProducts = asyncHandler(async (req, res) => {
  const filter = buildProductFilter(req);

  const features = new APIFeatures(Product.find(filter).populate('category', 'name slug'), req.query)
    .sort()
    .limitFields()
    .paginate();

  const [products, total] = await Promise.all([features.query, Product.countDocuments(filter)]);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    pagination: features.pagination,
    data: products,
  });
});

const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true, isFeatured: true })
    .populate('category', 'name slug')
    .limit(8);
  res.status(200).json({ success: true, count: products.length, data: products });
});

const getProduct = asyncHandler(async (req, res, next) => {
  const filter = buildPublicFilter(req);
  const product = await Product.findOne({ slug: req.params.slug, ...filter }).populate('category', 'name slug');

  if (!product) return next(new AppError('Product not found.', 404));

  const reviews = await Review.find({ product: product._id }).populate('user', 'name').sort('-createdAt');

  res.status(200).json({ success: true, data: { product, reviews } });
});

const createProduct = asyncHandler(async (req, res) => {
  const data = { ...req.body };

  if (typeof data.attributes === 'string') {
    data.attributes = JSON.parse(data.attributes);
  }

  if (req.files && req.files.length > 0) {
    data.images = req.files.map((f) => f.secure_url);
  }

  const product = await Product.create(data);
  res.status(201).json({ success: true, data: product });
});

const updateProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('Product not found.', 404));

  const data = { ...req.body };
  if (typeof data.attributes === 'string') {
    data.attributes = JSON.parse(data.attributes);
  }

  if (req.files && req.files.length > 0) {
    const newImages = req.files.map((f) => f.secure_url);
    data.images = [...(product.images || []), ...newImages];
  }

  Object.assign(product, data);
  await product.save();

  res.status(200).json({ success: true, data: product });
});

const deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return next(new AppError('Product not found.', 404));

  await Promise.all((product.images || []).map((img) => destroyByUrl(cloudinary, img)));

  res.status(200).json({ success: true, data: null });
});

const removeProductImage = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('Product not found.', 404));

  const { imagePath } = req.body;
  product.images = product.images.filter((img) => img !== imagePath);
  await product.save();

  await destroyByUrl(cloudinary, imagePath);

  res.status(200).json({ success: true, data: product });
});

module.exports = {
  listProducts,
  getFeaturedProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  removeProductImage,
};
