const path = require('path');
const multer = require('multer');
const AppError = require('../utils/AppError');

const storageFor = (subfolder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '..', 'uploads', subfolder));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
    },
  });

const imageFileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext) || !file.mimetype.startsWith('image/')) {
    return cb(new AppError('Only image files are allowed.', 400));
  }
  cb(null, true);
};

const makeUploader = (subfolder) =>
  multer({
    storage: storageFor(subfolder),
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  });

const uploadProductImages = makeUploader('products');
const uploadCategoryImage = makeUploader('categories');
const uploadBundleImages = makeUploader('bundles');
const uploadGalleryImage = makeUploader('gallery');
const uploadOfferImage = makeUploader('offers');

// The hero background accepts either an admin-uploaded video or image (or
// both, with heroMediaType deciding which one the storefront shows), so this
// filter has to allow video files for the heroVideo field specifically while
// still restricting heroImage — and any other field — to images.
const heroMediaFileFilter = (req, file, cb) => {
  if (file.fieldname === 'heroVideo') {
    const allowedVideoExt = ['.mp4', '.webm', '.mov'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedVideoExt.includes(ext) || !file.mimetype.startsWith('video/')) {
      return cb(new AppError('Only video files (mp4, webm, mov) are allowed for the hero video.', 400));
    }
    return cb(null, true);
  }
  return imageFileFilter(req, file, cb);
};

const uploadHeroMedia = multer({
  storage: storageFor('hero'),
  fileFilter: heroMediaFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
}).fields([
  { name: 'heroVideo', maxCount: 1 },
  { name: 'heroImage', maxCount: 1 },
]);

module.exports = {
  uploadProductImages,
  uploadCategoryImage,
  uploadBundleImages,
  uploadGalleryImage,
  uploadOfferImage,
  uploadHeroMedia,
};
