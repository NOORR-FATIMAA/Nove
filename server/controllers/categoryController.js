const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');
const { destroyByUrl } = require('../utils/cloudinaryHelpers');

const listCategories = asyncHandler(async (req, res) => {
  const filter = req.user && req.user.role === 'admin' ? {} : { isActive: true };
  const categories = await Category.find(filter).sort('name');
  res.status(200).json({ success: true, count: categories.length, data: categories });
});

const getCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findOne({ slug: req.params.slug });
  if (!category) return next(new AppError('Category not found.', 404));
  res.status(200).json({ success: true, data: category });
});

const createCategory = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file) {
    data.image = req.file.secure_url;
  }
  const category = await Category.create(data);
  res.status(201).json({ success: true, data: category });
});

const updateCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) return next(new AppError('Category not found.', 404));

  const data = { ...req.body };
  if (req.file) {
    data.image = req.file.secure_url;
    if (category.image) await destroyByUrl(cloudinary, category.image);
  }

  Object.assign(category, data);
  await category.save();

  res.status(200).json({ success: true, data: category });
});

const deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return next(new AppError('Category not found.', 404));

  await destroyByUrl(cloudinary, category.image);

  res.status(200).json({ success: true, data: null });
});

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
