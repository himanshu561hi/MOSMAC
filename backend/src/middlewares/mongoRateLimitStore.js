import mongoose from 'mongoose';

const rateLimitBucketSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true
    },
    hits: {
      type: Number,
      required: true,
      default: 1
    },
    resetTime: {
      type: Date,
      required: true
    }
  },
  { timestamps: false }
);

// MongoDB TTL Index: automatically cleans up expired rate-limit records
rateLimitBucketSchema.index({ resetTime: 1 }, { expireAfterSeconds: 0 });

export const RateLimitBucket =
  mongoose.models.RateLimitBucket || mongoose.model('RateLimitBucket', rateLimitBucketSchema);

/**
 * Distributed MongoDB Rate Limit Store for Express Rate Limit.
 * Suitable for Vercel Serverless where multiple instances share the same MongoDB database.
 */
export class MongoRateLimitStore {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000;
  }

  init(options) {
    if (options && options.windowMs) {
      this.windowMs = options.windowMs;
    }
  }

  async increment(key) {
    const now = new Date();
    const newResetTime = new Date(now.getTime() + this.windowMs);

    try {
      // 1. Attempt atomic increment on an existing active bucket
      let bucket = await RateLimitBucket.findOneAndUpdate(
        { key, resetTime: { $gt: now } },
        { $inc: { hits: 1 } },
        { new: true }
      );

      // 2. If bucket is absent or expired:
      if (!bucket) {
        // Clear expired bucket if present so it doesn't block insertion
        await RateLimitBucket.deleteOne({ key, resetTime: { $lte: now } });

        // Atomic upsert with $inc and $setOnInsert: handles high concurrency cleanly
        bucket = await RateLimitBucket.findOneAndUpdate(
          { key },
          {
            $inc: { hits: 1 },
            $setOnInsert: { resetTime: newResetTime }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      return {
        totalHits: bucket ? bucket.hits : 1,
        resetTime: bucket?.resetTime || newResetTime
      };
    } catch (err) {
      // Documented fail-open behavior: On database error, return 1 hit so user requests are not hard-blocked
      return {
        totalHits: 1,
        resetTime: newResetTime
      };
    }
  }

  async decrement(key) {
    try {
      await RateLimitBucket.updateOne({ key, hits: { $gt: 0 } }, { $inc: { hits: -1 } });
    } catch (err) {
      // Fail-silent
    }
  }

  async resetKey(key) {
    try {
      await RateLimitBucket.deleteOne({ key });
    } catch (err) {
      // Fail-silent
    }
  }

  async resetAll() {
    try {
      await RateLimitBucket.deleteMany({});
    } catch (err) {
      // Fail-silent
    }
  }
}

export default MongoRateLimitStore;
