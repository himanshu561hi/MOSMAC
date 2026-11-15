import { z } from 'zod';

const indianPhoneRegex = /^[6-9]\d{9}$/;
const indianPincodeRegex = /^[1-9][0-9]{5}$/;

export const addressSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().regex(indianPhoneRegex, 'Please enter a valid 10-digit Indian mobile number'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  addressLine1: z.string().min(3, 'House/Flat/Building is required').max(150),
  addressLine2: z.string().min(3, 'Street/Area/Locality is required').max(150),
  landmark: z.string().max(100).optional().or(z.literal('')),
  city: z.string().min(2, 'City/District is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().regex(indianPincodeRegex, 'Please enter a valid 6-digit Indian PIN code'),
  addressType: z.enum(['home', 'work', 'other']).default('home'),
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional()
});

export const checkoutQuoteSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      sku: z.string().min(1, 'SKU is required'),
      quantity: z.number().int().min(1).max(10)
    })
  ).min(1, 'At least one item is required in checkout'),
  couponCode: z.string().optional().or(z.literal('')),
  postalCode: z.string().regex(indianPincodeRegex, 'Invalid 6-digit Indian PIN code').optional().or(z.literal(''))
});

export const createOrderSchema = z.object({
  customer: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().optional().default(''),
    email: z.string().email('Valid email is required'),
    phone: z.string().regex(indianPhoneRegex, 'Valid 10-digit Indian phone is required')
  }),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      sku: z.string().min(1, 'SKU is required'),
      quantity: z.number().int().min(1).max(10)
    })
  ).min(1, 'At least one item is required'),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  couponCode: z.string().optional().or(z.literal('')),
  paymentMethod: z.enum(['razorpay', 'cod']),
  idempotencyKey: z.string().optional()
});

export const verifyPaymentSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
  razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature is required')
});

export const paymentFailureSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
  razorpayOrderId: z.string().optional(),
  errorDetails: z.object({
    code: z.string().optional(),
    description: z.string().optional(),
    reason: z.string().optional()
  }).optional()
});

export const guestOrderLookupSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
  email: z.string().email('Valid email address is required').optional(),
  phone: z.string().regex(indianPhoneRegex, 'Valid 10-digit phone number is required').optional()
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone number is required to verify guest order ownership'
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason must be at least 3 characters').max(500)
});

export const adminUpdateOrderStatusSchema = z.object({
  newStatus: z.enum([
    'placed',
    'confirmed',
    'processing',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'returned'
  ]),
  trackingDetails: z.object({
    courierName: z.string().optional(),
    trackingNumber: z.string().optional(),
    trackingUrl: z.string().optional()
  }).optional(),
  note: z.string().optional()
});

export const processRefundSchema = z.object({
  amount: z.number().int().min(1, 'Refund amount must be at least 1 paisa'),
  reason: z.string().min(3, 'Refund reason must be at least 3 characters').max(500)
});
