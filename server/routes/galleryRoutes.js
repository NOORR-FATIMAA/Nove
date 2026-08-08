const express = require('express');
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const { uploadGalleryImage } = require('../middleware/upload');
const { listGallery, createGalleryItem, deleteGalleryItem } = require('../controllers/galleryController');

const router = express.Router();

router.get('/', listGallery);

router.post('/', protect, restrictTo('admin'), uploadGalleryImage.single('image'), createGalleryItem);

router.delete('/:id', protect, restrictTo('admin'), [param('id').isMongoId()], validate, deleteGalleryItem);

module.exports = router;
