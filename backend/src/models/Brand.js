import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Brand name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Brand name must be at least 2 characters'],
      maxlength: [100, 'Brand name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      required: [true, 'Brand slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    logoUrl: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    website: {
      type: String,
      trim: true,
      default: ''
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

brandSchema.index({ isActive: 1, name: 1 });

export const Brand = mongoose.models.Brand || mongoose.model('Brand', brandSchema);
export default Brand;

