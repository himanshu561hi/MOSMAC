import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      sparse: true,
      index: true
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    addressLine1: {
      type: String,
      required: [true, 'House / Flat / Building is required'],
      trim: true,
      maxlength: [150, 'Address line cannot exceed 150 characters']
    },
    addressLine2: {
      type: String,
      required: [true, 'Street / Area / Locality is required'],
      trim: true,
      maxlength: [150, 'Address line cannot exceed 150 characters']
    },
    landmark: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Landmark cannot exceed 100 characters']
    },
    city: {
      type: String,
      required: [true, 'City / District is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    postalCode: {
      type: String,
      required: [true, '6-digit Indian PIN code is required'],
      trim: true,
      match: [/^[1-9][0-9]{5}$/, 'Please provide a valid 6-digit Indian PIN code'],
      index: true
    },
    addressType: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    isDefaultShipping: {
      type: Boolean,
      default: false
    },
    isDefaultBilling: {
      type: Boolean,
      default: false
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

// Compound index for user addresses query
addressSchema.index({ userId: 1, createdAt: -1 });

// Ensure exclusive default addresses per user
addressSchema.pre('save', async function (next) {
  if (this.userId && this.isModified('isDefaultShipping') && this.isDefaultShipping) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isDefaultShipping: false } }
    );
  }
  if (this.userId && this.isModified('isDefaultBilling') && this.isDefaultBilling) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isDefaultBilling: false } }
    );
  }
  next();
});

export const Address = mongoose.models.Address || mongoose.model('Address', addressSchema);
export default Address;
