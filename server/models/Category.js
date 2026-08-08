const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Category name is required'], trim: true, unique: true },
    slug: { type: String, unique: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.pre('validate', function setSlug(next) {
  if (this.name && (this.isModified('name') || !this.slug)) {
    this.slug = slugify(this.name);
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
