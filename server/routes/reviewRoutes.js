const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { listReviews, listFeaturedReviews, createReview, updateReview, deleteReview } = require('../controllers/reviewController');

const router = express.Router({ mergeParams: true });

// Mounted both nested under /products/:productId/reviews and at the
// top-level /api/reviews (see server.js) — this route doesn't use
// :productId, so it works identically either way.
router.get('/featured', listFeaturedReviews);

router.get('/', [param('productId').isMongoId()], validate, listReviews);

router.post(
  '/',
  protect,
  [
    param('productId').isMongoId(),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').trim().notEmpty().withMessage('Comment is required'),
  ],
  validate,
  createReview
);

router.patch(
  '/:id',
  protect,
  [
    param('productId').isMongoId(),
    param('id').isMongoId(),
    body('rating').optional().isInt({ min: 1, max: 5 }),
  ],
  validate,
  updateReview
);

router.delete(
  '/:id',
  protect,
  [param('productId').isMongoId(), param('id').isMongoId()],
  validate,
  deleteReview
);

module.exports = router;
