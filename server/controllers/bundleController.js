const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Bundle = require('../models/Bundle');
const cloudinary = require('../config/cloudinary');
const { destroyByUrl } = require('../utils/cloudinaryHelpers');

const PRODUCT_FIELDS = 'name slug images price salePrice saleStartsAt saleEndsAt stock isActive attributes';

const withSavings = (bundle) => {
  const obj = bundle.toObject ? bundle.toObject() : bundle;
  const separateTotal = obj.products.reduce((sum, item) => {
    const product = item.product;
    if (!product || typeof product.price !== 'number') return sum;
    const hasSale =
      product.salePrice != null &&
      product.salePrice < product.price &&
      (!product.saleStartsAt || new Date(product.saleStartsAt) <= new Date()) &&
      (!product.saleEndsAt || new Date(product.saleEndsAt) >= new Date());
    const unitPrice = hasSale ? product.salePrice : product.price;
    return sum + unitPrice * item.quantity;
  }, 0);

  return {
    ...obj,
    separateTotal: Math.round(separateTotal * 100) / 100,
    savings: Math.max(0, Math.round((separateTotal - obj.bundlePrice) * 100) / 100),
  };
};

const listBundles = asyncHandler(async (req, res) => {
  const filter = req.user && req.user.role === 'admin' ? {} : { isActive: true };
  const bundles = await Bundle.find(filter).populate('products.product', PRODUCT_FIELDS).sort('-createdAt');
  res.status(200).json({ success: true, count: bundles.length, data: bundles.map(withSavings) });
});

const getBundle = asyncHandler(async (req, res, next) => {
  const filter = req.user && req.user.role === 'admin' ? {} : { isActive: true };
  const bundle = await Bundle.findOne({ slug: req.params.slug, ...filter }).populate('products.product', PRODUCT_FIELDS);
  if (!bundle) return next(new AppError('Bundle not found.', 404));
  res.status(200).json({ success: true, data: withSavings(bundle) });
});

const createBundle = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (typeof data.products === 'string') data.products = JSON.parse(data.products);
  if (req.files && req.files.length > 0) {
    data.images = req.files.map((f) => f.secure_url);
  }

  const bundle = await Bundle.create(data);
  await bundle.populate('products.product', PRODUCT_FIELDS);
  res.status(201).json({ success: true, data: withSavings(bundle) });
});

const updateBundle = asyncHandler(async (req, res, next) => {
  const bundle = await Bundle.findById(req.params.id);
  if (!bundle) return next(new AppError('Bundle not found.', 404));

  const data = { ...req.body };
  if (typeof data.products === 'string') data.products = JSON.parse(data.products);

  if (req.files && req.files.length > 0) {
    const newImages = req.files.map((f) => f.secure_url);
    data.images = [...(bundle.images || []), ...newImages];
  }

  Object.assign(bundle, data);
  await bundle.save();
  await bundle.populate('products.product', PRODUCT_FIELDS);

  res.status(200).json({ success: true, data: withSavings(bundle) });
});

const deleteBundle = asyncHandler(async (req, res, next) => {
  const bundle = await Bundle.findByIdAndDelete(req.params.id);
  if (!bundle) return next(new AppError('Bundle not found.', 404));

  await Promise.all((bundle.images || []).map((img) => destroyByUrl(cloudinary, img)));

  res.status(200).json({ success: true, data: null });
});

module.exports = { listBundles, getBundle, createBundle, updateBundle, deleteBundle };
