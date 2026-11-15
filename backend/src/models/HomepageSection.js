import mongoose from 'mongoose';

export const HOMEPAGE_SECTION_TYPES = [
  'hero_banner',
  'category_grid',
  'featured_products',
  'new_arrivals',
  'best_sellers',
  'trending_products',
  'promotional_banner',
  'brand_showcase',
  'newsletter',
  'custom_content'
];

const sectionConfigSchema = new mongoose.Schema(
  {
    limit: {
      type: Number,
      default: 8,
      min: 1,
      max: 50
    },
    categoryIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
      }
    ],
    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      }
    ],
    bannerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Banner'
      }
    ],
    layoutType: {
      type: String,
      default: 'grid'
    },
    customHtml: {
      type: String,
      default: ''
    },
    ctaText: {
      type: String,
      default: ''
    },
    ctaLink: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const homepageSectionSchema = new mongoose.Schema(
  {
    sectionType: {
      type: String,
      enum: HOMEPAGE_SECTION_TYPES,
      required: [true, 'Section type is required'],
      index: true
    },
    title: {
      type: String,
      trim: true,
      default: ''
    },
    subtitle: {
      type: String,
      trim: true,
      default: ''
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    config: {
      type: sectionConfigSchema,
      default: () => ({})
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

homepageSectionSchema.index({ isActive: 1, displayOrder: 1 });

export const HomepageSection =
  mongoose.models.HomepageSection || mongoose.model('HomepageSection', homepageSectionSchema);
export default HomepageSection;
