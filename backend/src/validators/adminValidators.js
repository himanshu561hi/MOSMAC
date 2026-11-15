import { z } from 'zod';
import { ADMIN_ROLES } from '../constants/roles.js';

export const createStaffSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50),
  lastName: z.string().trim().max(50).optional().default(''),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number').optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  role: z.enum(ADMIN_ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${ADMIN_ROLES.join(', ')}` })
  })
});

export const updateStaffRoleSchema = z.object({
  role: z.enum(ADMIN_ROLES).optional(),
  status: z.enum(['active', 'suspended', 'deactivated']).optional()
});

export const addCustomerNoteSchema = z.object({
  note: z.string().trim().min(1, 'Note content is required').max(1000)
});

export const updateCustomerStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'deactivated']),
  reason: z.string().trim().max(500).optional().default('')
});

export const updateThresholdSchema = z.object({
  lowStockThreshold: z.number().int().min(0, 'Threshold must be zero or a positive integer')
});

export const stockAdjustmentSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required').toUpperCase(),
  delta: z.number().int().refine((val) => val !== 0, 'Delta cannot be 0'),
  reason: z.enum(['restock', 'correction', 'damaged', 'return', 'audit'], {
    errorMap: () => ({ message: 'Invalid reason' })
  }),
  referenceId: z.string().trim().max(100).optional().default(''),
  note: z.string().trim().max(500).optional().default('')
});

export const initialSuperAdminSchema = z.object({
  body: z
    .object({
      firstName: z.string().trim().min(1, 'First name is required').max(50),
      lastName: z.string().trim().max(50).optional().default(''),
      email: z.string().trim().email('Invalid email address').toLowerCase(),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128)
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
      confirmPassword: z.string().min(1, 'Confirm password is required'),
      setupSecret: z.string().min(1, 'Temporary setup authorization secret is required')
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword']
    })
});

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Invalid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required')
  })
});
