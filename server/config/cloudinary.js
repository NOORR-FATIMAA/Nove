// Must require the top-level 'cloudinary' package (not '.v2') — the
// installed multer-storage-cloudinary version reaches into `opts.cloudinary.v2`
// internally, so this module has to expose that '.v2' namespace. Config set
// here is shared state across both the top-level and '.v2' references.
const cloudinary = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = cloudinary;
