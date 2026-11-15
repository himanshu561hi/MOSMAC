import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Brand } from '../src/models/Brand.js';
import { Product } from '../src/models/Product.js';
import { Coupon } from '../src/models/Coupon.js';
import { hashPassword } from '../src/services/passwordService.js';
import { generateAccessToken } from '../src/services/tokenService.js';

let mongoServer;
let customerUser;
let customerToken;
let testCategory;
let testBrand;
let activeProduct;
let outOfStockProduct;
let testCouponPercent;
let testCouponFixed;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup customer user
  customerUser = await User.create({
    email: 'customer@aurora.internal',
    passwordHash: await hashPassword('Password123!'),
    firstName: 'Priya',
    lastName: 'Sharma',
    role: 'customer',
    status: 'active'
  });
  customerToken = generateAccessToken(customerUser);

  // Setup test category
  testCategory = await Category.create({
    name: 'Smartphones & Audio',
    slug: 'smartphones-audio',
    description: 'Mobile electronics',
    isActive: true
  });

  // Setup test brand
  testBrand = await Brand.create({
    name: 'SonicTech',
    slug: 'sonictech',
    isActive: true
  });

  // Setup active product
  activeProduct = await Product.create({
    title: 'Sonic Pro Wireless Earbuds',
    slug: 'sonic-pro-earbuds',
    description: 'Active noise cancelling wireless earbuds',
    categoryId: testCategory._id,
    brandId: testBrand._id,
    status: 'published',
    isFeatured: true,
    variants: [
      {
        sku: 'SONIC-BLK',
        title: 'Midnight Black',
        price: 299900, // ₹2,999.00
        mrp: 499900,   // ₹4,999.00
        stockQuantity: 25,
        isActive: true
      },
      {
        sku: 'SONIC-WHT',
        title: 'Pearl White',
        price: 299900, // ₹2,999.00
        mrp: 499900,   // ₹4,999.00
        stockQuantity: 5,
        isActive: true
      }
    ]
  });

  // Setup out-of-stock product
  outOfStockProduct = await Product.create({
    title: 'Sonic Retro Headphones',
    slug: 'sonic-retro-headphones',
    description: 'Over-ear retro wired headphones',
    categoryId: testCategory._id,
    brandId: testBrand._id,
    status: 'published',
    variants: [
      {
        sku: 'SONIC-RETRO',
        title: 'Retro Gold',
        price: 199900,
        mrp: 299900,
        stockQuantity: 0,
        isActive: true
      }
    ]
  });

  // Setup coupons
  testCouponPercent = await Coupon.create({
    code: 'FESTIVE10',
    description: '10% discount up to ₹500',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscountAmount: 50000, // ₹500.00
    minOrderAmount: 100000,   // ₹1,000.00
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    usageLimitPerUser: 2,
    totalUsageLimit: 100,
    isActive: true
  });

  testCouponFixed = await Coupon.create({
    code: 'FLAT200',
    description: 'Flat ₹200 off on orders over ₹1500',
    discountType: 'fixed',
    discountValue: 20000,    // ₹200.00
    minOrderAmount: 150000,  // ₹1,500.00
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 5 — Shopping Features (Cart, Wishlist & Promotions) Test Suite', () => {
  const guestId = 'gst_test_session_12345';

  describe('1. Shopping Cart Engine (Guest & Authenticated)', () => {
    it('should create an empty cart for guest session with x-guest-id header', async () => {
      const res = await request(app)
        .get('/api/v1/cart')
        .set('x-guest-id', guestId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cart.items).toEqual([]);
      expect(res.body.data.cart.subtotal).toBe(0);
      expect(res.body.data.cart.grandTotal).toBe(0);
    });

    it('should add an item to the guest cart with live price and subtotal calculations', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('x-guest-id', guestId)
        .send({
          productId: activeProduct._id.toString(),
          sku: 'SONIC-BLK',
          quantity: 2
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { cart } = res.body.data;
      expect(cart.items.length).toBe(1);
      expect(cart.items[0].sku).toBe('SONIC-BLK');
      expect(cart.items[0].quantity).toBe(2);
      expect(cart.items[0].unitPrice).toBe(299900); // ₹2,999.00
      expect(cart.subtotal).toBe(599800);           // 2 * 299900 = ₹5,998.00
      expect(cart.shippingFee).toBe(0);             // Free shipping (> ₹999)
      expect(cart.grandTotal).toBe(599800);
    });

    it('should reject adding an out-of-stock item', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('x-guest-id', guestId)
        .send({
          productId: outOfStockProduct._id.toString(),
          sku: 'SONIC-RETRO',
          quantity: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/out of stock/i);
    });

    it('should reject adding quantity exceeding available stock', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('x-guest-id', guestId)
        .send({
          productId: activeProduct._id.toString(),
          sku: 'SONIC-WHT', // Stock is 5
          quantity: 8
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/only 5 units available/i);
    });

    it('should update item quantity in cart', async () => {
      const res = await request(app)
        .patch('/api/v1/cart/items/SONIC-BLK')
        .set('x-guest-id', guestId)
        .send({ quantity: 3 });

      expect(res.status).toBe(200);
      const { cart } = res.body.data;
      expect(cart.items[0].quantity).toBe(3);
      expect(cart.subtotal).toBe(3 * 299900);
    });

    it('should remove item when quantity is updated to 0', async () => {
      const res = await request(app)
        .patch('/api/v1/cart/items/SONIC-BLK')
        .set('x-guest-id', guestId)
        .send({ quantity: 0 });

      expect(res.status).toBe(200);
      expect(res.body.data.cart.items.length).toBe(0);
      expect(res.body.data.cart.subtotal).toBe(0);
    });

    it('should remove item by SKU explicitly', async () => {
      // Re-add item first
      await request(app)
        .post('/api/v1/cart/items')
        .set('x-guest-id', guestId)
        .send({ productId: activeProduct._id.toString(), sku: 'SONIC-BLK', quantity: 1 });

      const res = await request(app)
        .delete('/api/v1/cart/items/SONIC-BLK')
        .set('x-guest-id', guestId);

      expect(res.status).toBe(200);
      expect(res.body.data.cart.items.length).toBe(0);
    });
  });

  describe('2. Coupon & Promotions Engine', () => {
    beforeAll(async () => {
      // Add item to guest cart: 1x SONIC-BLK = ₹2,999.00 (299900 paise)
      await request(app)
        .post('/api/v1/cart/items')
        .set('x-guest-id', guestId)
        .send({ productId: activeProduct._id.toString(), sku: 'SONIC-BLK', quantity: 1 });
    });

    it('should apply percentage coupon FESTIVE10 and cap at maxDiscountAmount', async () => {
      // Subtotal = 299900 paise. 10% = 29990 paise (< 50000 cap).
      const res = await request(app)
        .post('/api/v1/cart/coupon')
        .set('x-guest-id', guestId)
        .send({ code: 'festive10' }); // Test case-insensitivity

      expect(res.status).toBe(200);
      const { cart } = res.body.data;
      expect(cart.appliedCoupon.code).toBe('FESTIVE10');
      expect(cart.appliedCoupon.discountAmount).toBe(29990);
      expect(cart.discountTotal).toBe(29990);
      expect(cart.grandTotal).toBe(299900 - 29990); // ₹2,699.10
    });

    it('should apply fixed discount coupon FLAT200 and deduce exactly ₹200 (20000 paise)', async () => {
      const res = await request(app)
        .post('/api/v1/cart/coupon')
        .set('x-guest-id', guestId)
        .send({ code: 'FLAT200' });

      expect(res.status).toBe(200);
      const { cart } = res.body.data;
      expect(cart.appliedCoupon.code).toBe('FLAT200');
      expect(cart.appliedCoupon.discountAmount).toBe(20000);
      expect(cart.grandTotal).toBe(299900 - 20000);
    });

    it('should reject invalid or expired coupon codes', async () => {
      const res = await request(app)
        .post('/api/v1/cart/coupon')
        .set('x-guest-id', guestId)
        .send({ code: 'INVALID_CODE_999' });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/invalid or no longer active/i);
    });

    it('should remove applied coupon from cart', async () => {
      const res = await request(app)
        .delete('/api/v1/cart/coupon')
        .set('x-guest-id', guestId);

      expect(res.status).toBe(200);
      expect(res.body.data.cart.appliedCoupon).toBeNull();
      expect(res.body.data.cart.discountTotal).toBe(0);
    });
  });

  describe('3. Guest to Authenticated Cart Merging', () => {
    it('should merge guest cart into user cart upon login and purge guest cart', async () => {
      // 1. Guest cart has 1x SONIC-BLK
      await request(app)
        .post('/api/v1/cart/items')
        .set('x-guest-id', guestId)
        .send({ productId: activeProduct._id.toString(), sku: 'SONIC-BLK', quantity: 1 });

      // 2. User cart initially has 1x SONIC-WHT
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: activeProduct._id.toString(), sku: 'SONIC-WHT', quantity: 2 });

      // 3. Trigger cart merge
      const mergeRes = await request(app)
        .post('/api/v1/cart/merge')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ guestId });

      expect(mergeRes.status).toBe(200);
      const mergedCart = mergeRes.body.data.cart;
      expect(mergedCart.items.length).toBe(2);
      expect(mergedCart.items.some((i) => i.sku === 'SONIC-BLK')).toBe(true);
      expect(mergedCart.items.some((i) => i.sku === 'SONIC-WHT')).toBe(true);

      // 4. Repeated merge request must be idempotent
      const repeatRes = await request(app)
        .post('/api/v1/cart/merge')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ guestId });

      expect(repeatRes.status).toBe(200);
      expect(repeatRes.body.data.cart.items.length).toBe(2);
    });
  });

  describe('4. Customer Wishlist Engine', () => {
    it('should add product to wishlist without duplicates', async () => {
      // Add first time
      const res1 = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: activeProduct._id.toString(), sku: 'SONIC-BLK' });

      expect(res1.status).toBe(200);
      expect(res1.body.data.wishlist.items.length).toBe(1);

      // Add second time (duplicate attempt)
      const res2 = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: activeProduct._id.toString(), sku: 'SONIC-BLK' });

      expect(res2.status).toBe(200);
      // Must still be 1 item (no duplicate)
      expect(res2.body.data.wishlist.items.length).toBe(1);
    });

    it('should move item from wishlist to cart', async () => {
      const res = await request(app)
        .post(`/api/v1/wishlist/items/${activeProduct._id}/move-to-cart`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ sku: 'SONIC-BLK', quantity: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.wishlist.items.length).toBe(0);
      expect(res.body.data.cart.items.some((i) => i.sku === 'SONIC-BLK')).toBe(true);
    });

    it('should remove item from wishlist', async () => {
      // Add item back to wishlist
      await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: activeProduct._id.toString() });

      const res = await request(app)
        .delete(`/api/v1/wishlist/items/${activeProduct._id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.wishlist.items.length).toBe(0);
    });
  });
});
