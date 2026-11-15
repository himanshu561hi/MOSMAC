import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ExcelJS from 'exceljs';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Brand } from '../src/models/Brand.js';
import { Product } from '../src/models/Product.js';
import { Coupon } from '../src/models/Coupon.js';
import { InventoryLog } from '../src/models/InventoryLog.js';
import { ImportJob } from '../src/models/ImportJob.js';
import { ROLES } from '../src/constants/roles.js';
import { generateAccessToken } from '../src/services/tokenService.js';
import { hashPassword } from '../src/services/passwordService.js';
import { sanitizeForExport } from '../src/services/excel/excelSanitizer.js';

let mongoServer;
let superAdminToken;
let customerToken;
let superAdminUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const pwdHash = await hashPassword('Password@123');

  superAdminUser = await User.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin_bulk@example.com',
    passwordHash: pwdHash,
    role: ROLES.SUPER_ADMIN,
    status: 'active',
    isEmailVerified: true
  });
  superAdminToken = generateAccessToken(superAdminUser);

  const customerUser = await User.create({
    firstName: 'Regular',
    lastName: 'Customer',
    email: 'customer_bulk@example.com',
    passwordHash: pwdHash,
    role: ROLES.CUSTOMER,
    status: 'active',
    isEmailVerified: true
  });
  customerToken = generateAccessToken(customerUser);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Category.deleteMany({});
  await Brand.deleteMany({});
  await Product.deleteMany({});
  await Coupon.deleteMany({});
  await InventoryLog.deleteMany({});
  await ImportJob.deleteMany({});
});

/**
 * Helper to build an in-memory .xlsx buffer
 */
async function createWorkbookBuffer(rows, sheetName = 'Data') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  if (rows.length > 0) {
    sheet.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k }));
    rows.forEach((r) => sheet.addRow(r));
  }

  return await workbook.xlsx.writeBuffer();
}

/**
 * Supertest parser for binary Excel downloads
 */
const binaryParser = (res, callback) => {
  res.setEncoding('binary');
  res.data = '';
  res.on('data', (chunk) => {
    res.data += chunk;
  });
  res.on('end', () => {
    callback(null, Buffer.from(res.data, 'binary'));
  });
};

