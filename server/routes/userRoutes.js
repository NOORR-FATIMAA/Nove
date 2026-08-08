const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const {
  listUsers,
  updateUser,
  updateProfile,
  updateThemePreference,
  addAddress,
  updateAddress,
  deleteAddress,
} = require('../controllers/userController');

const router = express.Router();

router.use(protect);

router.patch('/me', [body('name').optional().trim().notEmpty()], validate, updateProfile);

router.patch(
  '/me/theme',
  [body('themePreference').isIn(['light', 'dark']).withMessage('Invalid theme')],
  validate,
  updateThemePreference
);

router.post(
  '/me/addresses',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('line1').trim().notEmpty().withMessage('Address line 1 is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('postalCode').trim().notEmpty().withMessage('Postal code is required'),
    body('country').trim().notEmpty().withMessage('Country is required'),
  ],
  validate,
  addAddress
);

router.patch('/me/addresses/:addressId', [param('addressId').isMongoId()], validate, updateAddress);
router.delete('/me/addresses/:addressId', [param('addressId').isMongoId()], validate, deleteAddress);

router.get('/', restrictTo('admin'), listUsers);
router.patch('/:id', restrictTo('admin'), [param('id').isMongoId()], validate, updateUser);

module.exports = router;
