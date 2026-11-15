import rateLimit from 'express-rate-limit';
import env from '../config/env.js';
import { sendError } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { MongoRateLimitStore } from './mongoRateLimitStore.js';

const createLimiter = (options) => {
  const limiterConfig = {
    standardHeaders: true, // Return standard RateLimit-* headers
    legacyHeaders: false,  // Disable X-RateLimit-* headers
    skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit'],
    handler: (req, res) => {
      return sendError(
        res,
        HTTP_STATUS.TOO_MANY_REQUESTS,
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        options.message || 'Too many requests, please slow down and try again later.'
      );
    },
    ...options
  };

  // Pluggable distributed store adapter
  if (env.RATE_LIMIT_STORE === 'mongo') {
    limiterConfig.store = new MongoRateLimitStore({ windowMs: options.windowMs });
  }

  return rateLimit(limiterConfig);
};

// General public read API limiter: 100 requests per 15 minutes
export const publicApiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP address, please try again after 15 minutes.'
});

// Sensitive auth operations limiter: 5 attempts per 15 minutes
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
});

// Checkout and payment limiter: 10 requests per 15 minutes
export const checkoutLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many checkout attempts. Please wait a few minutes before trying again.'
});

// Fast autocomplete/search limiter: 60 requests per minute
export const searchLimiter = createLimiter({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: 'Search rate limit exceeded. Please slow down.'
});

// Product review submission limiter: 10 submissions per 15 minutes
export const reviewLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many review submissions. Please wait before submitting another review.'
});

export default {
  publicApiLimiter,
  authLimiter,
  checkoutLimiter,
  searchLimiter,
  reviewLimiter
};

