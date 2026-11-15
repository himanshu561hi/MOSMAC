import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { Brand } from '../src/models/Brand.js';
import { Order } from '../src/models/Order.js';
import { Banner } from '../src/models/Banner.js';
import { HomepageSection } from '../src/models/HomepageSection.js';
import { ContentPage } from '../src/models/ContentPage.js';
import { FAQ } from '../src/models/FAQ.js';
import { Review } from '../src/models/Review.js';
import { StoreSettings } from '../src/models/StoreSettings.js';
import { MediaAsset } from '../src/models/MediaAsset.js';
import { generateAccessToken } from '../src/services/tokenService.js';
import { hashPassword } from '../src/services/passwordService.js';

let mongoServer;
let superAdminUser, superAdminToken;
let customerUser, customerToken;
let customerUser2, customerToken2;
let testCategory, testBrand, testProduct;
let deliveredOrder;

describe('Phase 8 — CMS, Content & Storefront Customization Test Suite', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const defaultPwdHash = await hashPassword('Password123!');

    // Create Super Admin
    superAdminUser = await User.create({
      email: 'admin.cms@example.in',
      passwordHash: defaultPwdHash,
      firstName: 'Ananya',
      lastName: 'Roy',
      phone: '9876543220',
      role: 'super_admin',
      status: 'active',
      isEmailVerified: true
    });
    superAdminToken = generateAccessToken(superAdminUser);

    // Create Eligible Customer
    customerUser = await User.create({
      email: 'buyer.cms@example.in',
      passwordHash: defaultPwdHash,
      firstName: 'Kabir',
      lastName: 'Sen',
      phone: '9876543221',
      role: 'customer',
      status: 'active',
      isEmailVerified: true
    });
    customerToken = generateAccessToken(customerUser);

    // Create Non-Eligible Customer
    customerUser2 = await User.create({
      email: 'other.cms@example.in',
      passwordHash: defaultPwdHash,
      firstName: 'Dia',
      lastName: 'Mirza',
      phone: '9876543222',
      role: 'customer',
      status: 'active',
      isEmailVerified: true
    });
    customerToken2 = generateAccessToken(customerUser2);

    // Create Category & Brand
    testCategory = await Category.create({
      name: 'Electronics CMS',
      slug: 'electronics-cms',
      isActive: true
    });

    testBrand = await Brand.create({
      name: 'SonicTech',
      slug: 'sonictech',
      isActive: true
    });

    // Create Product
    testProduct = await Product.create({
      title: 'Sonic Pro Wireless Earbuds',
      slug: 'sonic-pro-wireless-earbuds',
      description: 'Premium active noise cancelling earbuds',
      categoryId: testCategory._id,
      brandId: testBrand._id,
      basePrice: 299900,
      baseMrp: 499900,
      status: 'published',
      hasVariants: false,
      variants: [
        {
          sku: 'SONIC-PRO-BLK',
          title: 'Default Black',
          price: 299900,
          mrp: 499900,
          stockQuantity: 50,
          isActive: true
        }
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/earbuds.jpg',
          alt: 'Sonic Pro Earbuds',
          isPrimary: true
        }
      ],
      ratings: {
        average: 0,
        count: 0
      }
    });

    // Create Delivered Order for customerUser containing testProduct SKU
    deliveredOrder = await Order.create({
      orderNumber: 'ORD-CMS-1001',
      userId: customerUser._id,
      customer: {
        firstName: 'Kabir',
        lastName: 'Sen',
        email: 'buyer.cms@example.in',
        phone: '9876543221'
      },
      items: [
        {
          productId: testProduct._id,
          sku: 'SONIC-PRO-BLK',
          title: testProduct.title,
          unitPrice: 299900,
          mrp: 499900,
          quantity: 1,
          itemTotal: 299900,
          totalPrice: 299900,
          isReturnable: true
        }
      ],
      shippingAddress: {
        fullName: 'Kabir Sen',
        phone: '9876543221',
        addressLine1: 'Flat 402, Lotus Towers',
        addressLine2: 'Andheri West',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India'
      },
      billingAddress: {
        fullName: 'Kabir Sen',
        phone: '9876543221',
        addressLine1: 'Flat 402, Lotus Towers',
        addressLine2: 'Andheri West',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India'
      },
      pricing: {
        subtotal: 299900,
        discountTotal: 0,
        shippingFee: 0,
        taxTotal: 53982,
        grandTotal: 299900
      },
      paymentMethod: 'razorpay',
      paymentStatus: 'captured',
      orderStatus: 'delivered',
      deliveredAt: new Date()
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // =========================================================================
  // 1. BANNER MANAGEMENT
  // =========================================================================
  describe('1. Banners Management', () => {
    let createdBannerId;

    it('should allow admin to create a hero banner with safe CTA url', async () => {
      const res = await request(app)
        .post('/api/v1/admin/cms/banners')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Festival Mega Sale',
          subtitle: 'Up to 50% Off Electronics',
          bannerType: 'hero',
          desktopImageUrl: 'https://res.cloudinary.com/demo/image/upload/hero-fest.jpg',
          mobileImageUrl: 'https://res.cloudinary.com/demo/image/upload/hero-fest-mob.jpg',
          altText: 'Festival Mega Sale Banner',
          ctaLabel: 'Shop Now',
          ctaDestination: '/categories/electronics-cms',
          displayOrder: 1,
          isActive: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.banner.title).toBe('Festival Mega Sale');
      expect(res.body.data.banner.bannerType).toBe('hero');
      createdBannerId = res.body.data.banner._id;
    });

    it('should reject banner creation with unsafe javascript: CTA url', async () => {
      const res = await request(app)
        .post('/api/v1/admin/cms/banners')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Malicious Banner',
          bannerType: 'hero',
          desktopImageUrl: 'https://res.cloudinary.com/demo/image/upload/hero.jpg',
          ctaDestination: 'javascript:alert("pwned")',
          displayOrder: 2
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should list active banners publicly on storefront', async () => {
      const res = await request(app).get('/api/v1/content/banners?type=hero');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.banners)).toBe(true);
      expect(res.body.data.banners.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.banners[0].title).toBe('Festival Mega Sale');
    });

    it('should allow admin to update and toggle banner', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/cms/banners/${createdBannerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          subtitle: 'Exclusive 60% Clearance Today',
          isActive: false
        });

      expect(res.status).toBe(200);
      expect(res.body.data.banner.subtitle).toBe('Exclusive 60% Clearance Today');
      expect(res.body.data.banner.isActive).toBe(false);

      // Now it should NOT show in public list
      const pubRes = await request(app).get('/api/v1/content/banners?type=hero');
      const found = pubRes.body.data.banners.find((b) => b._id === createdBannerId);
      expect(found).toBeUndefined();

      // Reactivate for further tests
      await request(app)
        .patch(`/api/v1/admin/cms/banners/${createdBannerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: true });
    });
  });

  // =========================================================================
  // 2. HOMEPAGE BUILDER & SECTIONS
  // =========================================================================
  describe('2. Homepage Builder & Section Orchestration', () => {
    let section1Id, section2Id;

    it('should allow admin to create dynamic homepage sections', async () => {
      const res1 = await request(app)
        .post('/api/v1/admin/cms/homepage')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          sectionType: 'hero_banner',
          title: 'Main Hero Carousel',
          displayOrder: 1,
          isActive: true
        });

      expect(res1.status).toBe(201);
      section1Id = res1.body.data.section._id;

      const res2 = await request(app)
        .post('/api/v1/admin/cms/homepage')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          sectionType: 'featured_products',
          title: 'Editor Choice Deals',
          subtitle: 'Handpicked gadgets for tech lovers',
          displayOrder: 2,
          isActive: true,
          config: {
            limit: 4,
            layoutType: 'grid'
          }
        });

      expect(res2.status).toBe(201);
      section2Id = res2.body.data.section._id;
    });

    it('should allow admin to reorder sections in batch', async () => {
      const res = await request(app)
        .post('/api/v1/admin/cms/homepage/reorder')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          sections: [
            { id: section2Id, displayOrder: 1 },
            { id: section1Id, displayOrder: 2 }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sections[0]._id.toString()).toBe(section2Id.toString());
      expect(res.body.data.sections[0].displayOrder).toBe(1);
    });

    it('should retrieve hydrated dynamic homepage layout publicly', async () => {
      const res = await request(app).get('/api/v1/content/homepage');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.sections)).toBe(true);
      expect(res.body.data.sections.length).toBeGreaterThanOrEqual(2);
      // Verify first section is Editor Choice Deals
      expect(res.body.data.sections[0].title).toBe('Editor Choice Deals');
    });
  });

  // =========================================================================
  // 3. CONTENT PAGES & HTML SANITIZATION
  // =========================================================================
  describe('3. Content Pages CMS & Security Sanitization', () => {
    let createdPageId;

    it('should create content page and sanitize malicious scripts and event handlers', async () => {
      const maliciousHtml = `
        <h1>About Our Company</h1>
        <p>We deliver quality items with <strong>safe shipping</strong>.</p>
        <script>window.__token = localStorage.getItem('token');</script>
        <img src="valid.jpg" onerror="alert(document.cookie)" />
        <a href="javascript:alert(1)">Click free voucher</a>
        <a href="https://example.com/legit">Legit link</a>
      `;

      const res = await request(app)
        .post('/api/v1/admin/cms/pages')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'About Us',
          slug: 'about-us',
          content: maliciousHtml,
          seoTitle: 'About Us | Premium Store',
          seoDescription: 'Learn more about our mission and journey',
          status: 'published'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const content = res.body.data.page.content;
      // Script tags must be stripped
      expect(content).not.toContain('<script>');
      expect(content).not.toContain('window.__token');
      // Onerror inline handler must be stripped
      expect(content).not.toContain('onerror=');
      // Javascript pseudo-protocol must be stripped
      expect(content).not.toContain('javascript:');
      // Legitimate safe tags and links must remain
      expect(content).toContain('<h1>About Our Company</h1>');
      expect(content).toContain('<strong>safe shipping</strong>');
      expect(content).toContain('https://example.com/legit');

      createdPageId = res.body.data.page._id;
    });

    it('should reject creation of content page with duplicate slug', async () => {
      const res = await request(app)
        .post('/api/v1/admin/cms/pages')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'About Us Duplicate',
          slug: 'about-us',
          content: '<p>Duplicate content</p>',
          status: 'draft'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should serve published page publicly and record revisions on update', async () => {
      // Public access
      const pubRes = await request(app).get('/api/v1/content/pages/about-us');
      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.page.title).toBe('About Us');

      // Update page
      const updateRes = await request(app)
        .patch(`/api/v1/admin/cms/pages/${createdPageId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'About Our Mission',
          changeSummary: 'Updated title to mission statement'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.page.title).toBe('About Our Mission');
      expect(updateRes.body.data.page.revisions.length).toBeGreaterThanOrEqual(1);
      expect(updateRes.body.data.page.revisions[0].changeSummary).toBe('Updated title to mission statement');
    });

    it('should return 404 for draft page on public storefront', async () => {
      // Create draft page
      await request(app)
        .post('/api/v1/admin/cms/pages')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Internal Secret Roadmap',
          slug: 'internal-secret-roadmap',
          content: '<p>Secret plans</p>',
          status: 'draft'
        });

      const res = await request(app).get('/api/v1/content/pages/internal-secret-roadmap');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 4. FAQ MANAGEMENT
  // =========================================================================
  describe('4. FAQ Management & Public Accordion', () => {
    let faqId;

    it('should allow admin to create categorised FAQs', async () => {
      const res = await request(app)
        .post('/api/v1/admin/cms/faqs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          question: 'What is your standard delivery timeline in India?',
          answer: 'We deliver across India within 3 to 5 business days via premium air courier.',
          category: 'Shipping & Delivery',
          displayOrder: 1,
          isActive: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.faq.category).toBe('Shipping & Delivery');
      faqId = res.body.data.faq._id;

      await request(app)
        .post('/api/v1/admin/cms/faqs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          question: 'Can I pay via Cash on Delivery?',
          answer: 'Yes, COD is supported on orders up to ₹5,000 for verified pincodes.',
          category: 'Payments',
          displayOrder: 1,
          isActive: true
        });
    });

    it('should list public FAQs grouped by category', async () => {
      const res = await request(app).get('/api/v1/content/faqs');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.groupedFaqs).toBeDefined();
      expect(res.body.data.groupedFaqs['Shipping & Delivery']).toBeDefined();
      expect(res.body.data.groupedFaqs['Payments']).toBeDefined();
      expect(res.body.data.groupedFaqs['Shipping & Delivery'][0].question).toContain('standard delivery timeline');
    });
  });

  // =========================================================================
  // 5. VERIFIED PRODUCT REVIEWS & MODERATION LIFECYCLE
  // =========================================================================
  describe('5. Verified Purchaser Product Reviews & Moderation', () => {
    let submittedReviewId;

    it('should verify customer review eligibility correctly', async () => {
      // customerUser has delivered order for testProduct SKU
      const eligibleRes = await request(app)
        .get(`/api/v1/products/${testProduct._id}/reviews/eligibility?sku=SONIC-PRO-BLK`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(eligibleRes.status).toBe(200);
      expect(eligibleRes.body.data.isEligible).toBe(true);
      expect(eligibleRes.body.data.orderId).toBe(deliveredOrder._id.toString());

      // customerUser2 has NO order for this product
      const ineligibleRes = await request(app)
        .get(`/api/v1/products/${testProduct._id}/reviews/eligibility?sku=SONIC-PRO-BLK`)
        .set('Authorization', `Bearer ${customerToken2}`);

      expect(ineligibleRes.status).toBe(200);
      expect(ineligibleRes.body.data.isEligible).toBe(false);
      expect(ineligibleRes.body.data.reason).toBe('VERIFIED_PURCHASE_REQUIRED');
    });

    it('should reject review submission from non-purchaser', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProduct._id}/reviews`)
        .set('Authorization', `Bearer ${customerToken2}`)
        .send({
          sku: 'SONIC-PRO-BLK',
          rating: 5,
          title: 'Fake Review',
          comment: 'Never bought this but it looks cool'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should accept review submission from verified purchaser with pending status', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProduct._id}/reviews`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          sku: 'SONIC-PRO-BLK',
          rating: 5,
          title: 'Outstanding sound quality and deep bass!',
          comment: 'Comfortable to wear for long sessions. Battery life easily lasts 30+ hours.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.review.status).toBe('pending');
      expect(res.body.data.review.verifiedPurchase).toBe(true);
      submittedReviewId = res.body.data.review._id;
    });

    it('should reject duplicate review for same product by same customer', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProduct._id}/reviews`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          sku: 'SONIC-PRO-BLK',
          rating: 4,
          title: 'Second review attempt',
          comment: 'Trying to review again'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already submitted a review');
    });

    it('should NOT show pending review on public PDP and keep product rating 0', async () => {
      const res = await request(app).get(`/api/v1/products/${testProduct._id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalReviews).toBe(0);
      expect(res.body.data.reviews.length).toBe(0);

      const prod = await Product.findById(testProduct._id);
      expect(prod.ratings.count).toBe(0);
      expect(prod.ratings.average).toBe(0);
    });

    it('should list pending reviews in admin moderation queue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reviews?status=pending')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const found = res.body.data.reviews.find((r) => r._id === submittedReviewId);
      expect(found).toBeDefined();
      expect(found.status).toBe('pending');
    });

    it('should approve review and atomically recalculate product ratings', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/reviews/${submittedReviewId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'approved',
          moderationNote: 'Verified purchaser review meets community guidelines'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.review.status).toBe('approved');

      // Product ratings should now be count: 1, average: 5
      const prod = await Product.findById(testProduct._id);
      expect(prod.ratings.count).toBe(1);
      expect(prod.ratings.average).toBe(5);

      // Public PDP reviews should now return approved review with star breakdown
      const pubRes = await request(app).get(`/api/v1/products/${testProduct._id}/reviews`);
      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.totalReviews).toBe(1);
      expect(pubRes.body.data.averageRating).toBe(5);
      expect(pubRes.body.data.starDistribution['5']).toBe(1);
      expect(pubRes.body.data.reviews[0].verifiedPurchase).toBe(true);
    });
  });

  // =========================================================================
  // 6. STORE SETTINGS & NAVIGATION
  // =========================================================================
  describe('6. Store Settings & Navigation Management', () => {
    it('should allow admin to update store settings and business rules', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/cms/settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          storeName: 'Aura Premium Commerce',
          tagline: 'Modern General E-Commerce Store',
          supportEmail: 'support@aurastore.in',
          supportPhone: '+91-9876543210',
          shippingPolicy: {
            flatRate: 4900,
            freeShippingThreshold: 99900,
            estimatedDeliveryDaysMin: 3,
            estimatedDeliveryDaysMax: 5
          },
          codSettings: {
            isEnabled: true,
            maxOrderAmount: 500000
          },
          headerNavigation: [
            { label: 'Shop All', link: '/shop', displayOrder: 1, isExternal: false },
            { label: 'Deals', link: '/deals', displayOrder: 2, isExternal: false }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.settings.storeName).toBe('Aura Premium Commerce');
      expect(res.body.data.settings.shipping.flatRate).toBe(4900);
    });

    it('should serve sanitized public store settings omitting sensitive internals', async () => {
      const res = await request(app).get('/api/v1/content/settings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.settings.storeName).toBe('Aura Premium Commerce');
      expect(res.body.data.settings.shipping.freeShippingThreshold).toBe(99900);
      expect(res.body.data.settings.headerNavigation.length).toBe(2);
    });
  });

  // =========================================================================
  // 7. NOTIFICATION TEMPLATES
  // =========================================================================
  describe('7. Transactional Notification Templates', () => {
    it('should list seeded notification templates', async () => {
      const res = await request(app)
        .get('/api/v1/admin/cms/templates')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.templates)).toBe(true);
      expect(res.body.data.templates.length).toBeGreaterThanOrEqual(5);

      const orderConf = res.body.data.templates.find((t) => t.type.toLowerCase().includes('order_confirmation'));
      expect(orderConf).toBeDefined();
    });

    it('should preview notification template with variable substitution', async () => {
      const res = await request(app)
        .post('/api/v1/admin/cms/templates/order_confirmation/preview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          sampleVariables: {
            customerName: 'Aarav Patel',
            orderNumber: 'ORD-PREVIEW-999',
            grandTotal: '₹2,999',
            storeName: 'Aura Commerce'
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.preview.renderedSubject).toContain('ORD-PREVIEW-999');
      expect(res.body.data.preview.renderedBody).toContain('Aarav Patel');
    });
  });

  // =========================================================================
  // 8. MEDIA ASSET REGISTRY & SAFETY CHECKS
  // =========================================================================
  describe('8. Media Asset Registry & Reference Safety Checks', () => {
    let createdAssetId;

    it('should register uploaded media asset', async () => {
      const res = await request(app)
        .post('/api/v1/media/assets')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          publicId: 'ecom/banners/hero-spring',
          url: 'http://res.cloudinary.com/demo/image/upload/hero-spring.jpg',
          secureUrl: 'https://res.cloudinary.com/demo/image/upload/hero-spring.jpg',
          format: 'jpg',
          bytes: 204800,
          width: 1920,
          height: 600,
          altText: 'Spring Banner',
          folder: 'banners'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.asset.publicId).toBe('ecom/banners/hero-spring');
      createdAssetId = res.body.data.asset._id;
    });

    it('should list media assets with search and pagination', async () => {
      const res = await request(app)
        .get('/api/v1/media/assets?folder=banners')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assets.length).toBeGreaterThanOrEqual(1);
    });

    it('should prevent deletion of media asset in active use without force flag', async () => {
      // Create media asset with URL currently used by testProduct
      const inUseAsset = await MediaAsset.create({
        publicId: 'ecom/products/earbuds',
        url: 'https://res.cloudinary.com/demo/image/upload/earbuds.jpg',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/earbuds.jpg',
        format: 'jpg',
        bytes: 102400,
        width: 800,
        height: 800,
        altText: 'Sonic Pro Earbuds',
        folder: 'products',
        uploadedBy: superAdminUser._id
      });

      const res = await request(app)
        .delete(`/api/v1/media/assets/${inUseAsset._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('in use');
    });

    it('should allow deletion of unused media asset', async () => {
      const res = await request(app)
        .delete(`/api/v1/media/assets/${createdAssetId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
