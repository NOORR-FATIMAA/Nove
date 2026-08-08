const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { getWishlist, addProduct, removeProduct } = require('../controllers/wishlistController');

const router = express.Router();

router.use(protect);

router.get('/', getWishlist);
router.post('/', [body('productId').isMongoId().withMessage('A valid product ID is required')], validate, addProduct);
router.delete('/:productId', [param('productId').isMongoId()], validate, removeProduct);

module.exports = router;
