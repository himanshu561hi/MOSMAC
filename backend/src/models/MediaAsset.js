import mongoose from 'mongoose';

const mediaAssetSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: [true, 'Cloudinary public ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    url: {
      type: String,
      required: [true, 'Asset URL is required'],
      trim: true
    },
    secureUrl: {
      type: String,
      trim: true,
      default: ''
    },
    format: {
      type: String,
      trim: true,
      default: 'jpg'
    },
    bytes: {
      type: Number,
      default: 0
    },
    width: {
      type: Number,
      default: 0
    },
    height: {
      type: Number,
      default: 0
    },
    altText: {
      type: String,
      trim: true,
      default: ''
    },
    folder: {
      type: String,
      trim: true,
      default: 'ecommerce/general'
    },
    tags: {
      type: [String],
      default: []
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

mediaAssetSchema.index({ createdAt: -1 });
mediaAssetSchema.index({ tags: 1 });

export const MediaAsset =
  mongoose.models.MediaAsset || mongoose.model('MediaAsset', mediaAssetSchema);
export default MediaAsset;
