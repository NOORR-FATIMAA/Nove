const multer = require('multer');
const cloudinaryStorage = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');

// Vercel's serverless filesystem is ephemeral/read-only, so files go straight
// to Cloudinary via a streaming multipart parser instead of local disk.
const uniquePublicId = () => `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

const storageFor = (subfolder) =>
  cloudinaryStorage({
    cloudinary,
    params: (req, file, cb) => {
      cb(null, { folder: `nove/${subfolder}`, resource_type: 'image', public_id: uniquePublicId() });
    },
  });

const imageFileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
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
// still restricting heroImage — and any other field — to images. Cloudinary
// also needs resource_type: 'video' for the video upload to succeed.
const heroMediaFileFilter = (req, file, cb) => {
  if (file.fieldname === 'heroVideo') {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new AppError('Only video files (mp4, webm, mov) are allowed for the hero video.', 400));
    }
    return cb(null, true);
  }
  return imageFileFilter(req, file, cb);
};

const heroStorage = cloudinaryStorage({
  cloudinary,
  params: (req, file, cb) => {
    cb(null, {
      folder: 'nove/hero',
      resource_type: file.fieldname === 'heroVideo' ? 'video' : 'image',
      public_id: uniquePublicId(),
    });
  },
});

const uploadHeroMedia = multer({
  storage: heroStorage,
  fileFilter: heroMediaFileFilter,
  // Note: Vercel serverless functions cap request bodies well below this
  // (~4.5MB on Hobby/Pro) — large hero videos will need a direct-to-Cloudinary
  // client upload if that limit is ever hit. Fine as-is for local/VPS hosting.
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
