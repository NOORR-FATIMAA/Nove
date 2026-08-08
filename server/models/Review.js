const mongoose = require('mongoose');
const Product = require('./Product');

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

reviewSchema.statics.recalculateProductRatings = async function recalculateProductRatings(productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        ratingsCount: { $sum: 1 },
        ratingsAverage: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingsCount: stats[0].ratingsCount,
      ratingsAverage: Math.round(stats[0].ratingsAverage * 10) / 10,
    });
  } else {
    await Product.findByIdAndUpdate(productId, { ratingsCount: 0, ratingsAverage: 0 });
  }
};

reviewSchema.post('save', function postSave() {
  this.constructor.recalculateProductRatings(this.product);
});

reviewSchema.post('findOneAndDelete', function postDelete(doc) {
  if (doc) {
    doc.constructor.recalculateProductRatings(doc.product);
  }
});

module.exports = mongoose.model('Review', reviewSchema);
