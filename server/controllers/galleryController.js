const path = require('path');
const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Gallery = require('../models/Gallery');

const listGallery = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.product) filter.product = req.query.product;

  const items = await Gallery.find(filter).populate('product', 'name slug').sort('-createdAt').limit(60);
  res.status(200).json({ success: true, count: items.length, data: items });
});

const createGalleryItem = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('An image is required.', 400));

  const item = await Gallery.create({
    image: `/uploads/gallery/${req.file.filename}`,
    caption: req.body.caption || '',
    product: req.body.product || null,
  });

  await item.populate('product', 'name slug');
  res.status(201).json({ success: true, data: item });
});

const deleteGalleryItem = asyncHandler(async (req, res, next) => {
  const item = await Gallery.findByIdAndDelete(req.params.id);
  if (!item) return next(new AppError('Gallery item not found.', 404));

  const imgPath = path.join(__dirname, '..', item.image);
  fs.unlink(imgPath, () => {});

  res.status(200).json({ success: true, data: null });
});

module.exports = { listGallery, createGalleryItem, deleteGalleryItem };
