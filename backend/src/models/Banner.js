import mongoose from 'mongoose';

export const BANNER_TYPES = ['hero', 'promo', 'sidebar'];

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    subtitle: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Subtitle cannot exceed 300 characters']
    },
    desktopImageUrl: {
      type: String,
      required: [true, 'Desktop banner image URL is required'],
      trim: true
    },
    mobileImageUrl: {
      type: String,
      trim: true,
      default: ''
    },
    altText: {
      type: String,
      required: [true, 'Alt text is required for accessibility'],
      trim: true
    },
    ctaLabel: {
      type: String,
      trim: true,
      default: ''
    },
    ctaDestination: {
      type: String,
      trim: true,
      default: ''
    },
    bannerType: {
      type: String,
      enum: BANNER_TYPES,
      default: 'hero',
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null
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

bannerSchema.index({ bannerType: 1, isActive: 1, displayOrder: 1 });

export const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);
export default Banner;
