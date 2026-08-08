const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Offer title is required'], trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    badge: { type: String, default: '', trim: true }, // e.g. "20% OFF", "BOGO", "Limited Time"
    link: { type: String, default: '/products.html', trim: true },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Live = active flag on AND (no expiry or expiry still in the future).
offerSchema.methods.isLive = function isLive() {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date(this.expiresAt).getTime() < Date.now()) return false;
  return true;
};

module.exports = mongoose.model('Offer', offerSchema);
