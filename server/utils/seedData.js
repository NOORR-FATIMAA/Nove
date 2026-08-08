const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Gallery = require('../models/Gallery');

const categoriesData = [
  {
    name: 'Polish',
    description: 'Long-lasting, glossy nail polish in every shade imaginable.',
  },
  {
    name: 'Press-Ons',
    description: 'Salon-quality press-on nails you can apply at home in minutes.',
  },
  {
    name: 'Nail Art Supplies',
    description: 'Everything you need to create stunning nail art at home.',
  },
];

const buildProducts = (categoryMap) => [
  {
    name: 'Rosewater Glaze Polish',
    sku: 'GLZ-POL-001',
    category: categoryMap.Polish,
    description: 'A glossy, blush-pink polish with a smooth glass-like finish.',
    price: 1200,
    salePrice: 950,
    stock: 40,
    isFeatured: true,
    attributes: { type: 'polish', shade: 'Blush Pink', finish: 'Glossy', swatchHex: '#e8a4bb' },
  },
  {
    name: 'Midnight Vault Polish',
    sku: 'GLZ-POL-002',
    category: categoryMap.Polish,
    description: 'A deep, sultry black-plum polish with a subtle shimmer.',
    price: 1200,
    stock: 35,
    attributes: { type: 'polish', shade: 'Black Plum', finish: 'Shimmer', swatchHex: '#3b2030' },
  },
  {
    name: 'Cloud Nine Matte Polish',
    sku: 'GLZ-POL-003',
    category: categoryMap.Polish,
    description: 'A soft, cloud-white polish with a velvety matte finish.',
    price: 1350,
    stock: 25,
    attributes: { type: 'polish', shade: 'Cloud White', finish: 'Matte', swatchHex: '#f5f1e8' },
  },
  {
    name: 'Almond Glaze Press-Ons',
    sku: 'GLZ-PRS-001',
    category: categoryMap['Press-Ons'],
    description: 'Medium-length almond-shaped press-on nails with a glossy nude finish, 24-piece set.',
    price: 2200,
    salePrice: 1800,
    stock: 30,
    isFeatured: true,
    attributes: { type: 'press-ons', shade: 'Nude Glaze', size: 'Medium Almond' },
  },
  {
    name: 'Coffin Chrome Press-Ons',
    sku: 'GLZ-PRS-002',
    category: categoryMap['Press-Ons'],
    description: 'Long coffin-shaped press-ons with a mirror chrome finish, 24-piece set.',
    price: 2600,
    stock: 20,
    attributes: { type: 'press-ons', shade: 'Silver Chrome', size: 'Long Coffin' },
  },
  {
    name: 'Square Milk Bath Press-Ons',
    sku: 'GLZ-PRS-003',
    category: categoryMap['Press-Ons'],
    description: 'Short square press-ons in a milky, semi-sheer white, 24-piece set.',
    price: 2100,
    stock: 28,
    isFeatured: true,
    attributes: { type: 'press-ons', shade: 'Milk Bath', size: 'Short Square' },
  },
  {
    name: 'Crystal Rhinestone Mix',
    sku: 'GLZ-ART-001',
    category: categoryMap['Nail Art Supplies'],
    description: 'A jar of mixed-size clear crystal rhinestones for nail art embellishment.',
    price: 650,
    stock: 60,
    attributes: { type: 'nail-art-supplies' },
  },
  {
    name: 'Fine Detail Nail Art Brush Set',
    sku: 'GLZ-ART-002',
    category: categoryMap['Nail Art Supplies'],
    description: 'A 5-piece set of fine detail brushes for precision nail art.',
    price: 950,
    stock: 45,
    attributes: { type: 'nail-art-supplies' },
  },
  {
    name: 'Gold Foil Transfer Sheets',
    sku: 'GLZ-ART-003',
    category: categoryMap['Nail Art Supplies'],
    description: 'A pack of 20 gold foil transfer sheets for a luxe accent finish.',
    price: 800,
    stock: 3,
    attributes: { type: 'nail-art-supplies' },
  },
];

const seed = async () => {
  await connectDB();

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env to seed the admin user.');
    process.exit(1);
  }

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: process.env.ADMIN_NAME || 'Nove Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      emailVerified: true,
    });
    console.log(`Admin user created: ${adminEmail}`);
  } else {
    console.log('Admin user already exists, skipping.');
  }

  const categoryMap = {};
  for (const catData of categoriesData) {
    let category = await Category.findOne({ name: catData.name });
    if (!category) {
      category = await Category.create(catData);
      console.log(`Category created: ${category.name}`);
    }
    categoryMap[catData.name] = category._id;
  }

  const products = buildProducts(categoryMap);
  for (const productData of products) {
    const existing = await Product.findOne({ sku: productData.sku });
    if (!existing) {
      await Product.create(productData);
      console.log(`Product created: ${productData.name}`);
    }
  }

  const existingGalleryItem = await Gallery.findOne({ image: '/img/moodboard-nailart.png' });
  if (!existingGalleryItem) {
    await Gallery.create({
      image: '/img/moodboard-nailart.png',
      caption: 'Day 5 of creating nail art as a 20yo 🇵🇰',
    });
    console.log('Gallery photo seeded');
  }

  console.log('Seeding complete.');
  await mongoose.connection.close();
  process.exit(0);
};

const destroy = async () => {
  await connectDB();

  await Product.deleteMany();
  await Category.deleteMany();
  await User.deleteMany({ role: 'customer' });

  console.log('Demo data destroyed (admin user preserved).');
  await mongoose.connection.close();
  process.exit(0);
};

if (process.argv.includes('--destroy')) {
  destroy();
} else {
  seed();
}
