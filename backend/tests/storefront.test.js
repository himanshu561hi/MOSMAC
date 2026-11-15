import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Brand } from '../src/models/Brand.js';
import { Product } from '../src/models/Product.js';
import { AttributeDefinition } from '../src/models/AttributeDefinition.js';
import { hashPassword } from '../src/services/passwordService.js';

let mongoServer;
let testCategory;
let testBrand;
let testProduct1;
let testProduct2;
let outOfStockProduct;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup test category
  testCategory = await Category.create({
    name: 'Laptops & Computers',
    slug: 'laptops-computers',
    description: 'High performance computing gear',
    displayOrder: 1,
    isActive: true
  });

  // Setup test brand
  testBrand = await Brand.create({
    name: 'AeroTech',
    slug: 'aerotech',
    description: 'Next-gen computing',
    isActive: true
  });

  // Setup dynamic attribute definition
  await AttributeDefinition.create({
    categoryId: testCategory._id,
    name: 'RAM',
    code: 'ram',
    type: 'select',
    options: ['8GB', '16GB', '32GB'],
    isRequired: false,
    isFilterable: true
  });

  // Setup products: 1 published in stock, 1 published featured, 1 out of stock
  testProduct1 = await Product.create({
    title: 'AeroBook Pro 16',
    slug: 'aerobook-pro-16',
    description: 'High performance flagship laptop',
    categoryId: testCategory._id,
    brandId: testBrand._id,
    status: 'published',
    isFeatured: true,
    badges: ['BESTSELLER'],
    ratings: { average: 4.8, count: 24 },
    attributes: [{ attributeId: new mongoose.Types.ObjectId(), code: 'ram', value: '16GB' }],
    variants: [
      {
        sku: 'AERO-16-16GB',
        title: '16GB RAM / 512GB SSD',
        price: 8999900, // ₹89,999.00
        mrp: 9999900,   // ₹99,999.00
        stockQuantity: 15,
        isActive: true
      }
    ],
    seo: { keywords: ['laptop', 'ultrabook', 'aerobook'] }
  });

  testProduct2 = await Product.create({
    title: 'AeroBook Air 13',
    slug: 'aerobook-air-13',
    description: 'Lightweight ultraportable laptop',
    categoryId: testCategory._id,
    brandId: testBrand._id,
    status: 'published',
    isFeatured: false,
    ratings: { average: 4.2, count: 10 },
    attributes: [{ attributeId: new mongoose.Types.ObjectId(), code: 'ram', value: '8GB' }],
    variants: [
      {
        sku: 'AERO-13-8GB',
        title: '8GB RAM / 256GB SSD',
        price: 5999900, // ₹59,999.00
        mrp: 6999900,   // ₹69,999.00
        stockQuantity: 20,
        isActive: true
      }
    ]
  });

  outOfStockProduct = await Product.create({
    title: 'AeroBook Studio 14',
    slug: 'aerobook-studio-14',
    description: 'Creative studio laptop',
    categoryId: testCategory._id,
    brandId: testBrand._id,
    status: 'published',
    ratings: { average: 3.5, count: 2 },
    variants: [
      {
        sku: 'AERO-14-ZERO',
        title: 'Studio Zero Stock',
        price: 7499900,
        mrp: 8499900,
        stockQuantity: 0,
        isActive: true
      }
    ]
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 4 — Customer Storefront Test Suite', () => {
  describe('1. Homepage Data API', () => {
    it('GET /api/v1/storefront/homepage should return 200 with dynamic sections', async () => {
      const res = await request(app).get('/api/v1/storefront/homepage');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(Array.isArray(data.heroBanners)).toBe(true);
      expect(data.heroBanners.length).toBeGreaterThan(0);
      expect(Array.isArray(data.featuredCategories)).toBe(true);
      expect(Array.isArray(data.featuredProducts)).toBe(true);
      expect(Array.isArray(data.newArrivals)).toBe(true);
      expect(Array.isArray(data.bestSellers)).toBe(true);
      expect(Array.isArray(data.brands)).toBe(true);
      expect(Array.isArray(data.promotionalFeatures)).toBe(true);
    });
  });

  describe('2. Delivery PIN Code Serviceability', () => {
    it('GET /api/v1/storefront/check-pincode should verify valid 6-digit Indian PIN', async () => {
      const res = await request(app).get('/api/v1/storefront/check-pincode?pincode=110001');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isServiceable).toBe(true);
      expect(res.body.data.pincode).toBe('110001');
      expect(res.body.data.estimatedDelivery).toBeDefined();
      expect(res.body.data.codAvailable).toBe(true);
    });

    it('should reject invalid PIN codes with 400 Bad Request', async () => {
      const res1 = await request(app).get('/api/v1/storefront/check-pincode?pincode=010001'); // Starts with 0
      expect(res1.status).toBe(400);

      const res2 = await request(app).get('/api/v1/storefront/check-pincode?pincode=11000'); // 5 digits
      expect(res2.status).toBe(400);

      const res3 = await request(app).get('/api/v1/storefront/check-pincode?pincode=ABCDEF'); // Non-numeric
      expect(res3.status).toBe(400);
    });
  });

  describe('3. Search Autocomplete & Suggestions', () => {
    it('GET /api/v1/products/suggestions should return matching products, categories, and brands', async () => {
      const res = await request(app).get('/api/v1/products/suggestions?q=Aero');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { products, categories, brands } = res.body.data;
      expect(products.length).toBeGreaterThan(0);
      expect(products[0].title).toContain('Aero');
      expect(brands.length).toBeGreaterThan(0);
      expect(brands[0].name).toBe('AeroTech');
    });

    it('GET /api/v1/products/suggestions should return empty suggestions for queries < 2 chars', async () => {
      const res = await request(app).get('/api/v1/products/suggestions?q=a');
      expect(res.status).toBe(200);
      expect(res.body.data.products).toEqual([]);
      expect(res.body.data.categories).toEqual([]);
    });
  });

  describe('4. Storefront Product Listing & Dynamic Filtering', () => {
    it('should filter products by category slug', async () => {
      const res = await request(app).get('/api/v1/products?category=laptops-computers');
      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBeGreaterThan(0);
    });

    it('should filter in-stock products only when inStock=true', async () => {
      const res = await request(app).get('/api/v1/products?inStock=true');
      expect(res.status).toBe(200);
      const skus = res.body.data.products.map((p) => p.slug);
      expect(skus).toContain('aerobook-pro-16');
      expect(skus).not.toContain('aerobook-studio-14'); // Out of stock
    });

    it('should filter products by dynamic attribute (RAM=16GB)', async () => {
      const res = await request(app).get('/api/v1/products?attrs[ram]=16GB');
      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].slug).toBe('aerobook-pro-16');
    });

    it('should filter products by minimum rating', async () => {
      const res = await request(app).get('/api/v1/products?minRating=4.5');
      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].slug).toBe('aerobook-pro-16');
    });

    it('should sort products by price ascending', async () => {
      const res = await request(app).get('/api/v1/products?sortBy=price&sortOrder=asc');
      expect(res.status).toBe(200);
      const prices = res.body.data.products.map((p) => p.basePrice);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });

    it('should search products by partial keyword', async () => {
      const res = await request(app).get('/api/v1/products?search=Pro');
      expect(res.status).toBe(200);
      expect(res.body.data.products.some((p) => p.title.includes('Pro'))).toBe(true);
    });
  });

  describe('5. Product Detail Page & Related Products', () => {
    it('GET /api/v1/products/:slug should return product details and related products', async () => {
      const res = await request(app).get('/api/v1/products/aerobook-pro-16');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { product, relatedProducts } = res.body.data;
      expect(product.slug).toBe('aerobook-pro-16');
      expect(product.variants.length).toBeGreaterThan(0);
      expect(Array.isArray(relatedProducts)).toBe(true);
      // Related products must not include the product itself
      expect(relatedProducts.some((p) => p.slug === 'aerobook-pro-16')).toBe(false);
    });
  });
});

