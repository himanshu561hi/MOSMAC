import mongoose from 'mongoose';

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true
    },
    sku: {
      type: String,
      required: [true, 'Variant SKU is required'],
      uppercase: true,
      trim: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Verified order reference is required'],
      index: true
    },
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      uppercase: true,
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    rating: {
      type: Number,
      required: [true, 'Rating (1-5) is required'],
      min: [1, 'Minimum rating is 1 star'],
      max: [5, 'Maximum rating is 5 stars'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5'
      }
    },
    title: {
      type: String,
      required: [true, 'Review headline is required'],
      trim: true,
      maxlength: [120, 'Headline cannot exceed 120 characters']
    },
    comment: {
      type: String,
      required: [true, 'Review feedback text is required'],
      trim: true,
      maxlength: [2000, 'Review cannot exceed 2000 characters']
    },
    images: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: REVIEW_STATUSES,
      default: 'pending',
      index: true
    },
    verifiedPurchase: {
      type: Boolean,
      default: true
    },
    moderationNote: {
      type: String,
      trim: true,
      default: ''
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    moderatedAt: {
      type: Date,
      default: null
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

// Prevent duplicate reviews for the same product by the same customer
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Optimize retrieval of approved reviews on Product Detail Page
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
export default Review;
