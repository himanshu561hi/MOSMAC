import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required']
    },
    sku: {
      type: String,
      default: '',
      trim: true,
      uppercase: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    guestId: {
      type: String,
      default: null
    },
    items: {
      type: [wishlistItemSchema],
      default: []
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days TTL
      index: { expireAfterSeconds: 0 }
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

wishlistSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } }
);
wishlistSchema.index(
  { guestId: 1 },
  { unique: true, partialFilterExpression: { guestId: { $type: 'string' } } }
);

export const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);
export default Wishlist;
