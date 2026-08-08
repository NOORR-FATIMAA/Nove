const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const ContactMessage = require('../models/ContactMessage');

const LOW_STOCK_THRESHOLD = 5;

const getDashboardStats = asyncHandler(async (req, res) => {
  const [revenueAgg, orderCount, customerCount, productCount, lowStockProducts, unreadMessages, recentOrders] =
    await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments(),
      Product.find({ stock: { $lte: LOW_STOCK_THRESHOLD }, isActive: true })
        .select('name sku stock')
        .sort('stock')
        .limit(20),
      ContactMessage.countDocuments({ isRead: false }),
      Order.find().sort('-createdAt').limit(5).populate('user', 'name email'),
    ]);

  res.status(200).json({
    success: true,
    data: {
      revenue: revenueAgg[0] ? revenueAgg[0].total : 0,
      orderCount,
      customerCount,
      productCount,
      lowStockProducts,
      unreadMessages,
      recentOrders,
    },
  });
});

module.exports = { getDashboardStats };
