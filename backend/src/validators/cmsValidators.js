import { z } from 'zod';
import { isSafeCtaUrl } from '../utils/sanitizeHtml.js';
import { BANNER_TYPES } from '../models/Banner.js';
import { HOMEPAGE_SECTION_TYPES } from '../models/HomepageSection.js';
import { TEMPLATE_TYPES } from '../models/NotificationTemplate.js';

// 1. Banner Schemas
export const createBannerSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(150),
  subtitle: z.string().trim().max(300).optional().default(''),
  desktopImageUrl: z.string().trim().url('Desktop image must be a valid URL'),
  mobileImageUrl: z.string().trim().url('Mobile image must be a valid URL').optional().or(z.literal('')),
  altText: z.string().trim().min(2, 'Alt text is required for accessibility'),
  ctaLabel: z.string().trim().max(50).optional().default(''),
  ctaDestination: z.string().trim().refine(isSafeCtaUrl, {
    message: 'CTA destination must be a safe internal path (e.g. /products) or secure HTTPS URL'
  }).optional().default(''),
  bannerType: z.enum(BANNER_TYPES).optional().default('hero'),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional().default(true)
});

export const updateBannerSchema = createBannerSchema.partial();

// 2. Homepage Section Schemas
export const createSectionSchema = z.object({
  sectionType: z.enum(HOMEPAGE_SECTION_TYPES).optional(),
  type: z.enum(HOMEPAGE_SECTION_TYPES).optional(),
  title: z.string().trim().max(150).optional().default(''),
  subtitle: z.string().trim().max(300).optional().default(''),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  config: z.object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(8),
    categoryIds: z.array(z.string()).optional().default([]),
    productIds: z.array(z.string()).optional().default([]),
    bannerIds: z.array(z.string()).optional().default([]),
    layoutType: z.string().optional().default('grid'),
    customHtml: z.string().optional().default(''),
    ctaText: z.string().optional().default(''),
    ctaLink: z.string().refine(isSafeCtaUrl, { message: 'Invalid CTA link' }).optional().default('')
  }).optional().default({})
}).transform((data) => ({
  ...data,
  sectionType: data.sectionType || data.type || 'custom_content'
}));

export const updateSectionSchema = z.object({
  sectionType: z.enum(HOMEPAGE_SECTION_TYPES).optional(),
  type: z.enum(HOMEPAGE_SECTION_TYPES).optional(),
  title: z.string().trim().max(150).optional(),
  subtitle: z.string().trim().max(300).optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  config: z.object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
    categoryIds: z.array(z.string()).optional(),
    productIds: z.array(z.string()).optional(),
    bannerIds: z.array(z.string()).optional(),
    layoutType: z.string().optional(),
    customHtml: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().refine(isSafeCtaUrl, { message: 'Invalid CTA link' }).optional()
  }).optional()
}).transform((data) => {
  const result = { ...data };
  if (data.type && !data.sectionType) result.sectionType = data.type;
  return result;
});

export const reorderSectionsSchema = z.object({
  sections: z.array(
    z.object({
      id: z.string(),
      displayOrder: z.coerce.number().int().min(0)
    })
  ).optional(),
  orders: z.array(
    z.object({
      id: z.string(),
      displayOrder: z.coerce.number().int().min(0)
    })
  ).optional()
}).transform((data) => ({
  sections: data.sections || data.orders || []
}));

// 3. Content Page Schemas
export const createPageSchema = z.object({
  title: z.string().trim().min(2, 'Page title must be at least 2 characters').max(200),
  slug: z.string().trim().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase alphanumeric characters and hyphens'
  }),
  content: z.string().min(5, 'Page content cannot be empty'),
  seoTitle: z.string().trim().max(100).optional().default(''),
  seoDescription: z.string().trim().max(250).optional().default(''),
  featuredImageUrl: z.string().trim().url().optional().or(z.literal('')),
  status: z.enum(['draft', 'published']).optional().default('draft')
});

export const updatePageSchema = createPageSchema.partial().extend({
  changeSummary: z.string().trim().optional()
});

// 4. FAQ Schemas
export const createFaqSchema = z.object({
  question: z.string().trim().min(5, 'Question must be at least 5 characters').max(300),
  answer: z.string().trim().min(5, 'Answer must be at least 5 characters'),
  category: z.string().trim().min(2, 'Category is required').default('General & Product Care'),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true)
});

export const updateFaqSchema = createFaqSchema.partial();

// 5. Product Review Schemas
export const submitReviewSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  sku: z.string().trim().min(1, 'SKU is required'),
  rating: z.coerce.number().int().min(1, 'Minimum rating is 1').max(5, 'Maximum rating is 5'),
  title: z.string().trim().min(2, 'Headline must be at least 2 characters').max(120),
  comment: z.string().trim().min(5, 'Review must be at least 5 characters').max(2000),
  images: z.array(z.string().url()).max(5, 'Maximum 5 images allowed').optional().default([])
});

