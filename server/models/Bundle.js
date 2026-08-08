const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const bundleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const bundleSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Bundle name is required'], trim: true },
    slug: { type: String, unique: true },
    description: { type: String, default: '' },
    images: [{ type: String }],
    products: {
      type: [bundleItemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'A bundle needs at least one product',
      },
    },
    bundlePrice: { type: Number, required: [true, 'Bundle price is required'], min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

bundleSchema.pre('validate', function setSlug(next) {
  if (this.name && (this.isModified('name') || !this.slug)) {
    this.slug = `${slugify(this.name)}-${Math.random().toString(36).slice(2, 7)}`;
  }
  next();
});

module.exports = mongoose.model('Bundle', bundleSchema);
