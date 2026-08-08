const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const { apiLimiter } = require('./middleware/rateLimiters');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const couponRoutes = require('./routes/couponRoutes');
const orderRoutes = require('./routes/orderRoutes');
const contactRoutes = require('./routes/contactRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const adminRoutes = require('./routes/adminRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const bundleRoutes = require('./routes/bundleRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const offerRoutes = require('./routes/offerRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();

app.set('trust proxy', 1);

// --- Security middleware ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const isLocalhostOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const allowedProductionOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin / non-browser requests (no Origin header) are always allowed.
      if (!origin) return callback(null, true);

      if (process.env.NODE_ENV !== 'production' && isLocalhostOrigin(origin)) {
        return callback(null, true);
      }

      if (allowedProductionOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());

app.use('/api', apiLimiter);

// Ensures the DB is connected before any API route runs — a no-op after the
// first request on a warm serverless instance (see config/db.js caching),
// and the only thing that connects at all when this file is `require`d by
// Vercel's api/index.js instead of run directly via `node server/server.js`.
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// --- Static files ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Nove API is running' });
});

app.use('/api', notFound);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Only bind a port when this file is run directly (`node server/server.js` /
// `npm run dev`). Vercel's api/index.js instead `require`s this module and
// invokes the exported `app` per-request — calling app.listen() there would
// be pointless (nothing owns that port in a serverless function) and the
// per-request connectDB() middleware above already covers the DB connection
// that `start()` used to make once at boot.
if (require.main === module) {
  const start = async () => {
    try {
      await connectDB();
      app.listen(PORT, () => {
        console.log(`Nove server running in ${process.env.NODE_ENV || 'development'} mode`);
        console.log(`Storefront: http://localhost:${PORT}/index.html`);
        console.log(`Admin:      http://localhost:${PORT}/admin/login.html`);
      });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  };

  start();
}

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

module.exports = app;
