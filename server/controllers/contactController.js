const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const ContactMessage = require('../models/ContactMessage');

const submitMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  const contactMessage = await ContactMessage.create({ name, email, subject, message });
  res.status(201).json({ success: true, data: contactMessage });
});

const listMessages = asyncHandler(async (req, res) => {
  const messages = await ContactMessage.find().sort('-createdAt');
  res.status(200).json({ success: true, count: messages.length, data: messages });
});

const markAsRead = asyncHandler(async (req, res, next) => {
  const message = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    { isRead: req.body.isRead !== undefined ? req.body.isRead : true },
    { new: true }
  );
  if (!message) return next(new AppError('Message not found.', 404));
  res.status(200).json({ success: true, data: message });
});

const deleteMessage = asyncHandler(async (req, res, next) => {
  const message = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!message) return next(new AppError('Message not found.', 404));
  res.status(200).json({ success: true, data: null });
});

module.exports = { submitMessage, listMessages, markAsRead, deleteMessage };
