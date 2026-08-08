// Only the secure_url is stored on our documents (Product.images, Category.image,
// etc.), so cleanup has to derive the Cloudinary public_id back out of it.
// URL shape: https://res.cloudinary.com/<cloud>/<resource_type>/upload/v<ver>/<public_id>.<ext>
function publicIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^./]+$/);
  return match ? match[1] : null;
}

function resourceTypeFromUrl(url) {
  return url && url.includes('/video/upload/') ? 'video' : 'image';
}

// Best-effort cleanup — only touches assets actually hosted on Cloudinary, so
// bundled defaults (e.g. /img/placeholder.svg, /videos/hero-fullscreen.mp4)
// are silently skipped, and a delete failure never blocks the request that
// triggered it (the DB record is already the source of truth either way).
async function destroyByUrl(cloudinary, url) {
  if (!url || !url.includes('res.cloudinary.com')) return;
  const publicId = publicIdFromUrl(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceTypeFromUrl(url) });
  } catch (err) {
    // ignore — stray Cloudinary assets aren't worth failing the request over
  }
}

module.exports = { publicIdFromUrl, resourceTypeFromUrl, destroyByUrl };
