const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { subscribe } = require('../controllers/newsletterController');

const router = express.Router();

router.post(
  '/',
  [body('email').isEmail().withMessage('A valid email is required').normalizeEmail()],
  validate,
  subscribe
);

module.exports = router;
