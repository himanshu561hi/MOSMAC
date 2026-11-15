import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Brand } from '../src/models/Brand.js';
import { AttributeDefinition } from '../src/models/AttributeDefinition.js';
import { Product } from '../src/models/Product.js';
import { InventoryLog } from '../src/models/InventoryLog.js';
import { generateAccessToken } from '../src/services/tokenService.js';
import { hashPassword } from '../src/services/passwordService.js';
import { ROLES } from '../src/constants/roles.js';

let mongoServer;
let adminToken;
let customerToken;
let adminUser;
let customerUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const hashedPassword = await hashPassword('AdminPass123!');

  adminUser = await User.create({
    email: 'catalogue_admin@example.in',
    passwordHash: hashedPassword,
    firstName: 'Cat',
    lastName: 'Admin',
    role: ROLES.STORE_MANAGER,
    status: 'active'
  });
  adminToken = generateAccessToken(adminUser);

  customerUser = await User.create({
    email: 'catalogue_customer@example.in',
    passwordHash: hashedPassword,
    firstName: 'Regular',
    lastName: 'Customer',
    role: ROLES.CUSTOMER,
    status: 'active'
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
  await AttributeDefinition.deleteMany({});
  await Product.deleteMany({});
  await InventoryLog.deleteMany({});
});

