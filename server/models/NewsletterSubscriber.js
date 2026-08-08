const mongoose = require('mongoose');

const newsletterSubscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  subscribedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);
