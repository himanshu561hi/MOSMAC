import mongoose from 'mongoose';
import env from './env.js';

/**
 * Global is used here to maintain a cached connection across hot-reloads
 * in development and warm serverless function invocations on Vercel.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable Mongoose buffering so commands fail fast if DB is disconnected
      maxPoolSize: 10,       // Safe connection pool for serverless instances
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    cached.promise = mongoose.connect(env.MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('✅ MongoDB connected successfully to database:', mongooseInstance.connection.name);
      return mongooseInstance;
    }).catch((err) => {
      cached.promise = null;
      console.error('❌ MongoDB initial connection error:', err.message);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export async function disconnectDB() {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('🔌 MongoDB connection disconnected gracefully');
  }
}

export default connectDB;