describe('Phase 10A — Universal Admin Excel Bulk Import & Export System Test Suite', () => {
  describe('1. Template Generation & Module Boundaries', () => {
    it('should generate a valid sample Excel template for products', async () => {
      const res = await request(app)
        .get('/api/v1/admin/bulk/products/template?sample=true')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain('products_template_sample.xlsx');

      // Verify workbook structure with exceljs
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);

      expect(workbook.worksheets.length).toBeGreaterThanOrEqual(2);
      const dataSheet = workbook.getWorksheet('Data');
      expect(dataSheet).toBeDefined();
      expect(dataSheet.rowCount).toBeGreaterThanOrEqual(2); // Header + sample row
    });

    it('should generate a blank Excel template for categories', async () => {
      const res = await request(app)
        .get('/api/v1/admin/bulk/categories/template?sample=false')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);

      const dataSheet = workbook.getWorksheet('Data');
      expect(dataSheet.rowCount).toBe(1); // Header only
    });

    it('should reject template download for forbidden export-only modules (e.g. orders, payments)', async () => {
      const resOrders = await request(app)
        .get('/api/v1/admin/bulk/orders/template')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(resOrders.status).toBe(403);

      const resPayments = await request(app)
        .get('/api/v1/admin/bulk/payments/template')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(resPayments.status).toBe(403);
    });

    it('should reject unauthenticated or non-admin requests', async () => {
      const unauth = await request(app).get('/api/v1/admin/bulk/products/template');
      expect(unauth.status).toBe(401);

      const customerForbidden = await request(app)
        .get('/api/v1/admin/bulk/products/template')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(customerForbidden.status).toBe(403);
    });
  });

  describe('2. Pre-Import Validation & Preview', () => {
    it('should parse and report validation errors with row, column, value, and suggestion', async () => {
      // Seed a brand and category
      const cat = await Category.create({ name: 'Electronics', slug: 'electronics' });
      await Brand.create({ name: 'Sony', slug: 'sony' });

      const invalidRows = [
        {
          'Product Title': 'Valid Television 4K',
          SKU: 'TV-SONY-001',
          Slug: 'valid-television-4k',
          Description: 'High quality 4K TV',
          'Category Slug': 'electronics',
          'Brand Slug': 'sony',
          'Selling Price (INR)': 45000,
          'MRP (INR)': 55000
        },
        {
          'Product Title': 'No', // Too short
          SKU: '', // Missing SKU
          Slug: 'broken-product',
          Description: 'Missing required items',
          'Category Slug': 'non-existent-cat', // Non-existent category
          'Brand Slug': 'sony',
          'Selling Price (INR)': 60000,
          'MRP (INR)': 50000 // Price > MRP
        }
      ];

      const buffer = await createWorkbookBuffer(invalidRows);

      const res = await request(app)
        .post('/api/v1/admin/bulk/products/validate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('file', buffer, 'test_products.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRows).toBe(2);
      expect(res.body.data.validRows).toBe(1);
      expect(res.body.data.invalidRows).toBe(1);
      expect(res.body.data.jobId).toBeDefined();

      const errors = res.body.data.errors;
      expect(errors.length).toBeGreaterThanOrEqual(3);
      expect(errors.some((e) => e.column === 'Product Title')).toBe(true);
      expect(errors.some((e) => e.column === 'Category Slug')).toBe(true);
      expect(errors.some((e) => e.column === 'Selling Price (INR)')).toBe(true);
    });

    it('should reject malformed or non-xlsx files', async () => {
      const textBuffer = Buffer.from('This is not an Excel file');
      const res = await request(app)
        .post('/api/v1/admin/bulk/products/validate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('file', textBuffer, 'corrupt.xlsx');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid file format');
    });
  });

  describe('3. Import Modes Execution (Create Only, Update Existing, Create + Update)', () => {
    it('should support create_only mode and skip existing records', async () => {
      await Category.create({ name: 'Audio', slug: 'audio' });
      await Brand.create({ name: 'Bose', slug: 'bose' });

      // Seed one existing product
      await Product.create({
        title: 'Bose Headphones QC45',
        slug: 'bose-headphones-qc45',
        description: 'Noise cancelling headphones',
        categoryId: (await Category.findOne({ slug: 'audio' }))._id,
        brandId: (await Brand.findOne({ slug: 'bose' }))._id,
        basePrice: 2490000,
        baseMrp: 2990000,
        variants: [
          {
            sku: 'BOSE-QC45-BLK',
            title: 'Black',
            price: 2490000,
            mrp: 2990000,
            stockQuantity: 10
          }
        ]
      });

      const rows = [
        {
          'Product Title': 'Bose Earbuds Sport',
          SKU: 'BOSE-SPORT-01',
          Slug: 'bose-earbuds-sport',
          Description: 'Sweat resistant sport earbuds',
          'Category Slug': 'audio',
          'Brand Slug': 'bose',
          'Selling Price (INR)': 14999,
          'MRP (INR)': 17999
        },
        {
          'Product Title': 'Bose Headphones QC45 (Duplicate)',
          SKU: 'BOSE-QC45-BLK', // Existing SKU
          Slug: 'bose-headphones-qc45-dup',
          Description: 'Duplicate attempt',
          'Category Slug': 'audio',
          'Brand Slug': 'bose',
          'Selling Price (INR)': 22000,
          'MRP (INR)': 28000
        }
      ];

      const buffer = await createWorkbookBuffer(rows);

      // Validate
      const valRes = await request(app)
        .post('/api/v1/admin/bulk/products/validate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('file', buffer, 'products_import.xlsx');

      const jobId = valRes.body.data.jobId;

      // Execute with create_only
      const execRes = await request(app)
        .post('/api/v1/admin/bulk/products/execute')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ jobId, importMode: 'create_only' });

      expect(execRes.status).toBe(200);
      expect(execRes.body.data.createdCount).toBe(1);
      expect(execRes.body.data.skippedCount).toBe(1); // Existing SKU skipped

      // Verify newly created product exists
      const created = await Product.findOne({ 'variants.sku': 'BOSE-SPORT-01' });
      expect(created).toBeDefined();
      expect(created.basePrice).toBe(1499900); // 14999 INR = 1499900 paise
    });

    it('should support update_existing mode to update existing items', async () => {
      const cat = await Category.create({ name: 'Wearables', slug: 'wearables' });
      const brand = await Brand.create({ name: 'Fitbit', slug: 'fitbit' });

      await Product.create({
        title: 'Fitbit Charge 5',
        slug: 'fitbit-charge-5',
        description: 'Old Description',
        categoryId: cat._id,
        brandId: brand._id,
        basePrice: 1200000,
        baseMrp: 1500000,
        variants: [
          {
            sku: 'FIT-CHG-05',
            title: 'Black',
            price: 1200000,
            mrp: 1500000,
            stockQuantity: 5
          }
        ]
      });

      const updateRows = [
        {
          'Product Title': 'Fitbit Charge 5 Special Edition',
          SKU: 'FIT-CHG-05',
          Slug: 'fitbit-charge-5',
          Description: 'Brand New Updated Description with ECG',
          'Category Slug': 'wearables',
          'Brand Slug': 'fitbit',
          'Selling Price (INR)': 13999,
          'MRP (INR)': 16999
        }
      ];

      const buffer = await createWorkbookBuffer(updateRows);

      const valRes = await request(app)
        .post('/api/v1/admin/bulk/products/validate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('file', buffer, 'update.xlsx');

      const jobId = valRes.body.data.jobId;

      const execRes = await request(app)
        .post('/api/v1/admin/bulk/products/execute')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ jobId, importMode: 'update_existing' });

      expect(execRes.status).toBe(200);
      expect(execRes.body.data.updatedCount).toBe(1);

      const updated = await Product.findOne({ 'variants.sku': 'FIT-CHG-05' });
      expect(updated.title).toBe('Fitbit Charge 5 Special Edition');
      expect(updated.description).toBe('Brand New Updated Description with ECG');
    });
  });

  describe('4. Inventory Atomic Adjustments & Audit Logs', () => {
    it('should adjust inventory stock and record InventoryLog', async () => {
      const cat = await Category.create({ name: 'Shoes', slug: 'shoes' });
      const brand = await Brand.create({ name: 'Nike', slug: 'nike' });

      await Product.create({
        title: 'Nike Air Max 90',
        slug: 'nike-air-max-90',
        description: 'Classic runner',
        categoryId: cat._id,
        brandId: brand._id,
        variants: [
          {
            sku: 'NIKE-AM90-01',
            title: 'US 10',
            price: 999900,
            mrp: 1199900,
            stockQuantity: 20
          }
        ]
      });

      const rows = [
        {
          'Variant SKU': 'NIKE-AM90-01',
          'Stock Adjustment (Delta)': 15,
          'Adjustment Reason': 'RESTOCK',
          'Reference ID': 'PO-8889',
          'Audit Note': 'Restocked from warehouse'
        }
      ];

      const buffer = await createWorkbookBuffer(rows);

      const valRes = await request(app)
        .post('/api/v1/admin/bulk/inventory/validate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('file', buffer, 'stock.xlsx');

      expect(valRes.status).toBe(200);
      expect(valRes.body.data.validRows).toBe(1);

      const jobId = valRes.body.data.jobId;

      const execRes = await request(app)
        .post('/api/v1/admin/bulk/inventory/execute')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ jobId, importMode: 'update_existing' });

      if (execRes.status !== 200 || execRes.body.data.updatedCount !== 1) {
        console.error('INVENTORY EXEC RES FAILED:', JSON.stringify(execRes.body));
      }

      expect(execRes.status).toBe(200);
      expect(execRes.body.data.updatedCount).toBe(1);

      // Verify product stock increased from 20 to 35
      const prod = await Product.findOne({ 'variants.sku': 'NIKE-AM90-01' });
      expect(prod.variants[0].stockQuantity).toBe(35);

      // Verify InventoryLog record was created
      const invLog = await InventoryLog.findOne({ sku: 'NIKE-AM90-01' });
      expect(invLog).toBeDefined();
      expect(invLog.delta).toBe(15);
      expect(invLog.previousStock).toBe(20);
      expect(invLog.newStock).toBe(35);
      expect(invLog.reason).toBe('restock');
    });

    it('should reject adjustments causing negative inventory during pre-validation', async () => {
      const cat = await Category.create({ name: 'Bags', slug: 'bags' });
      const brand = await Brand.create({ name: 'Puma', slug: 'puma' });

      await Product.create({
        title: 'Puma Backpack',
        slug: 'puma-backpack',
        description: 'Sport bag',
        categoryId: cat._id,
        brandId: brand._id,
        variants: [
          {
            sku: 'PUMA-BAG-01',
            title: 'Black',
            price: 199900,
            mrp: 299900,
            stockQuantity: 5
          }
        ]
      });

      const rows = [
        {
          'Variant SKU': 'PUMA-BAG-01',
          'Stock Adjustment (Delta)': -10, // Exceeds current stock of 5
          'Adjustment Reason': 'DAMAGED'
        }
      ];

      const buffer = await createWorkbookBuffer(rows);

      const valRes = await request(app)
        .post('/api/v1/admin/bulk/inventory/validate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('file', buffer, 'negative_stock.xlsx');

      expect(valRes.status).toBe(200);
      expect(valRes.body.data.validRows).toBe(0);
      expect(valRes.body.data.invalidRows).toBe(1);
      expect(valRes.body.data.errors[0].reason).toContain('Adjustment causes negative inventory');
    });
  });

  describe('5. Formula Injection Sanitization & Data Export', () => {
    it('should prefix dangerous formula symbols (=, +, -, @) with single quote in export', () => {
      expect(sanitizeForExport('=cmd|"/C calc"!A0')).toBe('\'=cmd|"/C calc"!A0');
      expect(sanitizeForExport('+12345')).toBe('\'+12345');
      expect(sanitizeForExport('-SUM(A1:A10)')).toBe('\'-SUM(A1:A10)');
      expect(sanitizeForExport('@lookup')).toBe('\'@lookup');
      expect(sanitizeForExport('Normal Text')).toBe('Normal Text');
    });

    it('should export authorized data to sanitized .xlsx file', async () => {
      await Brand.create({
        name: 'SafeBrand',
        slug: 'safe-brand',
        description: '=HYPERLINK("http://malicious.com","Click")',
        isActive: true
      });

      const res = await request(app)
        .get('/api/v1/admin/bulk/brands/export')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);
      const sheet = workbook.getWorksheet('Brands');
      expect(sheet).toBeDefined();

      const descCell = sheet.getRow(2).getCell(3); // Column 3: Description
      expect(descCell.value.toString().startsWith('\'=')).toBe(true);
    });

    it('should generate an error report .xlsx for an import job', async () => {
      const job = await ImportJob.create({
        module: 'coupons',
        filename: 'coupons_batch.xlsx',
        importMode: 'create_only',
        status: 'completed',
        totalRows: 1,
        invalidRows: 1,
        errors: [
          {
            row: 2,
            column: 'Coupon Code',
            value: 'CPN',
            reason: 'Code must be at least 3 characters',
            suggestion: 'Use code like SAVE20'
          }
        ],
        importedBy: superAdminUser._id,
        importedByEmail: superAdminUser.email
      });

      const res = await request(app)
        .get(`/api/v1/admin/bulk/history/${job._id}/report`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain(`import_report_${job._id}.xlsx`);
    });
  });
});
