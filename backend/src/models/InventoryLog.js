import mongoose from 'mongoose';

export const INVENTORY_REASONS = [
  'restock',
  'correction',
  'damaged',
  'return',
  'order_reservation',
  'order_deduction',
  'order_cancellation',
  'audit'
];

const inventoryLogSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
      index: true
    },
    delta: {
      type: Number,
      required: [true, 'Stock delta is required']
    },
    previousStock: {
      type: Number,
      required: [true, 'Previous stock is required']
    },
    newStock: {
      type: Number,
      required: [true, 'New stock is required']
    },
    reason: {
      type: String,
      enum: INVENTORY_REASONS,
      required: [true, 'Adjustment reason is required']
    },
    referenceId: {
      type: String,
      trim: true,
      default: ''
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID performing the action is required']
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

inventoryLogSchema.index({ sku: 1, createdAt: -1 });

export const InventoryLog =
  mongoose.models.InventoryLog || mongoose.model('InventoryLog', inventoryLogSchema);

export default InventoryLog;

