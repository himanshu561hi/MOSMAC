import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    orderNumber: {
      type: String,
      required: true,
      index: true
    },
    gateway: {
      type: String,
      enum: ['razorpay', 'cod'],
      required: true
    },
    gatewayOrderId: {
      type: String,
      default: null,
      sparse: true,
      index: true
    },
    gatewayPaymentId: {
      type: String,
      default: null
    },
    amount: {
      type: Number,
      required: true,
      min: 0 // integer paise
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true
    },
    status: {
      type: String,
      enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
      default: 'created',
      index: true
    },
    method: {
      type: String,
      default: 'unknown'
    },
    vpa: {
      type: String,
      default: ''
    },
    card: {
      network: { type: String, default: '' },
      last4: { type: String, default: '' }
    },
    errorDetails: {
      code: { type: String, default: '' },
      description: { type: String, default: '' },
      reason: { type: String, default: '' }
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
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

paymentSchema.index(
  { gatewayPaymentId: 1 },
  { unique: true, partialFilterExpression: { gatewayPaymentId: { $type: 'string' } } }
);

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
export default Payment;
