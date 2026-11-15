import mongoose from 'mongoose';

const reservationItemSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { _id: false }
);

const inventoryReservationSchema = new mongoose.Schema(
  {
    reservationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      sparse: true,
      index: true
    },
    orderNumber: {
      type: String,
      default: '',
      sparse: true,
      index: true
    },
    items: {
      type: [reservationItemSchema],
      required: true,
      validate: [(val) => val.length > 0, 'At least one item must be reserved']
    },
    status: {
      type: String,
      enum: ['active', 'committed', 'released'],
      default: 'active',
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
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

// Compound index to quickly find active expired reservations for the sweeper
inventoryReservationSchema.index({ status: 1, expiresAt: 1 });

export const InventoryReservation =
  mongoose.models.InventoryReservation ||
  mongoose.model('InventoryReservation', inventoryReservationSchema);

export default InventoryReservation;
