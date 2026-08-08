const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    caption: { type: String, default: '' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Gallery', gallerySchema);
