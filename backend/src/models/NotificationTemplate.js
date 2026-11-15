import mongoose from 'mongoose';

export const TEMPLATE_TYPES = [
  'welcome_email',
  'email_verification',
  'password_reset',
  'order_confirmation',
  'payment_confirmation',
  'payment_failure',
  'order_shipped',
  'order_delivered',
  'order_cancelled',
  'refund_processed'
];

const notificationTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true
    },
    type: {
      type: String,
      enum: TEMPLATE_TYPES,
      required: [true, 'Template type is required'],
      unique: true,
      index: true
    },
    subject: {
      type: String,
      required: [true, 'Email subject line is required'],
      trim: true
    },
    bodyHtml: {
      type: String,
      required: [true, 'Template HTML body is required']
    },
    supportedVariables: {
      type: [String],
      default: []
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

export const NotificationTemplate =
  mongoose.models.NotificationTemplate ||
  mongoose.model('NotificationTemplate', notificationTemplateSchema);
export default NotificationTemplate;
