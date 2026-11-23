import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { Brand } from '../src/models/Brand.js';
import { HomepageSection } from '../src/models/HomepageSection.js';
import { HomepageSectionProduct } from '../src/models/HomepageSectionProduct.js';
import { generateAccessToken } from '../src/services/tokenService.js';
import { hashPassword } from '../src/services/passwordService.js';

let mongoServer;
let adminUser, adminToken;
let customerUser, customerToken;
let cat1, brand1;
let prod1, prod2, prod3;

describe('Dynamic Homepage Section & Product Management Test Suite', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const defaultPwd = await hashPassword('AdminPass123!');

    adminUser = await User.create({
      email: 'admin.hp@example.in',
      passwordHash: defaultPwd,
      firstName: 'Vikram',
      lastName: 'Mehta',
      phone: '9876500001',
      role: 'super_admin',
      status: 'active',
      isEmailVerified: true
    });
    adminToken = generateAccessToken(adminUser);

    customerUser = await User.create({
      email: 'customer.hp@example.in',
      passwordHash: defaultPwd,
      firstName: 'Aarav',
      lastName: 'Sharma',
      phone: '9876500002',
      role: 'customer',
      status: 'active',
      isEmailVerified: true
    });
    customerToken = generateAccessToken(customerUser);

    cat1 = await Category.create({
      name: 'Complexion & Foundation',
      slug: 'complexion-foundation',
      description: 'Foundations and powders',
      isActive: true
    });

    brand1 = await Brand.create({
      name: 'MOSMAC Flagship',
      slug: 'mosmac-flagship',
      isActive: true
    });

    prod1 = await Product.create({
      title: 'MOSMAC Ultra HD Liquid Foundation',
      slug: 'mosmac-ultra-hd-foundation',
      description: 'Long lasting buildable foundation',
      categoryId: cat1._id,
      brandId: brand1._id,
      status: 'published',
      isFeatured: true,
      basePrice: 99900,
      baseMrp: 129900,
      variants: [
        {
          sku: 'MOS-FDN-001',
          title: 'Warm Ivory',
          price: 99900,
          mrp: 129900,
          stockQuantity: 50
        }
      ]
    });

    prod2 = await Product.create({
      title: 'MOSMAC Translucent Finishing Powder',
      slug: 'mosmac-translucent-powder',
      description: 'Micro-fine setting powder',
      categoryId: cat1._id,
      brandId: brand1._id,
      status: 'published',
      basePrice: 59900,
      baseMrp: 79900,
      variants: [
        {
          sku: 'MOS-PWD-001',
          title: 'Universal Translucent',
          price: 59900,
          mrp: 79900,
          stockQuantity: 100
        }
      ]
    });

    prod3 = await Product.create({
      title: 'MOSMAC Cherry Lip Balm SPF 50',
      slug: 'mosmac-cherry-lip-balm-spf50',
      description: 'Enriched tinted lip balm',
      categoryId: cat1._id,
      brandId: brand1._id,
      status: 'published',
      basePrice: 29900,
      baseMrp: 39900,
      variants: [
        {
          sku: 'MOS-LIP-001',
          title: 'Cherry Tint',
          price: 29900,
          mrp: 39900,
          stockQuantity: 75
        }
      ]
    });
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  }, 60000);

  it('1. GET /api/v1/admin/homepage-sections initializes and lists the 5 default sections', async () => {
    const res = await request(app)
      .get('/api/v1/admin/homepage-sections')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const sections = res.body.data.sections;
    expect(sections.length).toBeGreaterThanOrEqual(5);

    const slugs = sections.map((s) => s.slug);
    expect(slugs).toContain('trending');
    expect(slugs).toContain('bestsellers');
    expect(slugs).toContain('most_loved');
    expect(slugs).toContain('featured');
    expect(slugs).toContain('whats_new');
  });

  it('2. Default sections prevent deletion and slug mutation', async () => {
    const trending = await HomepageSection.findOne({ slug: 'trending' });
    expect(trending).toBeDefined();

    // Try deleting default section
    const delRes = await request(app)
      .delete(`/api/v1/admin/homepage-sections/${trending._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(400);
    expect(delRes.body.message).toContain('Default system sections cannot be deleted');

    // Try modifying default section slug
    const updateRes = await request(app)
      .put(`/api/v1/admin/homepage-sections/${trending._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Trending New',
        slug: 'trending_mutated'
      });

    expect(updateRes.status).toBe(400);
    expect(updateRes.body.message).toContain('Section identifier cannot be changed for default system sections');
  });

  it('3. POST /api/v1/admin/homepage-sections creates a custom section', async () => {
    const res = await request(app)
      .post('/api/v1/admin/homepage-sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Top Deals',
        slug: 'top_deals',
        description: 'Exciting discounts and flash offers',
        heading: 'Limited Time Top Deals',
        subtitle: 'Save up to 40% on luxury beauty',
        maxProducts: 6,
        displayPosition: 6,
        showViewAll: true,
        viewAllLink: '/products?sale=true',
        isActive: true
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.section.slug).toBe('top_deals');
    expect(res.body.data.section.isDefault).toBe(false);
  });

  it('4. POST & PUT /api/v1/admin/homepage-sections/:id/products assigns and orders products', async () => {
    const section = await HomepageSection.findOne({ slug: 'top_deals' });

    // Assign prod1 and prod2
    const assignRes = await request(app)
      .post(`/api/v1/admin/homepage-sections/${section._id}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productIds: [prod1._id.toString(), prod2._id.toString()]
      });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.success).toBe(true);
    expect(assignRes.body.data.products.length).toBe(2);

    // Reorder: put prod2 first, then prod1
    const reorderRes = await request(app)
      .put(`/api/v1/admin/homepage-sections/${section._id}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        products: [
          { productId: prod2._id.toString(), displayOrder: 1 },
          { productId: prod1._id.toString(), displayOrder: 2 }
        ]
      });

    expect(reorderRes.status).toBe(200);
    expect(reorderRes.body.data.products[0]._id.toString()).toBe(prod2._id.toString());
    expect(reorderRes.body.data.products[0].displayOrder).toBe(1);
    expect(reorderRes.body.data.products[1]._id.toString()).toBe(prod1._id.toString());
    expect(reorderRes.body.data.products[1].displayOrder).toBe(2);
  });

  it('5. Enforces compound uniqueness: no duplicate products within the same section', async () => {
    const section = await HomepageSection.findOne({ slug: 'top_deals' });

    // Attempt assigning prod1 again
    const dupRes = await request(app)
      .post(`/api/v1/admin/homepage-sections/${section._id}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productIds: [prod1._id.toString()]
      });

    expect(dupRes.status).toBe(200);
    // Should still only have 2 unique products
    expect(dupRes.body.data.products.length).toBe(2);
  });

  it('6. DELETE /api/v1/admin/homepage-sections/:id/products/:productId removes product from section', async () => {
    const section = await HomepageSection.findOne({ slug: 'top_deals' });

    const delRes = await request(app)
      .delete(`/api/v1/admin/homepage-sections/${section._id}/products/${prod1._id.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const checkRes = await request(app)
      .get(`/api/v1/admin/homepage-sections/${section._id}/products`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(checkRes.body.data.products.length).toBe(1);
    expect(checkRes.body.data.products[0]._id.toString()).toBe(prod2._id.toString());
  });

  it('7. GET /api/v1/admin/homepage-sections/search-products provides searchable catalog selector', async () => {
    const res = await request(app)
      .get('/api/v1/admin/homepage-sections/search-products?search=Foundation')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.products[0].title).toContain('Foundation');
    expect(res.body.data.products[0].sku).toBe('MOS-FDN-001');
    expect(res.body.data.products[0].imageUrl).toBeDefined();
    expect(res.body.data.products[0].image).toBeDefined();
  });

  it('8. GET /api/v1/admin/homepage-sections/sample-excel downloads valid .xlsx template', async () => {
    const res = await request(app)
      .get('/api/v1/admin/homepage-sections/sample-excel')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('homepage_sections_sample_template.xlsx');
  });

  it('9. GET /api/v1/admin/homepage-sections/export downloads current section assignments', async () => {
    const res = await request(app)
      .get('/api/v1/admin/homepage-sections/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('.xlsx');
  });

  it('10. GET /api/v1/homepage/sections returns active storefront sections with products in exact order', async () => {
    const res = await request(app).get('/api/v1/homepage/sections');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const sections = res.body.data.sections;
    expect(sections).toBeInstanceOf(Array);
    expect(sections.length).toBeGreaterThan(0);

    // Each active section has heading, slug, and products
    const topDeals = sections.find((s) => s.slug === 'top_deals');
    expect(topDeals).toBeDefined();
    expect(topDeals.heading).toBe('Limited Time Top Deals');
    expect(topDeals.products.length).toBe(1);
    expect(topDeals.products[0]._id.toString()).toBe(prod2._id.toString());
  });

  it('11. Unauthorized access without admin role is forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/admin/homepage-sections')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });
});
