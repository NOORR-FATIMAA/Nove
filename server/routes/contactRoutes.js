const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const { submitMessage, listMessages, markAsRead, deleteMessage } = require('../controllers/contactController');

const router = express.Router();

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  validate,
  submitMessage
);

router.use(protect, restrictTo('admin'));

router.get('/', listMessages);
router.patch('/:id/read', [param('id').isMongoId()], validate, markAsRead);
router.delete('/:id', [param('id').isMongoId()], validate, deleteMessage);

module.exports = router;
