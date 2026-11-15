import mongoose from 'mongoose';

const headerNavItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    link: { type: String, required: true },
    order: { type: Number, default: 0 },
    isCategoryDropdown: { type: Boolean, default: false }
  },
  { _id: false }
);

const footerLinkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    link: { type: String, required: true }
  },
  { _id: false }
);

const footerColumnSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    links: [footerLinkSchema]
  },
  { _id: false }
);

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      required: true,
      default: 'AURORA'
    },
    tagline: {
      type: String,
      default: 'Premium General E-Commerce Store'
    },
    logoUrl: {
      type: String,
      default: ''
    },
    faviconUrl: {
      type: String,
      default: ''
    },
    contactEmail: {
      type: String,
      default: 'support@aurora.in'
    },
    contactPhone: {
      type: String,
      default: '+91 98765 43210'
    },
    supportHours: {
      type: String,
      default: 'Mon - Sat: 9:00 AM - 7:00 PM IST'
    },
    address: {
      street: { type: String, default: '402, Trade Hub, BKC' },
      city: { type: String, default: 'Mumbai' },
      state: { type: String, default: 'Maharashtra' },
      postalCode: { type: String, default: '400051' },
      country: { type: String, default: 'India' }
    },
    socialLinks: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
      youtube: { type: String, default: '' }
    },
    currency: {
      type: String,
      default: 'INR'
    },
    taxGst: {
      gstin: { type: String, default: '27AAAAA0000A1Z5' },
      defaultRate: { type: Number, default: 18 }
    },
    shipping: {
      flatRate: { type: Number, default: 4900 }, // paise
      freeShippingThreshold: { type: Number, default: 99900 } // paise
    },
    cod: {
      enabled: { type: Boolean, default: true },
      minOrderValue: { type: Number, default: 20000 }, // paise
      maxOrderValue: { type: Number, default: 1000000 } // paise
    },
    seo: {
      defaultTitle: { type: String, default: 'AURORA — Modern Everyday Living' },
      defaultDescription: {
        type: String,
        default: 'Discover high-quality lighting, lifestyle accessories, and modern design essentials.'
      },
      defaultKeywords: {
        type: [String],
        default: ['e-commerce', 'smart home', 'lighting', 'accessories', 'india']
      }
    },
    maintenanceMode: {
      enabled: { type: Boolean, default: false },
      message: {
        type: String,
        default: 'Our store is undergoing scheduled maintenance. We will be back shortly.'
      }
    },
    headerNavigation: {
      type: [headerNavItemSchema],
      default: [
        { label: 'Shop All', link: '/products', order: 1, isCategoryDropdown: false },
        { label: 'Categories', link: '/products', order: 2, isCategoryDropdown: true },
        { label: 'New Arrivals', link: '/products?sortBy=newest', order: 3, isCategoryDropdown: false },
        { label: 'FAQs', link: '/faqs', order: 4, isCategoryDropdown: false }
      ]
    },
    footerColumns: {
      type: [footerColumnSchema],
      default: [
        {
          title: 'Shop',
          links: [
            { label: 'All Products', link: '/products' },
            { label: 'New Arrivals', link: '/products?sortBy=newest' },
            { label: 'Featured', link: '/products?isFeatured=true' }
          ]
        },
        {
          title: 'Customer Care',
          links: [
            { label: 'Track Order', link: '/track-order' },
            { label: 'FAQs', link: '/faqs' },
            { label: 'Shipping Policy', link: '/pages/shipping-policy' },
            { label: 'Returns & Refunds', link: '/pages/return-policy' }
          ]
        },
        {
          title: 'Legal',
          links: [
            { label: 'Privacy Policy', link: '/pages/privacy-policy' },
            { label: 'Terms & Conditions', link: '/pages/terms-and-conditions' },
            { label: 'Cancellation Policy', link: '/pages/cancellation-policy' }
          ]
        }
      ]
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        ret.shippingPolicy = ret.shipping;
        ret.codSettings = ret.cod;
        return ret;
      }
    }
  }
);

export const StoreSettings =
  mongoose.models.StoreSettings || mongoose.model('StoreSettings', storeSettingsSchema);
export default StoreSettings;