export const moderateReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  moderationNote: z.string().trim().max(500).optional().default('')
});

// 6. Store Settings Schema
export const updateStoreSettingsSchema = z.object({
  storeName: z.string().trim().min(2).max(100).optional(),
  tagline: z.string().trim().max(200).optional(),
  logoUrl: z.string().trim().url().optional().or(z.literal('')),
  faviconUrl: z.string().trim().url().optional().or(z.literal('')),
  contactEmail: z.string().trim().email().optional(),
  contactPhone: z.string().trim().optional(),
  supportHours: z.string().trim().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional()
  }).optional(),
  socialLinks: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    youtube: z.string().optional()
  }).optional(),
  currency: z.string().default('INR').optional(),
  taxGst: z.object({
    gstin: z.string().optional(),
    defaultRate: z.number().min(0).max(100).optional()
  }).optional(),
  shipping: z.object({
    flatRate: z.number().int().min(0).optional(),
    freeShippingThreshold: z.number().int().min(0).optional(),
    estimatedDeliveryDaysMin: z.number().int().optional(),
    estimatedDeliveryDaysMax: z.number().int().optional()
  }).optional(),
  shippingPolicy: z.object({
    flatRate: z.number().int().min(0).optional(),
    freeShippingThreshold: z.number().int().min(0).optional(),
    estimatedDeliveryDaysMin: z.number().int().optional(),
    estimatedDeliveryDaysMax: z.number().int().optional()
  }).optional(),
  cod: z.object({
    enabled: z.boolean().optional(),
    isEnabled: z.boolean().optional(),
    minOrderValue: z.number().int().min(0).optional(),
    maxOrderValue: z.number().int().min(0).optional(),
    maxOrderAmount: z.number().int().min(0).optional()
  }).optional(),
  codSettings: z.object({
    enabled: z.boolean().optional(),
    isEnabled: z.boolean().optional(),
    minOrderValue: z.number().int().min(0).optional(),
    maxOrderValue: z.number().int().min(0).optional(),
    maxOrderAmount: z.number().int().min(0).optional()
  }).optional(),
  supportEmail: z.string().trim().email().optional(),
  supportPhone: z.string().trim().optional(),
  seo: z.object({
    defaultTitle: z.string().optional(),
    defaultDescription: z.string().optional(),
    defaultKeywords: z.array(z.string()).optional()
  }).optional(),
  maintenanceMode: z.object({
    enabled: z.boolean().optional(),
    message: z.string().optional()
  }).optional(),
  headerNavigation: z.array(
    z.object({
      label: z.string().min(1),
      link: z.string().min(1),
      order: z.number().optional().default(0),
      displayOrder: z.number().optional(),
      isExternal: z.boolean().optional(),
      isCategoryDropdown: z.boolean().optional().default(false)
    })
  ).optional(),
  footerColumns: z.array(
    z.object({
      title: z.string().min(1),
      links: z.array(z.object({ label: z.string().min(1), link: z.string().min(1) }))
    })
  ).optional()
}).transform((data) => {
  const result = { ...data };
  if (data.shippingPolicy && !data.shipping) result.shipping = data.shippingPolicy;
  if (data.codSettings && !data.cod) result.cod = data.codSettings;
  if (data.supportEmail && !data.contactEmail) result.contactEmail = data.supportEmail;
  if (data.supportPhone && !data.contactPhone) result.contactPhone = data.supportPhone;
  if (result.cod) {
    if (result.cod.isEnabled !== undefined && result.cod.enabled === undefined) {
      result.cod.enabled = result.cod.isEnabled;
    }
    if (result.cod.maxOrderAmount !== undefined && result.cod.maxOrderValue === undefined) {
      result.cod.maxOrderValue = result.cod.maxOrderAmount;
    }
  }
  return result;
});

// 7. Notification Template Schema
export const updateTemplateSchema = z.object({
  subject: z.string().trim().min(2, 'Subject must be at least 2 characters').max(200),
  bodyHtml: z.string().min(5, 'Body HTML cannot be empty'),
  isActive: z.boolean().optional().default(true)
});

// 8. Media Asset Schema
export const recordMediaAssetSchema = z.object({
  publicId: z.string().trim().min(1, 'Public ID is required'),
  url: z.string().trim().url('Valid URL is required'),
  secureUrl: z.string().trim().url().optional(),
  format: z.string().trim().optional().default('jpg'),
  bytes: z.number().min(0).optional().default(0),
  width: z.number().min(0).optional().default(0),
  height: z.number().min(0).optional().default(0),
  altText: z.string().trim().optional().default(''),
  folder: z.string().trim().optional().default('ecommerce/general'),
  tags: z.array(z.string()).optional().default([])
});