describe('Phase 3 — Catalogue & Dynamic Inventory Engine Test Suite', () => {
  describe('1. Category Management & Hierarchy Rules', () => {
    it('should allow admin to create root and nested child categories', async () => {
      // 1. Create Root Category: Electronics
      const rootRes = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Electronics',
          description: 'Consumer gadgets and devices'
        });

      expect(rootRes.status).toBe(201);
      expect(rootRes.body.data.category.slug).toBe('electronics');
      expect(rootRes.body.data.category.ancestors).toEqual([]);

      const rootId = rootRes.body.data.category._id;

      // 2. Create Child Category: Laptops
      const childRes = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Laptops',
          parentId: rootId
        });

      expect(childRes.status).toBe(201);
      expect(childRes.body.data.category.parentId).toBe(rootId);
      expect(childRes.body.data.category.ancestors).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'Electronics' })])
      );
    });

    it('should reject circular category references (cannot set parent to self or descendant)', async () => {
      // Create Category A -> Category B -> Category C
      const catA = await Category.create({ name: 'Cat A', slug: 'cat-a' });
      const catB = await Category.create({
        name: 'Cat B',
        slug: 'cat-b',
        parentId: catA._id,
        ancestors: [{ _id: catA._id, name: catA.name, slug: catA.slug }]
      });
      const catC = await Category.create({
        name: 'Cat C',
        slug: 'cat-c',
        parentId: catB._id,
        ancestors: [
          { _id: catA._id, name: catA.name, slug: catA.slug },
          { _id: catB._id, name: catB.name, slug: catB.slug }
        ]
      });

      // 1. Attempt to set Cat A parent to self
      const selfRes = await request(app)
        .put(`/api/v1/categories/${catA._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ parentId: catA._id.toString() });

      expect(selfRes.status).toBe(400);
      expect(selfRes.body.message).toContain('cannot be its own parent');

      // 2. Attempt to set Cat A parent to descendant Cat C (Circular!)
      const circRes = await request(app)
        .put(`/api/v1/categories/${catA._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ parentId: catC._id.toString() });

      expect(circRes.status).toBe(400);
      expect(circRes.body.message).toContain('Circular reference detected');
    });

    it('should reject duplicate category slugs', async () => {
      await Category.create({ name: 'Fashion', slug: 'fashion' });

      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Fashion Brand', slug: 'fashion' });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });

    it('should block category deletion if child categories or products exist', async () => {
      const parent = await Category.create({ name: 'Parent', slug: 'parent' });
      await Category.create({ name: 'Child', slug: 'child', parentId: parent._id });

      const deleteRes = await request(app)
        .delete(`/api/v1/categories/${parent._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(400);
      expect(deleteRes.body.message).toContain('Cannot delete category with');
    });
  });

  describe('2. Brand Management', () => {
    it('should allow admin to create and list unique brands', async () => {
      const res = await request(app)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sony',
          description: 'Global electronics brand',
          website: 'https://sony.com'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.brand.slug).toBe('sony');

      // Duplicate name check
      const dupRes = await request(app)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sony' });

      expect(dupRes.status).toBe(409);
    });
  });

  describe('3. Dynamic Category Attributes', () => {
    let clothingCategory;

    beforeEach(async () => {
      clothingCategory = await Category.create({ name: 'Clothing', slug: 'clothing' });
    });

    it('should create dynamic attributes (select, text, number) for category', async () => {
      // 1. Create Select Attribute: Size
      const sizeRes = await request(app)
        .post('/api/v1/attributes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          categoryId: clothingCategory._id.toString(),
          name: 'Size',
          code: 'size',
          type: 'select',
          options: ['S', 'M', 'L', 'XL'],
          isRequired: true
        });

      expect(sizeRes.status).toBe(201);
      expect(sizeRes.body.data.attribute.code).toBe('size');

      // 2. Create Text Attribute: Material
      const matRes = await request(app)
        .post('/api/v1/attributes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          categoryId: clothingCategory._id.toString(),
          name: 'Material',
          code: 'material',
          type: 'text',
          isRequired: false
        });

      expect(matRes.status).toBe(201);

      // 3. Fetch attributes for category
      const getRes = await request(app).get(`/api/v1/attributes/category/${clothingCategory._id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.attributes.length).toBe(2);
    });
  });

  describe('4. Products, Dynamic Attributes & Variants', () => {
    let category;
    let brand;

    beforeEach(async () => {
      category = await Category.create({ name: 'Smartphones', slug: 'smartphones' });
      brand = await Brand.create({ name: 'Apple', slug: 'apple' });

      // Define required attribute: RAM (select)
      await AttributeDefinition.create({
        categoryId: category._id,
        name: 'RAM',
        code: 'ram',
        type: 'select',
        options: ['4GB', '8GB', '16GB'],
        isRequired: true
      });
    });

    it('should create product with valid attributes and variants in paise', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'iPhone 15 Pro',
          description: 'Flagship smartphone',
          categoryId: category._id.toString(),
          brandId: brand._id.toString(),
          status: 'published',
          attributes: [
            {
              attributeId: new mongoose.Types.ObjectId().toString(),
              code: 'ram',
              value: '8GB' // Valid option
            }
          ],
          variants: [
            {
              sku: 'IP15P-128-BLK',
              title: '128GB Black',
              attributes: { storage: '128GB', color: 'Black' },
              price: 11990000, // ₹1,19,900.00 in paise
              mrp: 12990000,   // ₹1,29,900.00 in paise
              stockQuantity: 15
            },
            {
              sku: 'IP15P-256-BLK',
              title: '256GB Black',
              attributes: { storage: '256GB', color: 'Black' },
              price: 12990000, // ₹1,29,900.00 in paise
              mrp: 13990000,   // ₹1,39,900.00 in paise
              stockQuantity: 10
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product.slug).toBe('iphone-15-pro');
      expect(res.body.data.product.basePrice).toBe(11990000); // Computed lowest variant price

      // Initial stock logs should have been created
      const logs = await InventoryLog.find({ productId: res.body.data.product._id });
      expect(logs.length).toBe(2);
    });

    it('should reject product if required category attribute is missing or invalid', async () => {
      // 1. Missing required 'ram' attribute
      const missingRes = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'iPhone Without Ram',
          description: 'Testing validation',
          categoryId: category._id.toString(),
          brandId: brand._id.toString(),
          variants: [
            {
              sku: 'TEST-SKU-1',
              title: 'Standard',
              price: 500000,
              mrp: 600000,
              stockQuantity: 5
            }
          ]
        });

      expect(missingRes.status).toBe(400);
      expect(missingRes.body.message).toContain("Attribute 'RAM' (ram) is required");

      // 2. Invalid option '32GB' (not in allowed options ['4GB', '8GB', '16GB'])
      const invalidOptionRes = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'iPhone Invalid Ram',
          description: 'Testing validation',
          categoryId: category._id.toString(),
          brandId: brand._id.toString(),
          attributes: [{ attributeId: new mongoose.Types.ObjectId().toString(), code: 'ram', value: '32GB' }],
          variants: [
            {
              sku: 'TEST-SKU-2',
              title: 'Standard',
              price: 500000,
              mrp: 600000,
              stockQuantity: 5
            }
          ]
        });

      expect(invalidOptionRes.status).toBe(400);
      expect(invalidOptionRes.body.message).toContain("Invalid option '32GB' for 'RAM'");
    });

    it('should reject product when selling price exceeds MRP', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Overpriced Phone',
          description: 'Invalid price test',
          categoryId: category._id.toString(),
          brandId: brand._id.toString(),
          attributes: [{ attributeId: new mongoose.Types.ObjectId().toString(), code: 'ram', value: '8GB' }],
          variants: [
            {
              sku: 'OVERPRICE-1',
              title: 'Standard',
              price: 150000, // Price: ₹1,500
              mrp: 100000,   // MRP: ₹1,000 (Invalid: Price > MRP!)
              stockQuantity: 5
            }
          ]
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('Validation failed');
    });

    it('should prevent duplicate variant combinations in same product', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Duplicate Combinations',
          description: 'Testing duplicate variant combinations',
          categoryId: category._id.toString(),
          brandId: brand._id.toString(),
          attributes: [{ attributeId: new mongoose.Types.ObjectId().toString(), code: 'ram', value: '8GB' }],
          variants: [
            {
              sku: 'SKU-A',
              title: 'Variant 1',
              attributes: { color: 'Blue', size: 'M' },
              price: 100000,
              mrp: 120000,
              stockQuantity: 5
            },
            {
              sku: 'SKU-B',
              title: 'Variant 2',
              attributes: { color: 'Blue', size: 'M' }, // Duplicate combination!
              price: 100000,
              mrp: 120000,
              stockQuantity: 5
            }
          ]
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Duplicate variant combination detected');
    });
  });

  describe('5. Inventory Management & Atomic Concurrency', () => {
    let testProduct;
    const testSku = 'INV-TEST-001';

    beforeEach(async () => {
      const category = await Category.create({ name: 'Gadgets', slug: 'gadgets' });
      const brand = await Brand.create({ name: 'BrandX', slug: 'brandx' });

      testProduct = await Product.create({
        title: 'Inventory Item',
        slug: 'inventory-item',
        description: 'Testing inventory',
        categoryId: category._id,
        brandId: brand._id,
        status: 'published',
        variants: [
          {
            sku: testSku,
            title: 'Base SKU',
            price: 50000,
            mrp: 60000,
            stockQuantity: 20,
            reservedQuantity: 0
          }
        ]
      });
    });

    it('should adjust stock positively and record audit log', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sku: testSku,
          delta: 10,
          reason: 'restock',
          note: 'Shipment received from vendor'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.variant.stockQuantity).toBe(30);

      // Verify audit log entry
      const log = await InventoryLog.findOne({ sku: testSku });
      expect(log).toBeDefined();
      expect(log.previousStock).toBe(20);
      expect(log.newStock).toBe(30);
      expect(log.delta).toBe(10);
      expect(log.reason).toBe('restock');
    });

    it('should prevent negative stock when deduction exceeds available inventory', async () => {
      // Current stock is 20. Attempt to deduct 25!
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sku: testSku,
          delta: -25,
          reason: 'damaged',
          note: 'Damaged in transit'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INSUFFICIENT_STOCK');

      // Verify stock remained 20
      const checkProduct = await Product.findById(testProduct._id);
      expect(checkProduct.variants[0].stockQuantity).toBe(20);
    });

    it('should handle concurrent deductions safely and prevent race condition overdraw', async () => {
      // Execute 5 concurrent requests, each trying to deduct 10 units (Total attempted: 50 from 20 available)
      const attempts = Array.from({ length: 5 }).map(() =>
        request(app)
          .post('/api/v1/inventory/adjust')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            sku: testSku,
            delta: -10,
            reason: 'correction'
          })
      );

      const results = await Promise.all(attempts);
      const successes = results.filter((r) => r.status === 200);
      const failures = results.filter((r) => r.status === 400);

      // Exactly 2 requests should succeed (2 x 10 = 20) and 3 should fail with INSUFFICIENT_STOCK!
      expect(successes.length).toBe(2);
      expect(failures.length).toBe(3);

      const finalProduct = await Product.findById(testProduct._id);
      expect(finalProduct.variants[0].stockQuantity).toBe(0);
    });

    it('should reject unauthorized customer attempting inventory adjustment with 403', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          sku: testSku,
          delta: 10,
          reason: 'restock'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('6. Cloudinary Media Security & Signed Upload Parameters', () => {
    it('should return signed upload credentials for authorized staff', async () => {
      const res = await request(app)
        .get('/api/v1/media/signature?folder=ecommerce/products&mimeType=image/png&sizeBytes=1048576')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.signature).toBeDefined();
      expect(res.body.data.timestamp).toBeDefined();
      expect(res.body.data.folder).toBe('ecommerce/products');
    });

    it('should reject invalid image MIME types with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/v1/media/signature?folder=ecommerce/products&mimeType=application/pdf&sizeBytes=1048576')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid image MIME type');
    });
  });
});

