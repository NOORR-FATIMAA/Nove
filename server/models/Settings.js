const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // PKR per 1 USD — the storefront's base prices are always in PKR; this is
    // only used to render a converted USD display price on top of that.
    usdExchangeRate: { type: Number, required: true, default: 280, min: 1 },

    // Homepage hero background — admin-editable media.
    heroMediaType: { type: String, enum: ['video', 'image'], default: 'video' },
    heroVideo: { type: String, default: '/videos/hero-fullscreen.mp4' },
    heroImage: { type: String, default: '/img/hero-visual.svg' },

    // Homepage promo banner.
    bannerEnabled: { type: Boolean, default: false },
    bannerText: { type: String, default: '', trim: true },
    bannerLink: { type: String, default: '', trim: true },

    // About page content — editable from the admin panel instead of code.
    aboutHeroTitle: {
      type: String,
      default: 'Nove is glossy, easy, at-home nail beauty.',
      trim: true,
    },
    aboutHeroSubtitle: {
      type: String,
      default:
        'We make press-on nails, polish, and nail art supplies for people who want salon-quality results without the salon wait.',
      trim: true,
    },
    aboutValues: {
      type: [
        {
          _id: false,
          title: { type: String, required: true, trim: true },
          description: { type: String, default: '', trim: true },
        },
      ],
      default: [
        { title: 'Glossy Quality', description: 'Every polish and press-on set is tested for long wear and a true glass-like finish.' },
        { title: 'Made for Home', description: 'No salon appointment needed — our kits are designed for a flawless at-home application.' },
        { title: 'Cruelty-Free', description: 'All Nove products are cruelty-free and formulated with your nail health in mind.' },
      ],
    },
  },
  { timestamps: true }
);

settingsSchema.statics.getSingleton = async function getSingleton() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
