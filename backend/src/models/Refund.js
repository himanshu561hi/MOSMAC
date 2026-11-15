import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema(
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
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
      sparse: true,
      index: true
    },
    gatewayRefundId: {
      type: String,
      default: null,
      sparse: true,
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Refund amount in paise is required'],
      min: [1, 'Refund amount must be at least 1 paisa']
    },
    reason: {
      type: String,
      required: [true, 'Refund reason is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
      index: true
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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

export const Refund = mongoose.models.Refund || mongoose.model('Refund', refundSchema);
export default Refund;
