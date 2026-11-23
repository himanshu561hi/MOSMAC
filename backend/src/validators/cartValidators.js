import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const addToCartSchema = z.object({
  body: z.object({
    productId: z.string().regex(objectIdRegex, 'Invalid Product ID format'),
    sku: z.string().trim().min(1, 'SKU is required'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(10, 'Maximum 10 units per item allowed')
  })
});

export const updateQuantitySchema = z.object({
  body: z.object({
    quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative').max(10, 'Maximum 10 units per item allowed')
  })
});

export const applyCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(2, 'Coupon code must be at least 2 characters').max(30, 'Coupon code is too long')
  })
});

export const mergeCartSchema = z.object({
  body: z.object({
    guestId: z.string().trim().optional()
  }).optional()
});

export const addToWishlistSchema = z.object({
  body: z.object({
    productId: z.string().regex(objectIdRegex, 'Invalid Product ID format'),
    sku: z.string().trim().optional()
  })
});

export const moveToCartSchema = z.object({
  body: z.object({
    sku: z.string().trim().min(1, 'SKU is required to move item to cart'),
    quantity: z.coerce.number().int().min(1).max(10).optional().default(1)
  })
});

export const createCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(2).max(30),
    description: z.string().trim().optional(),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.number().positive('Discount value must be greater than zero'),
    maxDiscountAmount: z.number().nonnegative().optional().nullable(),
    minOrderAmount: z.number().nonnegative().optional().default(0),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime(),
    usageLimitPerUser: z.number().int().positive().optional().default(1),
    totalUsageLimit: z.number().int().positive().optional().nullable(),
    applicableCategories: z.array(z.string().regex(objectIdRegex)).optional().default([]),
    applicableProducts: z.array(z.string().regex(objectIdRegex)).optional().default([]),
    firstOrderOnly: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true)
  })
});

export default {
  addToCartSchema,
  updateQuantitySchema,
  applyCouponSchema,
  mergeCartSchema,
  addToWishlistSchema,
  moveToCartSchema,
  createCouponSchema
};
