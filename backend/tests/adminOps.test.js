import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { Brand } from '../src/models/Brand.js';
import { Coupon } from '../src/models/Coupon.js';
import { Order } from '../src/models/Order.js';
import { Payment } from '../src/models/Payment.js';
import { Refund } from '../src/models/Refund.js';
import { Address } from '../src/models/Address.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { InventoryLog } from '../src/models/InventoryLog.js';
import { generateAccessToken } from '../src/services/tokenService.js';
import { hashPassword } from '../src/services/passwordService.js';

let mongoServer;
let superAdminUser, superAdminToken;
let storeManagerUser, storeManagerToken;
let customerUser, customerToken;
let testCategory, testBrand, testProduct, testOrder;

describe('Phase 7 — Admin Dashboard & Operations Portal Test Suite', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const defaultPwdHash = await hashPassword('Password123!');

    // Create Super Admin
    superAdminUser = await User.create({
      email: 'superadmin.phase7@example.in',
      passwordHash: defaultPwdHash,
      firstName: 'Vikram',
      lastName: 'Aditya',
      phone: '9876543210',
      role: 'super_admin',
      status: 'active',
      isEmailVerified: true
    });
    superAdminToken = generateAccessToken(superAdminUser);

    // Create Store Manager
    storeManagerUser = await User.create({
      email: 'storemanager.phase7@example.in',
      passwordHash: defaultPwdHash,
      firstName: 'Priya',
      lastName: 'Nair',
      phone: '9876543211',
      role: 'store_manager',
      status: 'active',
      isEmailVerified: true
    });
    storeManagerToken = generateAccessToken(storeManagerUser);

    // Create Customer
    customerUser = await User.create({
      email: 'customer.phase7@example.in',
      passwordHash: defaultPwdHash,
      firstName: 'Rohan',
      lastName: 'Mehta',
      phone: '9876543212',
      role: 'customer',
      status: 'active',
      isEmailVerified: true
    });
    customerToken = generateAccessToken(customerUser);

    // Create Category & Brand
    testCategory = await Category.create({
      name: 'Smart Lighting',
      slug: 'smart-lighting',
      description: 'Smart ambient home lighting'
    });

    testBrand = await Brand.create({
      name: 'LuminaTech',
      slug: 'luminatech',
      description: 'Connected illumination'
    });

    // Create Product with variants (one low-stock, one healthy)
    testProduct = await Product.create({
      title: 'Aurora Smart Desk Lamp',
      slug: 'aurora-smart-desk-lamp',
      categoryId: testCategory._id,
      brandId: testBrand._id,
      description: 'Color-changing LED smart desk lamp',
      hasVariants: true,
      variants: [
        {
          title: 'Matte Black',
          sku: 'LAMP-SMART-BLK',
          attributes: new Map([['color', 'Matte Black']]),
          price: 249900,
          mrp: 349900,
          costPrice: 120000,
          stockQuantity: 3, // Below threshold 5 -> low stock alert
          reservedQuantity: 0,
          lowStockThreshold: 5,
          isActive: true
        },
        {
          title: 'Pure White',
          sku: 'LAMP-SMART-WHT',
          attributes: new Map([['color', 'Pure White']]),
          price: 249900,
          mrp: 349900,
          costPrice: 120000,
          stockQuantity: 40, // Healthy stock
          reservedQuantity: 2,
          lowStockThreshold: 5,
          isActive: true
        }
      ],
      isActive: true
    });

    // Seed test Order
    testOrder = await Order.create({
      orderNumber: 'ORD-20261114-77777',
      userId: customerUser._id,
      customer: {
        firstName: customerUser.firstName,
        lastName: customerUser.lastName,
        email: customerUser.email,
        phone: customerUser.phone
      },
      items: [
        {
          productId: testProduct._id,
          sku: 'LAMP-SMART-BLK',
          title: 'Aurora Smart Desk Lamp (Matte Black)',
          variantTitle: 'Matte Black',
          quantity: 2,
          unitPrice: 249900,
          mrp: 349900,
          itemTotal: 499800
        }
      ],
      pricing: {
        subtotal: 499800,
        discountTotal: 0,
        shippingFee: 0,
        taxTotal: 76240,
        grandTotal: 499800
      },
      paymentMethod: 'razorpay',
      paymentStatus: 'captured',
      orderStatus: 'confirmed',
      shippingAddress: {
        fullName: 'Rohan Mehta',
        phone: '9876543212',
        addressLine1: '402, Green Valley Apartments',
        addressLine2: 'Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400053'
      },
      billingAddress: {
        fullName: 'Rohan Mehta',
        phone: '9876543212',
        addressLine1: '402, Green Valley Apartments',
        addressLine2: 'Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400053'
      }
    });

    // Seed test Payment
    await Payment.create({
      orderId: testOrder._id,
      orderNumber: testOrder.orderNumber,
      gateway: 'razorpay',
      gatewayOrderId: 'order_test_777',
      gatewayPaymentId: 'pay_test_777',
      amount: 499800,
      currency: 'INR',
      status: 'captured',
      method: 'upi'
    });

    // Seed test Coupon
    await Coupon.create({
      code: 'OPS2026',
      description: 'Operations special discount',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 100000,
      maxDiscountAmount: 50000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usedCount: 5,
      isActive: true
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('1. Executive Analytics & Real-Data Dashboard', () => {
    it('GET /api/v1/admin/analytics/overview should calculate real KPIs from seeded database records', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/overview?period=last_30_days')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { kpi, customers, orders, inventory, topSellingProducts, timeline } = res.body.data;

      // Real KPI calculations
      expect(kpi.totalOrders).toBeGreaterThanOrEqual(1);
      expect(kpi.gmv).toBeGreaterThanOrEqual(499800);
      expect(kpi.netRevenue).toBeGreaterThanOrEqual(499800);
      expect(kpi.aov).toBeGreaterThanOrEqual(499800);

      // Customer metrics
      expect(customers.total).toBeGreaterThanOrEqual(1);

      // Order breakdown
      expect(orders.byStatus.confirmed).toBeGreaterThanOrEqual(1);
      expect(orders.byPaymentMethod.razorpay.count).toBeGreaterThanOrEqual(1);

      // Inventory valuation
      expect(inventory.lowStockSkus).toBeGreaterThanOrEqual(1);
      expect(inventory.valuation).toBeGreaterThan(0);

      // Top products
      expect(topSellingProducts.length).toBeGreaterThanOrEqual(1);
      expect(topSellingProducts[0]._id).toBe('LAMP-SMART-BLK');
    });

    it('should support today and custom date range filters', async () => {
      const resToday = await request(app)
        .get('/api/v1/admin/analytics/overview?period=today')
        .set('Authorization', `Bearer ${storeManagerToken}`);

      expect(resToday.status).toBe(200);
      expect(resToday.body.data.dateRange.period).toBe('today');

      const resCustom = await request(app)
        .get('/api/v1/admin/analytics/overview?period=custom&startDate=2026-01-01&endDate=2026-12-31')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(resCustom.status).toBe(200);
      expect(resCustom.body.data.kpi.totalOrders).toBeGreaterThanOrEqual(1);
    });

    it('should reject unauthenticated or customer access with 403 Forbidden', async () => {
      const resNoAuth = await request(app).get('/api/v1/admin/analytics/overview');
      expect(resNoAuth.status).toBe(401);

      const resCustomer = await request(app)
        .get('/api/v1/admin/analytics/overview')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(resCustomer.status).toBe(403);
    });
  });

  describe('2. Customer Relationship Management (CRM)', () => {
    it('GET /api/v1/admin/customers should list customers with spend metrics and order counts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/customers')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customers.length).toBeGreaterThanOrEqual(1);

      const foundCustomer = res.body.data.customers.find((c) => c._id.toString() === customerUser._id.toString());
      expect(foundCustomer).toBeDefined();
      expect(foundCustomer.totalOrders).toBeGreaterThanOrEqual(1);
      expect(foundCustomer.totalSpent).toBeGreaterThanOrEqual(499800);
    });

    it('GET /api/v1/admin/customers/:id should return complete customer profile with addresses and orders', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/customers/${customerUser._id}`)
        .set('Authorization', `Bearer ${storeManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.customer.email).toBe(customerUser.email);
      expect(res.body.data.metrics.totalSpent).toBe(499800);
      expect(res.body.data.recentOrders.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/v1/admin/customers/:id/notes should add administrative note and log audit entry', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/customers/${customerUser._id}/notes`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ note: 'Customer requested express delivery preference' });

      expect(res.status).toBe(201);
      expect(res.body.data.notes.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.notes[0].note).toBe('Customer requested express delivery preference');
    });

    it('PATCH /api/v1/admin/customers/:id/status should suspend customer and invalidate session tokens', async () => {
      const initialTokenVersion = customerUser.tokenVersion;

      const res = await request(app)
        .patch(`/api/v1/admin/customers/${customerUser._id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'suspended', reason: 'Suspected policy violation' });

      expect(res.status).toBe(200);
      expect(res.body.data.customer.status).toBe('suspended');

      const reloadedUser = await User.findById(customerUser._id);
      expect(reloadedUser.status).toBe('suspended');
      expect(reloadedUser.tokenVersion).toBeGreaterThan(initialTokenVersion);

      // Restore active status
      await request(app)
        .patch(`/api/v1/admin/customers/${customerUser._id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'active' });
    });

    it('GET /api/v1/admin/customers/export should return CSV data without password hashes or secrets', async () => {
      const res = await request(app)
        .get('/api/v1/admin/customers/export')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Customer ID,First Name,Last Name,Email');
      expect(res.text).toContain(customerUser.email);
      expect(res.text).not.toContain('passwordHash');
      expect(res.text).not.toContain('token');
    });
  });

  describe('3. Staff Accounts, Roles & Privilege Escalation Prevention', () => {
    let createdStaffId;

    it('POST /api/v1/admin/staff should allow Super Admin to create new staff accounts with valid roles', async () => {
      const res = await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          firstName: 'Ananya',
          lastName: 'Deshmukh',
          email: 'ananya.staff@example.in',
          phone: '9876543299',
          password: 'Password123!',
          role: 'order_manager'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.staff.role).toBe('order_manager');
      createdStaffId = res.body.data.staff._id;
    });

    it('should reject non-super-admin from creating staff accounts with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${storeManagerToken}`)
        .send({
          firstName: 'Illegal',
          email: 'illegal@example.in',
          password: 'Password123!',
          role: 'support_staff'
        });

      expect(res.status).toBe(403);
    });

    it('PATCH /api/v1/admin/staff/:id/role should allow Super Admin to change staff roles', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/staff/${createdStaffId}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'store_manager' });

      expect(res.status).toBe(200);
      expect(res.body.data.staff.role).toBe('store_manager');
    });

    it('should prevent Super Admin from modifying their own role', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/staff/${superAdminUser._id}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'support_staff' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot modify your own Super Admin role');
    });

    it('POST /api/v1/admin/staff/:id/revoke should revoke active sessions for target staff', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/staff/${createdStaffId}/revoke`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('4. Inventory Operations & Replenishment Alerts', () => {
    it('GET /api/v1/admin/inventory/replenishment-alerts should return low stock SKUs with suggested reorder quantities', async () => {
      const res = await request(app)
        .get('/api/v1/admin/inventory/replenishment-alerts')
        .set('Authorization', `Bearer ${storeManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.alerts.length).toBeGreaterThanOrEqual(1);

      const alert = res.body.data.alerts.find((a) => a.sku === 'LAMP-SMART-BLK');
      expect(alert).toBeDefined();
      expect(alert.stockQuantity).toBe(3);
      expect(alert.lowStockThreshold).toBe(5);
      expect(alert.status).toBe('LOW_STOCK');
      expect(alert.suggestedReorderQuantity).toBeGreaterThanOrEqual(7);
    });

    it('PATCH /api/v1/admin/inventory/threshold/:sku should update low-stock threshold and log audit entry', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/inventory/threshold/LAMP-SMART-BLK')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ lowStockThreshold: 8 });

      expect(res.status).toBe(200);
      expect(res.body.data.lowStockThreshold).toBe(8);

      const reloadedProduct = await Product.findOne({ 'variants.sku': 'LAMP-SMART-BLK' });
      const variant = reloadedProduct.variants.find((v) => v.sku === 'LAMP-SMART-BLK');
      expect(variant.lowStockThreshold).toBe(8);
    });

    it('POST /api/v1/admin/inventory/adjust should record stock adjustment in InventoryLog and AuditLog', async () => {
      const res = await request(app)
        .post('/api/v1/admin/inventory/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          sku: 'LAMP-SMART-BLK',
          delta: 10,
          reason: 'restock',
          note: 'PO-8827 supplier arrival'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.previousStock).toBe(3);
      expect(res.body.data.newStock).toBe(13);

      const log = await InventoryLog.findOne({ sku: 'LAMP-SMART-BLK', reason: 'restock' }).sort({ createdAt: -1 });
      expect(log).toBeDefined();
      expect(log.delta).toBe(10);
      expect(log.note).toBe('PO-8827 supplier arrival');
    });

    it('GET /api/v1/admin/inventory/export should return CSV representation of all variants', async () => {
      const res = await request(app)
        .get('/api/v1/admin/inventory/export')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Product Title,SKU,Category,Brand');
      expect(res.text).toContain('LAMP-SMART-BLK');
    });
  });

  describe('5. Financial Operations (Payments & Refunds)', () => {
    it('GET /api/v1/admin/payments should list gateway payments with order references', async () => {
      const res = await request(app)
        .get('/api/v1/admin/payments')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.payments.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.payments[0].gatewayPaymentId).toBe('pay_test_777');
    });

    it('GET /api/v1/admin/payments/refunds should list refund records', async () => {
      // Seed a refund
      await Refund.create({
        orderId: testOrder._id,
        orderNumber: testOrder.orderNumber,
        amount: 50000,
        currency: 'INR',
        status: 'processed',
        reason: 'Customer return',
        processedBy: superAdminUser._id
      });

      const res = await request(app)
        .get('/api/v1/admin/payments/refunds')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.refunds.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.refunds[0].amount).toBe(50000);
    });

    it('GET /api/v1/admin/payments/export should export payments CSV', async () => {
      const res = await request(app)
        .get('/api/v1/admin/payments/export')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('pay_test_777');
    });
  });

  describe('6. Report Exports Center', () => {
    it('GET /api/v1/admin/reports/orders should export complete orders CSV', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/orders')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Order Number,Placed At,Customer Name');
      expect(res.text).toContain('ORD-20261114-77777');
    });

    it('GET /api/v1/admin/reports/tax should export GST tax report with CGST/SGST/IGST breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/tax')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Taxable Subtotal (INR),CGST (INR),SGST (INR),IGST (INR)');
      expect(res.text).toContain('ORD-20261114-77777');
    });

    it('GET /api/v1/admin/reports/coupons should export coupon performance CSV', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/coupons')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Coupon Code,Discount Type,Discount Value');
      expect(res.text).toContain('OPS2026');
    });
  });

  describe('7. Immutable Administrative Audit Logging', () => {
    it('GET /api/v1/admin/audit-logs should allow Super Admin to query audit records', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs.length).toBeGreaterThanOrEqual(1);

      // Verify audit fields
      const log = res.body.data.logs[0];
      expect(log.action).toBeDefined();
      expect(log.resourceType).toBeDefined();
      expect(log.timestamp).toBeDefined();
    });

    it('should reject Store Manager or Support Staff from reading audit logs with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${storeManagerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
