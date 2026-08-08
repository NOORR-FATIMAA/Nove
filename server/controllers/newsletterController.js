const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const NewsletterSubscriber = require('../models/NewsletterSubscriber');

const subscribe = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const existing = await NewsletterSubscriber.findOne({ email });
  if (existing) {
    return res.status(200).json({ success: true, message: "You're already subscribed!" });
  }

  await NewsletterSubscriber.create({ email });
  res.status(201).json({ success: true, message: 'Subscribed successfully!' });
});

module.exports = { subscribe };
