import mongoose from 'mongoose';

export const PRODUCT_STATUSES = ['draft', 'published', 'archived'];
export const PRODUCT_BADGES = ['NEW', 'BESTSELLER', 'HOT', 'FEATURED', 'TRENDING'];

const variantSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true
    },
    title: {
      type: String,
      required: [true, 'Variant title is required'],
      trim: true
    },
    attributes: {
      type: Map,
      of: String,
      default: {}
    },
    price: {
      type: Number,
      required: [true, 'Price in paise is required'],
      min: [0, 'Price cannot be negative']
    },
    mrp: {
      type: Number,
      required: [true, 'MRP in paise is required'],
      min: [0, 'MRP cannot be negative']
    },
    costPrice: {
      type: Number,
      default: 0,
      min: [0, 'Cost price cannot be negative']
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative']
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0
    },
    barcode: {
      type: String,
      trim: true,
      default: ''
    },
    weight: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { _id: true }
);

const productImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      default: ''
    },
    alt: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    },
    contentHash: {
      type: String,
      default: '',
      index: true
    }
  },
  { _id: true }
);

const productAttributeSchema = new mongoose.Schema(
  {
    attributeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttributeDefinition',
      required: true
    },
    code: {
      type: String,
      required: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      minlength: [3, 'Product title must be at least 3 characters'],
      maxlength: [200, 'Product title cannot exceed 200 characters']
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: [true, 'Brand is required'],
      index: true
    },
    images: {
      type: [productImageSchema],
      default: []
    },
    status: {
      type: String,
      enum: PRODUCT_STATUSES,
      default: 'draft',
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },
    badges: {
      type: [String],
      enum: PRODUCT_BADGES,
      default: []
    },
    hasVariants: {
      type: Boolean,
      default: false
    },
    variants: {
      type: [variantSchema],
      default: []
    },
    attributes: {
      type: [productAttributeSchema],
      default: []
    },
    weight: {
      type: Number,
      default: 0,
      min: 0
    },
    basePrice: {
      type: Number,
      default: 0,
      min: 0,
      index: true
    },
    baseMrp: {
      type: Number,
      default: 0,
      min: 0
    },
    seo: {
      metaTitle: { type: String, trim: true, default: '' },
      metaDescription: { type: String, trim: true, default: '' },
      keywords: { type: [String], default: [] }
    },
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 }
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

// Search & Faceted Compound Indexes
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ categoryId: 1, status: 1, basePrice: 1 });
productSchema.index({ brandId: 1, status: 1 });
productSchema.index({ status: 1, isFeatured: 1 });
productSchema.index({ 'variants.sku': 1 });

// Automatically compute lowest basePrice and baseMrp before save
productSchema.pre('save', function (next) {
  if (this.variants && this.variants.length > 0) {
    const activeVariants = this.variants.filter((v) => v.isActive);
    const targetVariants = activeVariants.length > 0 ? activeVariants : this.variants;

    const lowestPrice = Math.min(...targetVariants.map((v) => v.price));
    const matchingVariant = targetVariants.find((v) => v.price === lowestPrice);

    this.basePrice = lowestPrice;
    this.baseMrp = matchingVariant ? matchingVariant.mrp : lowestPrice;
  }
  next();
});

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;

