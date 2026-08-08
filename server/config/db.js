const mongoose = require('mongoose');

// Cached on `global` (not a module-level variable) so the connection survives
// across warm serverless invocations even if this module gets re-required —
// the standard pattern for Mongoose on Vercel, where each cold start would
// otherwise open a fresh connection pool. Harmless for a traditional
// long-running process too, since it just connects once either way.
let cached = global.__noveMongooseConn;
if (!cached) {
  cached = global.__noveMongooseConn = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI).then((conn) => {
      console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
};

module.exports = connectDB;
