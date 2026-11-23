import { z } from 'zod';
import { ATTRIBUTE_TYPES } from '../models/AttributeDefinition.js';
import { PRODUCT_STATUSES, PRODUCT_BADGES } from '../models/Product.js';
import { INVENTORY_REASONS } from '../models/InventoryLog.js';

// Category Schemas
export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim(),
    slug: z.string().min(2).max(100).toLowerCase().trim().optional(),
    description: z.string().max(1000).trim().optional().default(''),
    parentId: z.string().nullable().optional(),
    imageUrl: z.string().optional().default(''),
    displayOrder: z.number().int().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true)
  }).strict()
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim().optional(),
    slug: z.string().min(2).max(100).toLowerCase().trim().optional(),
    description: z.string().max(1000).trim().optional(),
    parentId: z.string().nullable().optional(),
    imageUrl: z.string().optional(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional()
  }).strict()
});

// Brand Schemas
export const createBrandSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim(),
    slug: z.string().min(2).max(100).toLowerCase().trim().optional(),
    logoUrl: z.string().optional().default(''),
    description: z.string().max(1000).trim().optional().default(''),
    website: z.string().trim().optional().default(''),
    isActive: z.boolean().optional().default(true),
    isMosmacLoves: z.boolean().optional().default(false),
    isTopBrand: z.boolean().optional().default(false),
    isNewlyAdded: z.boolean().optional().default(false),
    isFeatured: z.boolean().optional().default(false),
    isMosmacRed: z.boolean().optional().default(false),
    isHomegrown: z.boolean().optional().default(false)
  }).strict()
});

export const updateBrandSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim().optional(),
    slug: z.string().min(2).max(100).toLowerCase().trim().optional(),
    logoUrl: z.string().optional(),
    description: z.string().max(1000).trim().optional(),
    website: z.string().trim().optional(),
    isActive: z.boolean().optional(),
    isMosmacLoves: z.boolean().optional(),
    isTopBrand: z.boolean().optional(),
    isNewlyAdded: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isMosmacRed: z.boolean().optional(),
    isHomegrown: z.boolean().optional()
  }).strict()
});

// Attribute Definition Schemas
export const createAttributeSchema = z.object({
  body: z.object({
    categoryId: z.string().min(1, 'Category ID is required'),
    name: z.string().min(2).max(50).trim(),
    code: z.string().min(2).max(50).toLowerCase().trim(),
    type: z.enum(ATTRIBUTE_TYPES),
    unit: z.string().trim().optional().default(''),
    options: z.array(z.string().trim()).optional().default([]),
    isRequired: z.boolean().optional().default(false),
    isFilterable: z.boolean().optional().default(true),
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional()
    }).optional()
  }).strict()
});

export const updateAttributeSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).trim().optional(),
    type: z.enum(ATTRIBUTE_TYPES).optional(),
    unit: z.string().trim().optional(),
    options: z.array(z.string().trim()).optional(),
    isRequired: z.boolean().optional(),
    isFilterable: z.boolean().optional(),
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional()
    }).optional()
  }).strict()
});

// Product Schemas
const variantInputSchema = z.object({
  sku: z.string().min(2).trim().toUpperCase(),
  title: z.string().min(1).trim(),
  attributes: z.record(z.string(), z.string()).optional().default({}),
  price: z.number().int().min(0, 'Price must be in positive integer paise').optional(),
  sellingPrice: z.number().int().min(0).optional(),
  mrp: z.number().int().min(0, 'MRP must be in positive integer paise'),
  costPrice: z.number().int().min(0).optional().default(0),
  stockQuantity: z.number().int().min(0, 'Stock cannot be negative').default(0),
  lowStockThreshold: z.number().int().min(0).optional().default(5),
  barcode: z.string().trim().optional().default(''),
  weight: z.coerce.number().min(0, 'Weight cannot be negative').optional().default(0),
  isActive: z.boolean().optional().default(true),
  status: z.string().optional()
}).transform((data) => {
  const price = data.price !== undefined ? data.price : (data.sellingPrice !== undefined ? data.sellingPrice : 0);
  const isActive = data.isActive !== undefined ? data.isActive : (data.status !== 'inactive');
  return {
    ...data,
    price,
    isActive
  };
}).refine((data) => data.price <= data.mrp, {
  message: 'Selling price cannot exceed MRP',
  path: ['price']
});

const productImageInputSchema = z.object({
  url: z.string().min(1, 'Image URL is required'),
  publicId: z.string().optional().default(''),
  alt: z.string().optional().default(''),
  isPrimary: z.boolean().optional().default(false),
  order: z.number().int().min(0).optional().default(0),
  displayOrder: z.number().int().min(0).optional()
}).transform((data) => ({
  ...data,
  order: data.order !== undefined ? data.order : (data.displayOrder !== undefined ? data.displayOrder : 0)
}));

const productAttributeInputSchema = z.object({
  attributeId: z.string().optional(),
  code: z.string().min(1),
  value: z.any()
});

export const createProductSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200).trim(),
    slug: z.string().min(3).max(200).toLowerCase().trim().optional(),
    description: z.string().min(1).trim(),
    categoryId: z.string().min(1, 'Category is required'),
    brandId: z.string().min(1, 'Brand is required'),
    status: z.enum(PRODUCT_STATUSES).optional().default('draft'),
    isFeatured: z.boolean().optional().default(false),
    badges: z.array(z.string()).optional().default([]),
    hasVariants: z.boolean().optional().default(false),
    images: z.array(productImageInputSchema).optional().default([]),
    attributes: z.array(productAttributeInputSchema).optional().default([]),
    weight: z.coerce.number().min(0, 'Weight cannot be negative').optional().default(0),
    variants: z.array(variantInputSchema).min(1, 'At least one variant or SKU configuration is required'),
    seo: z.object({
      metaTitle: z.string().optional().default(''),
      metaDescription: z.string().optional().default(''),
      keywords: z.array(z.string()).optional().default([])
    }).optional()
  }).passthrough()
});

export const updateProductSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200).trim().optional(),
    slug: z.string().min(3).max(200).toLowerCase().trim().optional(),
    description: z.string().min(1).trim().optional(),
    categoryId: z.string().min(1).optional(),
    brandId: z.string().min(1).optional(),
    status: z.enum(PRODUCT_STATUSES).optional(),
    isFeatured: z.boolean().optional(),
    badges: z.array(z.string()).optional(),
    hasVariants: z.boolean().optional(),
    images: z.array(productImageInputSchema).optional(),
    attributes: z.array(productAttributeInputSchema).optional(),
    weight: z.coerce.number().min(0, 'Weight cannot be negative').optional(),
    variants: z.array(variantInputSchema).min(1).optional(),
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional()
    }).optional()
  }).passthrough()
});

// Stock Adjustment Schema
export const stockAdjustmentSchema = z.object({
  body: z.object({
    sku: z.string().min(1).trim().toUpperCase(),
    delta: z.number().int().refine((val) => val !== 0, {
      message: 'Adjustment delta cannot be 0'
    }),
    reason: z.enum(INVENTORY_REASONS),
    referenceId: z.string().trim().optional().default(''),
    note: z.string().trim().optional().default('')
  }).strict()
});

export default {
  createCategorySchema,
  updateCategorySchema,
  createBrandSchema,
  updateBrandSchema,
  createAttributeSchema,
  updateAttributeSchema,
  createProductSchema,
  updateProductSchema,
  stockAdjustmentSchema
};

