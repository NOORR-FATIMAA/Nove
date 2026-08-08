const path = require('path');
const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Offer = require('../models/Offer');

const listOffers = asyncHandler(async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';

  const filter = isAdmin
    ? {}
    : { isActive: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] };

  const offers = await Offer.find(filter).sort('-createdAt');
  res.status(200).json({ success: true, count: offers.length, data: offers });
});

const createOffer = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file) {
    data.image = `/uploads/offers/${req.file.filename}`;
  }
  const offer = await Offer.create(data);
  res.status(201).json({ success: true, data: offer });
});

const updateOffer = asyncHandler(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) return next(new AppError('Offer not found.', 404));

  const data = { ...req.body };
  if (req.file) {
    data.image = `/uploads/offers/${req.file.filename}`;
    if (offer.image) {
      fs.unlink(path.join(__dirname, '..', offer.image), () => {});
    }
  }

  Object.assign(offer, data);
  await offer.save();

  res.status(200).json({ success: true, data: offer });
});

const deleteOffer = asyncHandler(async (req, res, next) => {
  const offer = await Offer.findByIdAndDelete(req.params.id);
  if (!offer) return next(new AppError('Offer not found.', 404));

  if (offer.image) {
    fs.unlink(path.join(__dirname, '..', offer.image), () => {});
  }

  res.status(200).json({ success: true, data: null });
});

module.exports = { listOffers, createOffer, updateOffer, deleteOffer };
