const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Settings = require('../models/Settings');
const cloudinary = require('../config/cloudinary');
const { destroyByUrl } = require('../utils/cloudinaryHelpers');

const PUBLIC_FIELDS = [
  'usdExchangeRate',
  'heroMediaType',
  'heroVideo',
  'heroImage',
  'bannerEnabled',
  'bannerText',
  'bannerLink',
  'aboutHeroTitle',
  'aboutHeroSubtitle',
  'aboutValues',
];

const toPublicShape = (settings) => {
  const obj = {};
  PUBLIC_FIELDS.forEach((field) => {
    obj[field] = settings[field];
  });
  return obj;
};

// Public read: the storefront needs the exchange rate, hero media, and banner
// settings to render for every visitor, not just admins.
const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  res.status(200).json({ success: true, data: toPublicShape(settings) });
});

const BOOLEAN_FIELDS = ['bannerEnabled'];
const STRING_FIELDS = ['heroMediaType', 'bannerText', 'bannerLink', 'aboutHeroTitle', 'aboutHeroSubtitle'];

// Admin-only write. Accepts multipart form data so the hero video/image can
// be uploaded alongside the other settings fields in one request.
const updateSettings = asyncHandler(async (req, res, next) => {
  const settings = await Settings.getSingleton();

  if (req.body.usdExchangeRate !== undefined) {
    settings.usdExchangeRate = req.body.usdExchangeRate;
  }

  STRING_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) settings[field] = req.body[field];
  });

  BOOLEAN_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) settings[field] = req.body[field] === 'true' || req.body[field] === true;
  });

  if (req.body.aboutValues !== undefined) {
    try {
      const values = typeof req.body.aboutValues === 'string' ? JSON.parse(req.body.aboutValues) : req.body.aboutValues;
      if (!Array.isArray(values)) throw new Error('aboutValues must be an array');
      settings.aboutValues = values
        .filter((v) => v && v.title && v.title.trim())
        .map((v) => ({ title: v.title.trim(), description: (v.description || '').trim() }));
    } catch (err) {
      return next(new AppError('Invalid "About" values format.', 400));
    }
  }

  if (req.files) {
    if (req.files.heroVideo && req.files.heroVideo[0]) {
      if (settings.heroVideo) await destroyByUrl(cloudinary, settings.heroVideo);
      settings.heroVideo = req.files.heroVideo[0].secure_url;
    }
    if (req.files.heroImage && req.files.heroImage[0]) {
      if (settings.heroImage) await destroyByUrl(cloudinary, settings.heroImage);
      settings.heroImage = req.files.heroImage[0].secure_url;
    }
  }

  await settings.save();
  res.status(200).json({ success: true, data: toPublicShape(settings) });
});

module.exports = { getSettings, updateSettings };
