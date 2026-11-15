import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  RATE_LIMIT_STORE: z.enum(['memory', 'mongo', 'redis']).default('memory'),
  COOKIE_DOMAIN: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform((val) => (val ? parseInt(val, 10) : undefined)).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('orders@example.in'),
  INITIAL_ADMIN_SETUP_SECRET: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(6).optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // If in test mode with missing URI, provide safe fallback
  if (process.env.NODE_ENV === 'test') {
    // Provide safe test mock config
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecom_test';
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_secret_key_at_least_32_characters_long_for_unit_tests';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_key_at_least_32_characters_long_for_unit_tests';
  } else {
    console.error('❌ Environment configuration validation failed:', parsed.error.format());
    throw new Error('Invalid environment configuration');
  }
}

export const env = parsed.success ? parsed.data : {
  NODE_ENV: process.env.NODE_ENV || 'test',
  PORT: 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ecom_test',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'test_secret_key_at_least_32_characters_long_for_unit_tests',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test_refresh_key_at_least_32_characters_long_for_unit_tests',
  JWT_ACCESS_EXPIRATION: '15m',
  JWT_REFRESH_EXPIRATION: '7d',
  CORS_ORIGIN: 'http://localhost:5173,http://127.0.0.1:5173',
  EMAIL_FROM: 'orders@example.in',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@aurora.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@123456'
};

export default env;

