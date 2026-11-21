import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import path from 'path';
import fs from 'fs';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Brand } from '../src/models/Brand.js';
import { Product } from '../src/models/Product.js';
import { ImportJob } from '../src/models/ImportJob.js';
import { ROLES } from '../src/constants/roles.js';
import { generateAccessToken } from '../src/services/tokenService.js';
import { hashPassword } from '../src/services/passwordService.js';

let mongoServer;
let adminToken;
let adminUser;

// In-memory valid 1x1 test image buffers
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * Creates an in-memory .xlsx buffer with sheet "Data"
 */
async function createExcelBuffer(rows, sheetName = 'Data') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  if (rows.length > 0) {
    sheet.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k }));
    rows.forEach((r) => sheet.addRow(r));
  }

  return await workbook.xlsx.writeBuffer();
}

/**
 * Creates an in-memory .zip buffer from path -> Buffer map
 */
async function createZipBuffer(fileMap) {
  const zip = new JSZip();
  for (const [filePath, content] of Object.entries(fileMap)) {
    zip.file(filePath, content);
  }
  return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const pwdHash = await hashPassword('Password@123');

  adminUser = await User.create({
    firstName: 'Import',
    lastName: 'Admin',
    email: 'import_admin@example.com',
    passwordHash: pwdHash,
    role: ROLES.SUPER_ADMIN,
    status: 'active',
    isEmailVerified: true
  });
  adminToken = generateAccessToken(adminUser);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Category.deleteMany({});
  await Brand.deleteMany({});
  await Product.deleteMany({});
  await ImportJob.deleteMany({});
});

