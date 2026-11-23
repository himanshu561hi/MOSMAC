import { z } from 'zod';

const passwordPattern = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Please provide a valid email address')
      .trim()
      .toLowerCase(),
    password: passwordPattern,
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name cannot exceed 50 characters')
      .trim(),
    lastName: z
      .string()
      .max(50, 'Last name cannot exceed 50 characters')
      .trim()
      .optional()
      .default(''),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Phone number must be a valid 10-digit Indian mobile number')
      .optional(),
    guestId: z.string().trim().optional()
  }).strict()
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Please provide a valid email address')
      .trim()
      .toLowerCase(),
    password: z.string().min(1, 'Password is required'),
    guestId: z.string().trim().optional()
  }).strict()
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Please provide a valid email address')
      .trim()
      .toLowerCase()
  }).strict()
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordPattern
  }).strict()
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordPattern
  }).strict()
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(50).trim().optional(),
    lastName: z.string().max(50).trim().optional(),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Phone number must be a valid 10-digit Indian mobile number').optional()
  }).strict()
});

export default {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema
};

