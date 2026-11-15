import mongoose from 'mongoose';

const couponRedemptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    usedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: [true, 'Discount type is required']
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [1, 'Discount value must be greater than zero']
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: [0, 'Maximum discount amount cannot be negative']
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order amount cannot be negative']
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: [true, 'Coupon expiration date is required']
    },
    usageLimitPerUser: {
      type: Number,
      default: 1,
      min: [1, 'Per-user usage limit must be at least 1']
    },
    totalUsageLimit: {
      type: Number,
      default: null,
      min: [1, 'Total usage limit must be at least 1']
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0
    },
    usedBy: {
      type: [couponRedemptionSchema],
      default: []
    },
    applicableCategories: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
      default: []
    },
    applicableProducts: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
      default: []
    },
    firstOrderOnly: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
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

couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ endDate: 1, isActive: 1 });

export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
export default Coupon;
