import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { Brand } from '../src/models/Brand.js';
import { Coupon } from '../src/models/Coupon.js';
import { Order } from '../src/models/Order.js';
import { Payment } from '../src/models/Payment.js';
import { Address } from '../src/models/Address.js';
import { InventoryReservation } from '../src/models/InventoryReservation.js';
import { generateAccessToken } from '../src/services/tokenService.js';
import { hashPassword } from '../src/services/passwordService.js';
import env from '../src/config/env.js';

let mongoServer;
let customerUser, customerToken;
let otherCustomerUser, otherCustomerToken;
let adminUser, adminToken;
let category, brand, product;

describe('Phase 6 — Checkout, Payments & Order Lifecycle Test Suite', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const defaultPwdHash = await hashPassword('Password123!');

    // Create test customer
    customerUser = await User.create({
      email: 'customer.phase6@example.in',
      passwordHash: defaultPwdHash,
      firstName: 'Aarav',
      lastName: 'Sharma',
      phone: '9876543210',
      role: 'customer',
      status: 'active'
    });
    customerToken = generateAccessToken(customerUser);

    // Create another customer for IDOR checks
    otherCustomerUser = await User.create({
      email: 'other.customer@example.in',
      passwordHash: defaultPwdHash,
      firstName: 'Priya',
      lastName: 'Patel',
      phone: '9876543211',
      role: 'customer',
      status: 'active'
    });
    otherCustomerToken = generateAccessToken(otherCustomerUser);

    // Create super admin
    adminUser = await User.create({
      email: 'admin.phase6@example.in',
      passwordHash: defaultPwdHash,
      firstName: 'Admin',
      lastName: 'Operations',
      phone: '9876543212',
      role: 'super_admin',
      status: 'active'
    });
    adminToken = generateAccessToken(adminUser);

    // Create catalogue foundation
    category = await Category.create({
      name: 'Electronics & Audio',
      slug: 'electronics-audio',
      isActive: true
    });

    brand = await Brand.create({
      name: 'SoundPulse',
      slug: 'soundpulse',
      isActive: true
    });

    product = await Product.create({
      title: 'SoundPulse ANC Headphones',
      slug: 'soundpulse-anc-headphones',
      description: 'High-fidelity active noise canceling headphones',
      categoryId: category._id,
      brandId: brand._id,
      basePrice: 499900,
      baseMrp: 799900,
      status: 'published',
      variants: [
        {
          sku: 'SP-ANC-BLK',
          title: 'Matte Black',
          price: 499900, // ₹4,999.00
          mrp: 799900,
          stockQuantity: 20,
          reservedQuantity: 0,
          isActive: true
        },
        {
          sku: 'SP-ANC-SLV',
          title: 'Silver White',
          price: 499900,
          mrp: 799900,
          stockQuantity: 2,
          reservedQuantity: 0,
          isActive: true
        }
      ]
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('1. Address Management & IDOR Protection', () => {
    let createdAddressId;

    it('should allow customer to create an Indian address with valid PIN and phone', async () => {
      const res = await request(app)
        .post('/api/v1/account/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'Aarav Sharma',
          phone: '9876543210',
          addressLine1: 'Flat 402, Lotus Towers',
          addressLine2: 'Bandra West, Hill Road',
          landmark: 'Opposite Bandra Police Station',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400050',
          addressType: 'home'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.postalCode).toBe('400050');
      expect(res.body.data.isDefaultShipping).toBe(true); // First address is auto-default
      createdAddressId = res.body.data._id;
    });

    it('should reject address with invalid Indian PIN code or phone', async () => {
      const res = await request(app)
        .post('/api/v1/account/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'Aarav Sharma',
          phone: '12345', // Invalid
          addressLine1: 'Flat 101',
          addressLine2: 'Road 1',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '000123' // Invalid
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should prevent another user from accessing or modifying the address (IDOR protection)', async () => {
      // otherCustomer attempts to update Aarav's address
      const res = await request(app)
        .put(`/api/v1/account/addresses/${createdAddressId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({
          fullName: 'Hacker Attempt'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Authoritative Checkout Quote Engine', () => {
    it('should compute authoritative totals in integer paise and apply free shipping for order >= ₹999', async () => {
      const res = await request(app)
        .post('/api/v1/checkout/quote')
        .send({
          items: [
            {
              productId: product._id.toString(),
              sku: 'SP-ANC-BLK',
              quantity: 1
            }
          ],
          postalCode: '400050'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pricing.subtotal).toBe(499900); // ₹4,999.00
      expect(res.body.data.shippingPolicy.freeShippingEligible).toBe(true);
      expect(res.body.data.pricing.shippingFee).toBe(0);
      expect(res.body.data.pricing.grandTotal).toBe(499900);
      expect(res.body.data.pricing.taxTotal).toBeGreaterThan(0);
    });

    it('should clamp quantity and emit warning when requested quantity exceeds available stock', async () => {
      const res = await request(app)
        .post('/api/v1/checkout/quote')
        .send({
          items: [
            {
              productId: product._id.toString(),
              sku: 'SP-ANC-SLV', // Only 2 in stock
              quantity: 5
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].quantity).toBe(2);
      expect(res.body.data.warnings).toHaveLength(1);
      expect(res.body.data.warnings[0]).toContain('Only 2 units');
    });

    it('should reject quote if an item is completely out of stock', async () => {
      // Set SP-ANC-SLV stock to 0
      await Product.updateOne(
        { 'variants.sku': 'SP-ANC-SLV' },
        { $set: { 'variants.$.stockQuantity': 0 } }
      );

      const res = await request(app)
        .post('/api/v1/checkout/quote')
        .send({
          items: [
            {
              productId: product._id.toString(),
              sku: 'SP-ANC-SLV',
              quantity: 1
            }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('out of stock');

      // Restore stock
      await Product.updateOne(
        { 'variants.sku': 'SP-ANC-SLV' },
        { $set: { 'variants.$.stockQuantity': 2 } }
      );
    });
  });

  describe('3. Cash on Delivery (COD) Rules Engine', () => {
    it('should allow COD for eligible amount and serviceable PIN code', async () => {
      const res = await request(app)
        .get('/api/v1/checkout/cod-eligibility?postalCode=400050&amount=499900');

      expect(res.status).toBe(200);
      expect(res.body.data.eligible).toBe(true);
    });

    it('should reject COD if order amount exceeds maximum limit', async () => {
      const res = await request(app)
        .get('/api/v1/checkout/cod-eligibility?postalCode=400050&amount=2500000'); // ₹25,000 exceeds ₹10,000 max

      expect(res.status).toBe(200);
      expect(res.body.data.eligible).toBe(false);
      expect(res.body.data.reason).toContain('exceeding');
    });
  });

  describe('4. Order Placement & Inventory Reservation', () => {
    let placedOrderNumber;
    const testIdempotencyKey = 'idem_key_' + Date.now();

    it('should place an order, atomically reserve stock, and initialize Razorpay order', async () => {
      const initialProduct = await Product.findOne({ 'variants.sku': 'SP-ANC-BLK' });
      const initialStock = initialProduct.variants.find((v) => v.sku === 'SP-ANC-BLK').stockQuantity;

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          customer: {
            firstName: 'Aarav',
            lastName: 'Sharma',
            email: 'aarav.sharma@example.in',
            phone: '9876543210'
          },
          items: [
            {
              productId: product._id.toString(),
              sku: 'SP-ANC-BLK',
              quantity: 2
            }
          ],
          shippingAddress: {
            fullName: 'Aarav Sharma',
            phone: '9876543210',
            addressLine1: 'Flat 402, Lotus Towers',
            addressLine2: 'Bandra West',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400050'
          },
          paymentMethod: 'razorpay',
          idempotencyKey: testIdempotencyKey
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.orderNumber).toMatch(/^ORD-\d{8}-[A-F0-9]{6}$/);
      expect(res.body.data.order.orderStatus).toBe('placed');
      expect(res.body.data.order.paymentStatus).toBe('pending');
      expect(res.body.data.order.pricing.grandTotal).toBe(999800); // 4999 * 2 in paise
      expect(res.body.data.razorpayOrder).toBeDefined();

      placedOrderNumber = res.body.data.order.orderNumber;

      // Verify stock was moved from stockQuantity to reservedQuantity
      const afterProduct = await Product.findOne({ 'variants.sku': 'SP-ANC-BLK' });
      const variant = afterProduct.variants.find((v) => v.sku === 'SP-ANC-BLK');
      expect(variant.stockQuantity).toBe(initialStock - 2);
      expect(variant.reservedQuantity).toBe(2);
    });

    it('should return the existing order when identical idempotencyKey is submitted', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          customer: { firstName: 'Aarav', email: 'aarav@example.in', phone: '9876543210' },
          items: [{ productId: product._id.toString(), sku: 'SP-ANC-BLK', quantity: 2 }],
          shippingAddress: {
            fullName: 'Aarav Sharma',
            phone: '9876543210',
            addressLine1: 'Flat 402',
            addressLine2: 'Bandra West',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400050'
          },
          paymentMethod: 'razorpay',
          idempotencyKey: testIdempotencyKey
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isDuplicate).toBe(true);
      expect(res.body.data.order.orderNumber).toBe(placedOrderNumber);
    });

    it('should place a COD order and confirm immediately while committing stock', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          customer: {
            firstName: 'Aarav',
            email: 'aarav@example.in',
            phone: '9876543210'
          },
          items: [
            {
              productId: product._id.toString(),
              sku: 'SP-ANC-BLK',
              quantity: 1
            }
          ],
          shippingAddress: {
            fullName: 'Aarav Sharma',
            phone: '9876543210',
            addressLine1: 'Flat 402',
            addressLine2: 'Bandra West',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400050'
          },
          paymentMethod: 'cod'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order.orderStatus).toBe('confirmed');
      expect(res.body.data.order.paymentStatus).toBe('pending');
      expect(res.body.data.order.paymentMethod).toBe('cod');
    });
  });

  describe('5. Razorpay Signature Verification & Payment Capture', () => {
    let orderToPay;

    beforeEach(async () => {
      // Create a fresh placed order
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          customer: { firstName: 'Aarav', email: 'aarav@example.in', phone: '9876543210' },
          items: [{ productId: product._id.toString(), sku: 'SP-ANC-BLK', quantity: 1 }],
          shippingAddress: {
            fullName: 'Aarav Sharma',
            phone: '9876543210',
            addressLine1: 'Flat 402',
            addressLine2: 'Bandra West',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400050'
          },
          paymentMethod: 'razorpay'
        });

      orderToPay = res.body.data.order;
    });

    it('should capture payment and transition order to CONFIRMED with authentic signature', async () => {
      const secret = env.RAZORPAY_KEY_SECRET || 'test_secret_for_sandbox_signatures';
      const razorpayOrderId = orderToPay.paymentDetails.razorpayOrderId;
      const razorpayPaymentId = 'pay_test_' + Date.now();

      // Compute valid HMAC SHA256 signature
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderNumber: orderToPay.orderNumber,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: validSignature
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.paymentStatus).toBe('captured');
      expect(res.body.data.order.orderStatus).toBe('confirmed');

      // Verify payment record in Payment collection
      const payment = await Payment.findOne({ orderId: orderToPay._id });
      expect(payment.status).toBe('captured');
      expect(payment.gatewayPaymentId).toBe(razorpayPaymentId);
    });

    it('should reject tampered or invalid signature and keep order uncaptured', async () => {
      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderNumber: orderToPay.orderNumber,
          razorpayOrderId: orderToPay.paymentDetails.razorpayOrderId,
          razorpayPaymentId: 'pay_fake_123',
          razorpaySignature: 'invalid_tampered_signature_hex'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      const dbOrder = await Order.findById(orderToPay._id);
      expect(dbOrder.paymentStatus).toBe('pending');
    });

    it('should release reserved inventory when payment failure is reported', async () => {
      const initialProduct = await Product.findOne({ 'variants.sku': 'SP-ANC-BLK' });
      const initialReserved = initialProduct.variants.find((v) => v.sku === 'SP-ANC-BLK').reservedQuantity;

      const res = await request(app)
        .post('/api/v1/payments/failure')
        .send({
          orderNumber: orderToPay.orderNumber,
          errorDetails: {
            code: 'BAD_REQUEST_ERROR',
            description: 'Card declined by issuing bank'
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.data.paymentStatus).toBe('failed');

      // Verify stock was restored from reservedQuantity
      const afterProduct = await Product.findOne({ 'variants.sku': 'SP-ANC-BLK' });
      const variant = afterProduct.variants.find((v) => v.sku === 'SP-ANC-BLK');
      expect(variant.reservedQuantity).toBe(initialReserved - 1);
    });
  });

  describe('6. Razorpay Webhooks & Deduplication', () => {
    it('should process webhook payment.captured with raw body signature verification and deduplicate repeated events', async () => {
      const secret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET || 'test_webhook_secret';
      const eventId = 'evt_test_' + Date.now();
      const payload = {
        event_id: eventId,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_hook_12345',
              order_id: 'order_hook_123',
              amount: 499900,
              currency: 'INR'
            }
          }
        }
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      // 1. First event submission
      const res1 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('ok');

      // 2. Duplicate submission with same eventId
      const res2 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.duplicate).toBe(true);
    });

    it('should reject webhook with invalid signature', async () => {
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', 'bad_signature')
        .send({ event: 'payment.captured' });

      expect(res.status).toBe(400);
    });
  });

  describe('7. Order History, Details & Guest Lookup', () => {
    let orderNum;

    beforeAll(async () => {
      const order = await Order.create({
        orderNumber: 'ORD-20261114-GST99',
        customer: { firstName: 'Rahul', lastName: 'Kumar', email: 'rahul.guest@example.in', phone: '9811122233' },
        shippingAddress: {
          fullName: 'Rahul Kumar',
          phone: '9811122233',
          addressLine1: 'House 12',
          addressLine2: 'Sector 14',
          city: 'Gurugram',
          state: 'Haryana',
          postalCode: '122001'
        },
        billingAddress: {
          fullName: 'Rahul Kumar',
          phone: '9811122233',
          addressLine1: 'House 12',
          addressLine2: 'Sector 14',
          city: 'Gurugram',
          state: 'Haryana',
          postalCode: '122001'
        },
        items: [
          {
            productId: product._id,
            sku: 'SP-ANC-BLK',
            title: 'SoundPulse ANC Headphones',
            quantity: 1,
            unitPrice: 499900,
            mrp: 799900,
            itemTotal: 499900
          }
        ],
        pricing: { subtotal: 499900, discountTotal: 0, shippingFee: 0, taxTotal: 76256, grandTotal: 499900 },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        orderStatus: 'confirmed'
      });
      orderNum = order.orderNumber;
    });

    it('should allow guest to look up order with matching orderNumber and phone', async () => {
      const res = await request(app)
        .post('/api/v1/orders/guest-lookup')
        .send({
          orderNumber: orderNum,
          phone: '9811122233'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe(orderNum);
      expect(res.body.data.customer.firstName).toBe('Rahul');
    });

    it('should reject guest lookup if verification details do not match', async () => {
      const res = await request(app)
        .post('/api/v1/orders/guest-lookup')
        .send({
          orderNumber: orderNum,
          phone: '9899999999' // Wrong phone
        });

      expect(res.status).toBe(403);
    });

    it('should list customer orders with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });
  });

  describe('8. Admin Order Management, State Machine & Refunds', () => {
    let adminTestOrder;

    beforeAll(async () => {
      adminTestOrder = await Order.create({
        orderNumber: 'ORD-20261114-ADM01',
        userId: customerUser._id,
        customer: { firstName: 'Aarav', email: 'aarav@example.in', phone: '9876543210' },
        shippingAddress: {
          fullName: 'Aarav Sharma',
          phone: '9876543210',
          addressLine1: 'Flat 402',
          addressLine2: 'Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400050'
        },
        billingAddress: {
          fullName: 'Aarav Sharma',
          phone: '9876543210',
          addressLine1: 'Flat 402',
          addressLine2: 'Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400050'
        },
        items: [
          {
            productId: product._id,
            sku: 'SP-ANC-BLK',
            title: 'SoundPulse ANC Headphones',
            quantity: 1,
            unitPrice: 499900,
            mrp: 799900,
            itemTotal: 499900
          }
        ],
        pricing: { subtotal: 499900, discountTotal: 0, shippingFee: 0, taxTotal: 76256, grandTotal: 499900 },
        paymentMethod: 'razorpay',
        paymentStatus: 'captured',
        orderStatus: 'confirmed',
        paymentDetails: {
          razorpayOrderId: 'order_adm_1',
          razorpayPaymentId: 'pay_adm_1'
        }
      });
    });

    it('should allow admin to transition order from confirmed to processing', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/orders/${adminTestOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newStatus: 'processing',
          note: 'Items picked from warehouse'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.orderStatus).toBe('processing');
    });

    it('should reject invalid or backward state machine transition', async () => {
      // Cannot transition from processing back to placed
      const res = await request(app)
        .patch(`/api/v1/admin/orders/${adminTestOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newStatus: 'placed'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot transition order');
    });

    it('should allow admin to process a partial refund with ceiling check', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/orders/${adminTestOrder._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 100000, // ₹1,000.00
          reason: 'Customer goodwill discount on minor packaging scuff'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order.paymentStatus).toBe('partially_refunded');
      expect(res.body.data.order.totalRefundedAmount).toBe(100000);
    });

    it('should reject refund exceeding remaining refundable balance', async () => {
      // Remaining is 499900 - 100000 = 399900. Request 400000
      const res = await request(app)
        .post(`/api/v1/admin/orders/${adminTestOrder._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 400000,
          reason: 'Excessive refund'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('exceeds maximum remaining refundable balance');
    });

    it('should process full remaining refund and transition paymentStatus to refunded', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/orders/${adminTestOrder._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 399900,
          reason: 'Full balance return'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order.paymentStatus).toBe('refunded');
      expect(res.body.data.order.totalRefundedAmount).toBe(499900);
    });
  });
});
