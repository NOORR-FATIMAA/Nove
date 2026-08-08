const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minSubtotal: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Returns a human-readable reason the coupon can't be applied, or null if valid.
couponSchema.methods.getValidationError = function getValidationError(subtotal) {
  if (!this.isActive) return 'This coupon is no longer active';
  if (this.expiresAt && Date.now() > new Date(this.expiresAt).getTime()) return 'This coupon has expired';
  if (this.usageLimit != null && this.usedCount >= this.usageLimit) return 'This coupon has reached its usage limit';
  if (subtotal < this.minSubtotal) return `Minimum order of ${this.minSubtotal} required for this coupon`;
  return null;
};

couponSchema.methods.calculateDiscount = function calculateDiscount(subtotal) {
  if (this.type === 'percent') {
    return Math.round(((subtotal * this.value) / 100) * 100) / 100;
  }
  return Math.min(this.value, subtotal);
};

module.exports = mongoose.model('Coupon', couponSchema);
