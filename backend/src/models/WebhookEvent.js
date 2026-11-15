import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: ['received', 'processing', 'processed', 'failed'],
      default: 'received',
      index: true
    },
    attempts: {
      type: Number,
      default: 1
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    error: {
      type: String,
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

export const WebhookEvent =
  mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema);
export default WebhookEvent;
