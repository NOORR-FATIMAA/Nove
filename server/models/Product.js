const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Product name is required'], trim: true },
    slug: { type: String, unique: true },
    sku: { type: String, required: [true, 'SKU is required'], unique: true, trim: true, uppercase: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: [true, 'Category is required'] },
    description: { type: String, default: '' },
    images: [{ type: String }],
    price: { type: Number, required: [true, 'Price is required'], min: 0 },
    salePrice: { type: Number, min: 0, default: null },
    saleStartsAt: { type: Date, default: null },
    saleEndsAt: { type: Date, default: null },
    stock: { type: Number, required: true, min: 0, default: 0 },
    attributes: {
      type: { type: String, enum: ['polish', 'press-ons', 'nail-art-supplies'], required: true },
      shade: { type: String, default: '' },
      finish: { type: String, default: '' },
      size: { type: String, default: '' },
      // Hex color for the shade swatch dot, e.g. "#d97ea0" — polish products only.
      swatchHex: { type: String, default: '' },
    },
    ratingsAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingsCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });

productSchema.pre('validate', function setSlug(next) {
  if (this.name && (this.isModified('name') || !this.slug)) {
    this.slug = `${slugify(this.name)}-${Math.random().toString(36).slice(2, 7)}`;
  }
  next();
});

productSchema.methods.hasValidSale = function hasValidSale() {
  if (this.salePrice == null) return false;
  const now = Date.now();
  if (this.saleStartsAt && now < new Date(this.saleStartsAt).getTime()) return false;
  if (this.saleEndsAt && now > new Date(this.saleEndsAt).getTime()) return false;
  return this.salePrice < this.price;
};

productSchema.methods.currentPrice = function currentPrice() {
  return this.hasValidSale() ? this.salePrice : this.price;
};

module.exports = mongoose.model('Product', productSchema);
