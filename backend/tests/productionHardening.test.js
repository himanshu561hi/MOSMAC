import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { Brand } from '../src/models/Brand.js';
import { ContentPage } from '../src/models/ContentPage.js';
import { RateLimitBucket, MongoRateLimitStore } from '../src/middlewares/mongoRateLimitStore.js';
import rateLimit from 'express-rate-limit';
import { logger, sanitize } from '../src/utils/logger.js';
import { initSentry, captureException, captureMessage, isSentryConfigured } from '../src/utils/sentry.js';
import { generateAccessToken } from '../src/services/tokenService.js';
import { hashPassword } from '../src/services/passwordService.js';

let mongoServer;
let testCategory, testBrand, testProduct, testPage;

describe('Phase 9 — Production Hardening, Monitoring, SEO & Launch Preparation Test Suite', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Seed Category
    testCategory = await Category.create({
      name: 'Smartphones & Audio',
      slug: 'smartphones-audio',
      isActive: true
    });

    // Seed Brand
    testBrand = await Brand.create({
      name: 'Aura Acoustics',
      slug: 'aura-acoustics',
      isActive: true
    });

    // Seed Product
    testProduct = await Product.create({
      title: 'Aura Studio Wireless Headphones',
      slug: 'aura-studio-wireless-headphones',
      description: 'High-fidelity audio headphones with active noise cancellation.',
      categoryId: testCategory._id,
      brandId: testBrand._id,
      basePrice: 599900,
      baseMrp: 899900,
      status: 'published',
      hasVariants: false,
      variants: [
        {
          sku: 'AURA-HEADPHONE-01',
          title: 'Aura Studio Wireless Headphones - Midnight Black',
          price: 599900,
          mrp: 899900,
          stockQuantity: 25,
          isActive: true
        }
      ]
    });

    // Seed Published Content Page
    testPage = await ContentPage.create({
      title: 'Warranty & Return Policy',
      slug: 'warranty-and-returns',
      content: '<p>All products sold on Aura come with standard warranty coverage.</p>',
      status: 'published'
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // =========================================================================
  // 1. DISTRIBUTED RATE LIMITING ACROSS INDEPENDENT SERVERLESS INSTANCES
  // =========================================================================
  describe('1. Distributed Rate Limiting Across Independent Serverless Instances', () => {
    let instanceA, instanceB;
    const testIp = '198.51.100.42';

    beforeAll(() => {
      // Create a shared Mongo rate limit store pointing to the shared MongoDB database
      const sharedStore = new MongoRateLimitStore({ windowMs: 60 * 1000 });

      // Create Instance A (simulating Serverless Instance 1)
      instanceA = express();
      instanceA.set('trust proxy', true);
      instanceA.use(
        rateLimit({
          store: sharedStore,
          windowMs: 60 * 1000,
          max: 4,
          standardHeaders: true,
          legacyHeaders: false,
          keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip
        })
      );
      instanceA.get('/test-limit', (req, res) => res.json({ instance: 'A', hit: true }));

      // Create Instance B (simulating Serverless Instance 2)
      instanceB = express();
      instanceB.set('trust proxy', true);
      instanceB.use(
        rateLimit({
          store: sharedStore,
          windowMs: 60 * 1000,
          max: 4,
          standardHeaders: true,
          legacyHeaders: false,
          keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip
        })
      );
      instanceB.get('/test-limit', (req, res) => res.json({ instance: 'B', hit: true }));
    });

    beforeEach(async () => {
      await RateLimitBucket.deleteMany({});
    });

    it('should share rate-limit state between independent instances and block on instance B when threshold is reached across both', async () => {
      // Request 1 to Instance A
      const res1 = await request(instanceA)
        .get('/test-limit')
        .set('X-Forwarded-For', testIp);
      expect(res1.status).toBe(200);

      // Request 2 to Instance A
      const res2 = await request(instanceA)
        .get('/test-limit')
        .set('X-Forwarded-For', testIp);
      expect(res2.status).toBe(200);

      // Request 3 to Instance B (alternate serverless node)
      const res3 = await request(instanceB)
        .get('/test-limit')
        .set('X-Forwarded-For', testIp);
      expect(res3.status).toBe(200);

      // Request 4 to Instance B
      const res4 = await request(instanceB)
        .get('/test-limit')
        .set('X-Forwarded-For', testIp);
      expect(res4.status).toBe(200);

      // Request 5 to Instance B (exceeds limit of 4)
      const res5 = await request(instanceB)
        .get('/test-limit')
        .set('X-Forwarded-For', testIp);

      expect(res5.status).toBe(429);
      expect(res5.headers['ratelimit-remaining']).toBe('0');
      expect(res5.headers['retry-after']).toBeDefined();

      // Request 6 to Instance A (also immediately blocked because limit is shared)
      const res6 = await request(instanceA)
        .get('/test-limit')
        .set('X-Forwarded-For', testIp);

      expect(res6.status).toBe(429);
    });

    it('should handle concurrent requests safely without race condition bucket corruption', async () => {
      const concurrentIp = '198.51.100.99';

      // Fire 6 concurrent requests simultaneously across instances A and B
      const requests = [
        request(instanceA).get('/test-limit').set('X-Forwarded-For', concurrentIp),
        request(instanceB).get('/test-limit').set('X-Forwarded-For', concurrentIp),
        request(instanceA).get('/test-limit').set('X-Forwarded-For', concurrentIp),
        request(instanceB).get('/test-limit').set('X-Forwarded-For', concurrentIp),
        request(instanceA).get('/test-limit').set('X-Forwarded-For', concurrentIp),
        request(instanceB).get('/test-limit').set('X-Forwarded-For', concurrentIp)
      ];

      const responses = await Promise.all(requests);
      const successful = responses.filter((r) => r.status === 200).length;
      const rateLimited = responses.filter((r) => r.status === 429).length;

      // Max is 4, so exactly 4 should succeed and 2 should be blocked with 429
      expect(successful).toBe(4);
      expect(rateLimited).toBe(2);

      // Verify MongoDB bucket document integrity
      const bucket = await RateLimitBucket.findOne({ key: concurrentIp });
      expect(bucket).toBeDefined();
      expect(bucket.hits).toBeGreaterThanOrEqual(4);
    });

    it('should verify RateLimitBucket schema has TTL index for automatic expiration', async () => {
      const indexes = RateLimitBucket.schema.indexes();
      const hasTtlIndex = indexes.some(
        ([fields, options]) => fields.resetTime === 1 && options.expireAfterSeconds === 0
      );
      expect(hasTtlIndex).toBe(true);
    });

    it('should fail open safely if MongoDB operation throws an error during rate limit check', async () => {
      const store = new MongoRateLimitStore();
      const originalFindOneAndUpdate = RateLimitBucket.findOneAndUpdate;

      // Mock database failure
      RateLimitBucket.findOneAndUpdate = () => {
        throw new Error('Database connection lost');
      };

      const result = await store.increment('error-test-ip');
      expect(result.totalHits).toBe(1);
      expect(result.resetTime).toBeInstanceOf(Date);

      // Restore
      RateLimitBucket.findOneAndUpdate = originalFindOneAndUpdate;
    });
  });

  // =========================================================================
  // 2. HEALTH PROBES & DEPENDENCY OBSERVABILITY
  // =========================================================================
  describe('2. Health Probes & Dependency Observability', () => {
    it('GET /api/v1/health should respond 200 with liveness status independent of database', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UP');
      expect(res.body.data.uptime).toBeDefined();
      expect(res.body.data.version).toBe('1.0.0');

      // Security check: Must never leak DB URI or env secrets
      expect(JSON.stringify(res.body)).not.toContain('mongodb');
      expect(JSON.stringify(res.body)).not.toContain('password');
      expect(JSON.stringify(res.body)).not.toContain('secret');
    });

    it('GET /api/v1/health/liveness should respond 200 on liveness alias', async () => {
      const res = await request(app).get('/api/v1/health/liveness');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('UP');
    });

    it('GET /api/v1/health/readiness should respond 200 with CONNECTED state when database is ready', async () => {
      const res = await request(app).get('/api/v1/health/readiness');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('READY');
      expect(res.body.data.database).toBe('CONNECTED');
    });

    it('GET /api/v1/health/ready should respond 200 on ready alias', async () => {
      const res = await request(app).get('/api/v1/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('READY');
    });
  });

  // =========================================================================
  // 3. STRUCTURED LOGGING & SENSITIVE CREDENTIAL MASKING
  // =========================================================================
  describe('3. Structured Logging & Sensitive Credential Masking', () => {
    it('should sanitize all sensitive authentication and payment credentials recursively', () => {
      const sensitivePayload = {
        email: 'customer@example.in',
        password: 'SuperSecretPassword123!',
        token: 'jwt.access.token.string',
        refreshToken: 'refresh.token.uuid',
        authorization: 'Bearer secret-jwt',
        cookie: 'sessionId=secret-session',
        cvv: '123',
        cardNumber: '4111222233334444',
        razorpay_signature: 'abc123hmacsignature',
        key_secret: 'razorpay_secret_key',
        nested: {
          client_secret: 'oauth-secret-key',
          safeField: 'visible-value'
        }
      };

      const sanitized = sanitize(sensitivePayload);

      expect(sanitized.email).toBe('customer@example.in');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.refreshToken).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.cookie).toBe('[REDACTED]');
      expect(sanitized.cvv).toBe('[REDACTED]');
      expect(sanitized.cardNumber).toBe('[REDACTED]');
      expect(sanitized.razorpay_signature).toBe('[REDACTED]');
      expect(sanitized.key_secret).toBe('[REDACTED]');
      expect(sanitized.nested.client_secret).toBe('[REDACTED]');
      expect(sanitized.nested.safeField).toBe('visible-value');
    });
  });

  // =========================================================================
  // 4. SENTRY MONITORING INTEGRATION ADAPTER
  // =========================================================================
  describe('4. Sentry Monitoring Integration Adapter', () => {
    it('should safely no-op without throwing when SENTRY_DSN is absent', () => {
      const initResult = initSentry(app);
      expect(initResult.status).toBe('disabled');

      const captureResult = captureException(new Error('Sample test error'));
      expect(captureResult.captured).toBe(false);
      expect(captureResult.reason).toBe('Sentry not initialized');

      const msgResult = captureMessage('Test informational log');
      expect(msgResult.captured).toBe(false);
    });

    it('should correctly report isSentryConfigured as false when DSN is unset', () => {
      expect(isSentryConfigured()).toBe(false);
    });
  });

  // =========================================================================
  // 5. TECHNICAL SEO, DYNAMIC SITEMAP & ROBOTS DIRECTIVES
  // =========================================================================
  describe('5. Technical SEO, Dynamic Sitemap & Robots Directives', () => {
    it('GET /sitemap.xml and GET /api/v1/content/sitemap.xml should return valid XML containing published entities', async () => {
      const res = await request(app).get('/sitemap.xml');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/xml');

      const xml = res.text;
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

      // Core public pages must be present
      expect(xml).toContain('<loc>https://aura-storefront.netlify.app/</loc>');
      expect(xml).toContain('<loc>https://aura-storefront.netlify.app/products</loc>');
      expect(xml).toContain('<loc>https://aura-storefront.netlify.app/faqs</loc>');

      // Published Product must be present
      expect(xml).toContain(testProduct.slug);

      // Published Category must be present
      expect(xml).toContain(testCategory.slug);

      // Published Content Page must be present
      expect(xml).toContain(testPage.slug);

      // Private and Admin routes must NEVER be included in sitemap
      expect(xml).not.toContain('/admin');
      expect(xml).not.toContain('/checkout');
      expect(xml).not.toContain('/cart');
      expect(xml).not.toContain('/account');
    });

    it('GET /robots.txt should return proper crawler directives and disallow private surfaces', async () => {
      const res = await request(app).get('/robots.txt');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');

      const robots = res.text;
      expect(robots).toContain('User-agent: *');
      expect(robots).toContain('Allow: /');
      expect(robots).toContain('Disallow: /admin');
      expect(robots).toContain('Disallow: /account');
      expect(robots).toContain('Disallow: /checkout');
      expect(robots).toContain('Disallow: /cart');
      expect(robots).toContain('Disallow: /wishlist');
      expect(robots).toContain('Sitemap: https://aura-storefront.netlify.app/sitemap.xml');
    });
  });

  // =========================================================================
  // 6. PRODUCTION SECURITY REGRESSION CHECKS
  // =========================================================================
  describe('6. Production Security Regression Checks', () => {
    it('should map unhandled syntax errors cleanly to 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalidJson": ...}');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('BAD_REQUEST');
      expect(res.body.message).toContain('Malformed JSON');
    });

    it('should protect against NoSQL operator injection in query parameters', async () => {
      const res = await request(app).get('/api/v1/storefront/products?category[$gt]=');
      expect(res.status).toBeLessThan(500);
    });

    it('should enforce rate limiting protection on checkout quote', async () => {
      // In test mode, requests with x-test-rate-limit trigger the rate limiter
      const res = await request(app)
        .post('/api/v1/checkout/quote')
        .set('x-test-rate-limit', 'true')
        .send({ items: [] });

      // Handled with standard headers
      expect(res.headers['ratelimit-limit']).toBeDefined();
    });
  });
});