describe('Phase 10B — Bulk Products Import with Images ZIP & Category Tree Test Suite', () => {
  it('1. SKU-folder matching (case/space) and main-first ordering', async () => {
    // Setup prerequisite category & brand
    const cat = await Category.create({ name: 'Cosmetics', slug: 'cosmetics' });
    const brand = await Brand.create({ name: 'Mosmac', slug: 'mosmac' });

    // Excel row has lowercase 'sku001'
    const excelRows = [
      {
        'Product Title *': 'Ultra Definition Liquid Foundation',
        'SKU *': 'sku001',
        'Slug *': 'ultra-definition-liquid-foundation',
        'Description *': 'Flawless 18 shades foundation',
        'Category Slug *': 'cosmetics',
        'Brand Slug *': 'mosmac',
        'Selling Price (INR) *': '1499',
        'MRP (INR) *': '1999',
        Status: 'published',
        'Is Featured': 'true',
        'Image URLs': '',
        'Variant Title': 'Default',
        'Stock Quantity': '50',
        'SEO Title': 'Foundation',
        'SEO Description': 'Foundation desc'
      }
    ];
    const excelBuf = await createExcelBuffer(excelRows);

    // ZIP folder has uppercase with spaces '  SKU001  '
    const zipBuf = await createZipBuffer({
      'PRODUCT_IMAGES/  SKU001  /image_2.jpg': TINY_JPEG,
      'PRODUCT_IMAGES/  SKU001  /main.jpg': TINY_JPEG
    });

    // Step 1: Validate
    const valRes = await request(app)
      .post('/api/v1/admin/bulk/products/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', excelBuf, 'products.xlsx')
      .attach('imagesZip', zipBuf, 'images.zip')
      .expect(200);

    expect(valRes.body.data.validRows).toBe(1);
    expect(valRes.body.data.hasImagesZip).toBe(true);
    expect(valRes.body.data.imagesFound).toBe(2);
    expect(valRes.body.data.skuFoldersFound).toBe(1);
    expect(valRes.body.data.productsWithImages).toBe(1);

    const jobId = valRes.body.data.jobId;

    // Step 2: Execute
    const execRes = await request(app)
      .post('/api/v1/admin/bulk/products/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ jobId, importMode: 'create_only' })
      .expect(200);

    expect(execRes.body.data.createdCount).toBe(1);
    expect(execRes.body.data.imagesUploaded).toBe(2);

    // Verify in DB: main.jpg is order 0 with isPrimary = true
    const product = await Product.findOne({ 'variants.sku': 'SKU001' });
    expect(product).toBeTruthy();
    expect(product.images.length).toBe(2);
    expect(product.images[0].isPrimary).toBe(true);
    expect(product.images[0].order).toBe(0);
    expect(product.images[0].alt).toContain('main');
    expect(product.images[1].isPrimary).toBe(false);
    expect(product.images[1].order).toBe(1);
  });

  it('2. Natural sort order: main first, then image_2, image_9, image_10', async () => {
    await Category.create({ name: 'Cosmetics', slug: 'cosmetics' });
    await Brand.create({ name: 'Mosmac', slug: 'mosmac' });

    const excelRows = [
      {
        'Product Title *': 'Loose Setting Powder',
        'SKU *': 'POWDER-01',
        'Slug *': 'loose-setting-powder',
        'Description *': 'Oil control powder',
        'Category Slug *': 'cosmetics',
        'Brand Slug *': 'mosmac',
        'Selling Price (INR) *': '899',
        'MRP (INR) *': '1299',
        Status: 'published',
        'Is Featured': 'false',
        'Image URLs': '',
        'Variant Title': 'Default',
        'Stock Quantity': '20'
      }
    ];
    const excelBuf = await createExcelBuffer(excelRows);

    // Provide images in scrambled order (image_10, image_2, main, image_9)
    const zipBuf = await createZipBuffer({
      'PRODUCT_IMAGES/POWDER-01/image_10.png': TINY_PNG,
      'PRODUCT_IMAGES/POWDER-01/image_2.png': TINY_PNG,
      'PRODUCT_IMAGES/POWDER-01/main.png': TINY_PNG,
      'PRODUCT_IMAGES/POWDER-01/image_9.png': TINY_PNG
    });

    const valRes = await request(app)
      .post('/api/v1/admin/bulk/products/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', excelBuf, 'powder.xlsx')
      .attach('imagesZip', zipBuf, 'powder.zip')
      .expect(200);

    const execRes = await request(app)
      .post('/api/v1/admin/bulk/products/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ jobId: valRes.body.data.jobId, importMode: 'create_only' })
      .expect(200);

    expect(execRes.body.data.imagesUploaded).toBe(4);

    const product = await Product.findOne({ 'variants.sku': 'POWDER-01' });
    expect(product.images.length).toBe(4);
    // main first, then image_2, then image_9, then image_10
    expect(product.images[0].alt).toContain('main');
    expect(product.images[1].alt).toContain('image_2');
    expect(product.images[2].alt).toContain('image_9');
    expect(product.images[3].alt).toContain('image_10');
  });

  it('3. Re-import with no duplicates via contentHash idempotency', async () => {
    await Category.create({ name: 'Lips', slug: 'lips' });
    await Brand.create({ name: 'Mosmac', slug: 'mosmac' });

    const excelRows = [
      {
        'Product Title *': 'Cherry Lip Balm SPF 50',
        'SKU *': 'LIP-01',
        'Slug *': 'cherry-lip-balm-spf-50',
        'Description *': 'Hydrating lip balm with SPF 50',
        'Category Slug *': 'lips',
        'Brand Slug *': 'mosmac',
        'Selling Price (INR) *': '399',
        'MRP (INR) *': '499',
        Status: 'published',
        'Is Featured': 'true',
        'Image URLs': '',
        'Variant Title': 'Default',
        'Stock Quantity': '100'
      }
    ];
    const excelBuf = await createExcelBuffer(excelRows);
    const zipBuf = await createZipBuffer({
      'PRODUCT_IMAGES/LIP-01/main.jpg': TINY_JPEG,
      'PRODUCT_IMAGES/LIP-01/image_2.jpg': TINY_JPEG
    });

    // First import
    const valRes1 = await request(app)
      .post('/api/v1/admin/bulk/products/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', excelBuf, 'lips.xlsx')
      .attach('imagesZip', zipBuf, 'lips.zip')
      .expect(200);

    await request(app)
      .post('/api/v1/admin/bulk/products/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ jobId: valRes1.body.data.jobId, importMode: 'create_only' })
      .expect(200);

    // Second import with mode 'update_existing' and replaceImages = false
    const valRes2 = await request(app)
      .post('/api/v1/admin/bulk/products/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', excelBuf, 'lips.xlsx')
      .attach('imagesZip', zipBuf, 'lips.zip')
      .expect(200);

    const execRes2 = await request(app)
      .post('/api/v1/admin/bulk/products/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        jobId: valRes2.body.data.jobId,
        importMode: 'update_existing',
        replaceImages: false
      })
      .expect(200);

    expect(execRes2.body.data.imagesUploaded).toBe(0);
    expect(execRes2.body.data.imagesSkipped).toBe(2);

    const product = await Product.findOne({ 'variants.sku': 'LIP-01' });
    // Still exactly 2 images, not duplicated to 4
    expect(product.images.length).toBe(2);
  });

  it('4. Excel SKU without folder & orphan folder warnings', async () => {
    await Category.create({ name: 'Eyes', slug: 'eyes' });
    await Brand.create({ name: 'Mosmac', slug: 'mosmac' });

    const excelRows = [
      {
        'Product Title *': 'No Smudge Eyeliner',
        'SKU *': 'EYE-01',
        'Slug *': 'no-smudge-eyeliner',
        'Description *': 'Waterproof eyeliner',
        'Category Slug *': 'eyes',
        'Brand Slug *': 'mosmac',
        'Selling Price (INR) *': '499',
        'MRP (INR) *': '699',
        Status: 'published',
        'Is Featured': 'false',
        'Image URLs': '',
        'Variant Title': 'Default',
        'Stock Quantity': '30'
      }
    ];
    const excelBuf = await createExcelBuffer(excelRows);

    // ZIP contains ORPHAN-SKU-99, but EYE-01 has no folder
    const zipBuf = await createZipBuffer({
      'PRODUCT_IMAGES/ORPHAN-SKU-99/main.jpg': TINY_JPEG
    });

    const valRes = await request(app)
      .post('/api/v1/admin/bulk/products/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', excelBuf, 'eyes.xlsx')
      .attach('imagesZip', zipBuf, 'eyes.zip')
      .expect(200);

    expect(valRes.body.data.excelSkusWithoutImages).toBe(1);
    expect(valRes.body.data.orphanFoldersCount).toBe(1);
    expect(valRes.body.data.imageWarnings.length).toBeGreaterThanOrEqual(2);
  });

  it('5. Security: Rejection of Zip-Slip path traversal attempt', async () => {
    await Category.create({ name: 'Misc', slug: 'misc' });
    await Brand.create({ name: 'Mosmac', slug: 'mosmac' });

    const excelRows = [
      {
        'Product Title *': 'Test Product',
        'SKU *': 'SEC-01',
        'Slug *': 'test-sec-01',
        'Description *': 'Test security',
        'Category Slug *': 'misc',
        'Brand Slug *': 'mosmac',
        'Selling Price (INR) *': '500',
        'MRP (INR) *': '600'
      }
    ];
    const excelBuf = await createExcelBuffer(excelRows);

    // Path traversal in ZIP entry
    const maliciousZip = new JSZip();
    maliciousZip.file('../../etc/passwd', TINY_JPEG);
    const malZipBuf = await maliciousZip.generateAsync({ type: 'nodebuffer' });

    const res = await request(app)
      .post('/api/v1/admin/bulk/products/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', excelBuf, 'sec.xlsx')
      .attach('imagesZip', malZipBuf, 'bad.zip');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('path traversal');
  });

  it('6. Rejection of corrupt or non-zip file in imagesZip', async () => {
    const excelRows = [
      {
        'Product Title *': 'Test Product',
        'SKU *': 'CORRUPT-01',
        'Slug *': 'corrupt-01',
        'Description *': 'Corrupt zip test',
        'Category Slug *': 'misc',
        'Brand Slug *': 'mosmac',
        'Selling Price (INR) *': '500',
        'MRP (INR) *': '600'
      }
    ];
    const excelBuf = await createExcelBuffer(excelRows);
    const fakeZipBuf = Buffer.from('This is not a zip file at all');

    const res = await request(app)
      .post('/api/v1/admin/bulk/products/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', excelBuf, 'products.xlsx')
      .attach('imagesZip', fakeZipBuf, 'corrupt.zip');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Failed to read ZIP archive');
  });

  it('7. Excel-only import backward compatibility (no ZIP attached)', async () => {
    await Category.create({ name: 'Skincare', slug: 'skincare' });
    await Brand.create({ name: 'Mosmac', slug: 'mosmac' });

    const excelRows = [
      {
        'Product Title *': 'Night Serum',
        'SKU *': 'SERUM-01',
        'Slug *': 'night-serum',
        'Description *': 'Restorative night serum',
        'Category Slug *': 'skincare',
        'Brand Slug *': 'mosmac',
        'Selling Price (INR) *': '1299',
        'MRP (INR) *': '1599',
        Status: 'published',
        'Is Featured': 'false',
        'Image URLs': 'https://example.com/serum.jpg',
        'Variant Title': '30ml',
        'Stock Quantity': '25'
      }
    ];
    const excelBuf = await createExcelBuffer(excelRows);

    // Validate without attaching imagesZip
    const valRes = await request(app)
      .post('/api/v1/admin/bulk/products/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', excelBuf, 'serum.xlsx')
      .expect(200);

    expect(valRes.body.data.hasImagesZip).toBe(false);
    expect(valRes.body.data.validRows).toBe(1);

    const execRes = await request(app)
      .post('/api/v1/admin/bulk/products/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ jobId: valRes.body.data.jobId, importMode: 'create_only' })
      .expect(200);

    expect(execRes.body.data.createdCount).toBe(1);

    const product = await Product.findOne({ 'variants.sku': 'SERUM-01' });
    expect(product).toBeTruthy();
    expect(product.images.length).toBe(1);
    expect(product.images[0].url).toBe('https://example.com/serum.jpg');
  });

  it('8. Multi-tier category import (3 levels in arbitrary order) resolves in topological order', async () => {
    // Arbitrary order: grandchild first, then root, then child!
    const categoryRows = [
      {
        'Category Name *': 'Liquid Foundation',
        'Category Slug *': 'liquid-foundation',
        Description: 'Liquid foundations',
        'Parent Slug': 'face-makeup',
        'Display Order': '3',
        'Is Active': 'true'
      },
      {
        'Category Name *': 'Makeup',
        'Category Slug *': 'makeup',
        Description: 'Top level makeup',
        'Parent Slug': '',
        'Display Order': '1',
        'Is Active': 'true'
      },
      {
        'Category Name *': 'Face Makeup',
        'Category Slug *': 'face-makeup',
        Description: 'Face makeup subcategory',
        'Parent Slug': 'makeup',
        'Display Order': '2',
        'Is Active': 'true'
      }
    ];

    const excelBuf = await createExcelBuffer(categoryRows);

    const valRes = await request(app)
      .post('/api/v1/admin/bulk/categories/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', excelBuf, 'categories.xlsx')
      .expect(200);

    // All 3 rows must be recognized as valid (parent resolved within sheet)
    expect(valRes.body.data.validRows).toBe(3);
    expect(valRes.body.data.invalidRows).toBe(0);

    const execRes = await request(app)
      .post('/api/v1/admin/bulk/categories/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ jobId: valRes.body.data.jobId, importMode: 'create_only' })
      .expect(200);

    expect(execRes.body.data.createdCount).toBe(3);

    // Verify DB relationships
    const root = await Category.findOne({ slug: 'makeup' });
    const child = await Category.findOne({ slug: 'face-makeup' });
    const grandchild = await Category.findOne({ slug: 'liquid-foundation' });

    expect(root).toBeTruthy();
    expect(root.parentId).toBeNull();

    expect(child).toBeTruthy();
    expect(child.parentId.toString()).toBe(root._id.toString());

    expect(grandchild).toBeTruthy();
    expect(grandchild.parentId.toString()).toBe(child._id.toString());
  });
});
