import mongoose from 'mongoose';

export const HOMEPAGE_SECTION_TYPES = [
  'product_grid',
  'product_carousel',
  'featured_products',
  'new_arrivals',
  'best_sellers',
  'trending_products',
  'hero_banner',
  'category_grid',
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
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'Section slug/identifier is required'],
      unique: true,
      trim: true,
      lowercase: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    heading: {
      type: String,
      trim: true,
      default: ''
    },
    subtitle: {
      type: String,
      trim: true,
      default: ''
    },
    type: {
      type: String,
      default: 'product_grid',
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    maxProducts: {
      type: Number,
      default: 8,
      min: 1,
      max: 50
    },
    displayPosition: {
      type: Number,
      default: 0,
      index: true
    },
    showViewAll: {
      type: Boolean,
      default: true
    },
    viewAllLink: {
      type: String,
      trim: true,
      default: ''
    },

    // Backward compatibility fields for legacy CMS builder
    sectionType: {
      type: String,
      default: 'featured_products'
    },
    title: {
      type: String,
      trim: true,
      default: ''
    },
    displayOrder: {
      type: Number,
      default: 0
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

// Pre-save synchronization hook to keep legacy and modern fields in sync
homepageSectionSchema.pre('save', function (next) {
  if (!this.heading && this.title) {
    this.heading = this.title;
  }
  if (!this.title && this.heading) {
    this.title = this.heading;
  }
  if (!this.name && this.title) {
    this.name = this.title;
  }
  if (!this.displayPosition && this.displayOrder) {
    this.displayPosition = this.displayOrder;
  }
  if (!this.displayOrder && this.displayPosition) {
    this.displayOrder = this.displayPosition;
  }
  if (!this.sectionType && this.slug) {
    this.sectionType = this.slug;
  }
  next();
});

homepageSectionSchema.index({ isActive: 1, displayPosition: 1 });
homepageSectionSchema.index({ slug: 1 }, { unique: true });

export const HomepageSection =
  mongoose.models.HomepageSection || mongoose.model('HomepageSection', homepageSectionSchema);
export default HomepageSection;
