import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required']
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      max: [10, 'Cannot exceed 10 units per item']
    },
    addedPrice: {
      type: Number,
      required: [true, 'Added price in paise is required'],
      min: [0, 'Added price cannot be negative']
    }
  },
  { _id: true, timestamps: true }
);

const appliedCouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true
    },
    discountValue: {
      type: Number,
      required: true
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
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
      type: [cartItemSchema],
      default: []
    },
    appliedCoupon: {
      type: appliedCouponSchema,
      default: null
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days TTL
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

// Compound uniqueness: 1 active cart per user OR 1 active cart per guestId
cartSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } }
);
cartSchema.index(
  { guestId: 1 },
  { unique: true, partialFilterExpression: { guestId: { $type: 'string' } } }
);

export const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
export default Cart;
