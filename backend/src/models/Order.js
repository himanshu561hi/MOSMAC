import mongoose from 'mongoose';

export const ORDER_STATUSES = [
  'pending',
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned'
];

export const PAYMENT_STATUSES = [
  'pending',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'partially_refunded'
];

export const PAYMENT_METHODS = ['razorpay', 'cod'];

const orderItemSnapshotSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    variantTitle: {
      type: String,
      default: ''
    },
    imageUrl: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0 // in integer paise
    },
    mrp: {
      type: Number,
      required: true,
      min: 0 // in integer paise
    },
    itemTotal: {
      type: Number,
      required: true,
      min: 0 // unitPrice * quantity in integer paise
    },
    weight: {
      type: Number,
      default: 0 // package weight in grams
    },
    hsnCode: {
      type: String,
      default: '3304' // Indian GST HSN for Cosmetics / Personal Care
    }
  },
  { _id: true }
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, required: true },
    landmark: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    addressType: { type: String, default: 'home' }
  },
  { _id: false }
);

const customerSnapshotSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, default: '' },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  },
  { _id: false }
);

const orderPricingSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, required: true, default: 0, min: 0 },
    shippingFee: { type: Number, required: true, default: 0, min: 0 },
    taxTotal: { type: Number, required: true, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const appliedCouponSnapshotSchema = new mongoose.Schema(
  {
    code: { type: String, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'fixed'] },
    discountValue: { type: Number },
    discountAmount: { type: Number, min: 0 }
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: '' },
    changedBy: { type: String, default: 'system' }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      sparse: true
    },
    guestId: {
      type: String,
      default: null,
      sparse: true
    },
    customer: {
      type: customerSnapshotSchema,
      required: true
    },
    shippingAddress: {
      type: addressSnapshotSchema,
      required: true
    },
    billingAddress: {
      type: addressSnapshotSchema,
      required: true
    },
    items: {
      type: [orderItemSnapshotSchema],
      required: true,
      validate: [(val) => val.length > 0, 'Order must contain at least one item']
    },
    pricing: {
      type: orderPricingSchema,
      required: true
    },
    appliedCoupon: {
      type: appliedCouponSnapshotSchema,
      default: null
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'pending',
      index: true
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'placed',
      index: true
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: () => [{ status: 'placed', timestamp: new Date(), note: 'Order created', changedBy: 'system' }]
    },
    paymentDetails: {
      razorpayOrderId: { type: String, default: null, index: true },
      razorpayPaymentId: { type: String, default: null, index: true },
      razorpaySignature: { type: String, default: null }
    },
    trackingDetails: {
      courierName: { type: String, default: '' },
      trackingNumber: { type: String, default: '' },
      trackingUrl: { type: String, default: '' },
      shippedAt: { type: Date, default: null }
    },
    cancellation: {
      reason: { type: String, default: '' },
      cancelledAt: { type: Date, default: null },
      cancelledBy: { type: String, default: '' }
    },
    refunds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Refund'
      }
    ],
    totalRefundedAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    idempotencyKey: {
      type: String,
      default: null,
      sparse: true,
      index: true
    },
    reservationId: {
      type: String,
      default: null,
      sparse: true
    },
    expiresAt: {
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

// Compound queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ guestId: 1, createdAt: -1 });
orderSchema.index({ 'customer.email': 1, 'customer.phone': 1 });

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;
