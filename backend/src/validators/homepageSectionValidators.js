import { z } from 'zod';

export const createSectionSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Section name must be at least 2 characters').max(100),
    slug: z
      .string()
      .min(2, 'Slug must be at least 2 characters')
      .max(60)
      .regex(/^[a-z0-9_-]+$/, 'Slug can only contain lowercase letters, numbers, hyphens, and underscores')
      .optional(),
    description: z.string().max(500).optional(),
    heading: z.string().max(150).optional(),
    subtitle: z.string().max(250).optional(),
    type: z.enum(['product_grid', 'product_carousel', 'featured', 'custom']).default('product_grid').optional(),
    maxProducts: z.number().int().min(1).max(50).default(8).optional(),
    displayPosition: z.number().int().min(0).optional(),
    showViewAll: z.boolean().default(true).optional(),
    viewAllLink: z.string().max(300).optional(),
    isActive: z.boolean().default(true).optional()
  })
});

export const updateSectionSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    slug: z
      .string()
      .min(2)
      .max(60)
      .regex(/^[a-z0-9_-]+$/, 'Slug can only contain lowercase letters, numbers, hyphens, and underscores')
      .optional(),
    description: z.string().max(500).optional(),
    heading: z.string().max(150).optional(),
    subtitle: z.string().max(250).optional(),
    type: z.enum(['product_grid', 'product_carousel', 'featured', 'custom']).optional(),
    maxProducts: z.number().int().min(1).max(50).optional(),
    displayPosition: z.number().int().min(0).optional(),
    showViewAll: z.boolean().optional(),
    viewAllLink: z.string().max(300).optional(),
    isActive: z.boolean().optional()
  })
});

export const toggleStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean({ required_error: 'isActive boolean is required' })
  })
});

export const reorderSectionsSchema = z.object({
  body: z.object({
    sections: z
      .array(
        z.object({
          id: z.string().min(1, 'Section ID is required'),
          displayPosition: z.number().int().min(0)
        })
      )
      .min(1, 'At least one section is required to reorder')
  })
});

export const assignProductsSchema = z.object({
  body: z.object({
    productIds: z.array(z.string()).optional(),
    productSkus: z.array(z.string()).optional()
  })
});

export const updateProductsSchema = z.object({
  body: z.object({
    products: z.array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        displayOrder: z.number().int().min(0).optional()
      })
    )
  })
});
