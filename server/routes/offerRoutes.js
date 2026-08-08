const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const { uploadOfferImage } = require('../middleware/upload');
const { listOffers, createOffer, updateOffer, deleteOffer } = require('../controllers/offerController');

const router = express.Router();

router.get('/', optionalAuth, listOffers);

router.post(
  '/',
  protect,
  restrictTo('admin'),
  uploadOfferImage.single('image'),
  [body('title').trim().notEmpty().withMessage('Offer title is required')],
  validate,
  createOffer
);

router.patch(
  '/:id',
  protect,
  restrictTo('admin'),
  uploadOfferImage.single('image'),
  [param('id').isMongoId()],
  validate,
  updateOffer
);

router.delete('/:id', protect, restrictTo('admin'), [param('id').isMongoId()], validate, deleteOffer);

module.exports = router;
