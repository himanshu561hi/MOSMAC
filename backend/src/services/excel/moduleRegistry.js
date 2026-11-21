import mongoose from 'mongoose';
import { Product } from '../../models/Product.js';
import { Category } from '../../models/Category.js';
import { Brand } from '../../models/Brand.js';
import { AttributeDefinition, ATTRIBUTE_TYPES } from '../../models/AttributeDefinition.js';
import { Coupon } from '../../models/Coupon.js';
import { ContentPage } from '../../models/ContentPage.js';
import { FAQ, FAQ_CATEGORIES } from '../../models/FAQ.js';
import { Banner, BANNER_TYPES } from '../../models/Banner.js';
import { User } from '../../models/User.js';
import { Order } from '../../models/Order.js';
import { Payment } from '../../models/Payment.js';
import { Review } from '../../models/Review.js';
import { inventoryOperationsService } from '../inventoryOperationsService.js';
import { cmsService } from '../cmsService.js';
import { ApiError } from '../../utils/ApiError.js';

export const MODULE_DEFINITIONS = {
  // 1. PRODUCTS
  products: {
    id: 'products',
    name: 'Products & Catalogue',
    supportsImport: true,
    supportsExport: true,
    columns: [
      { key: 'title', label: 'Product Title', required: true, type: 'String', width: 28, description: 'Display name of the product' },
      { key: 'sku', label: 'SKU', required: true, type: 'String', width: 18, description: 'Unique stock keeping unit' },
      { key: 'slug', label: 'Slug', required: true, type: 'String', width: 22, description: 'URL-friendly slug (e.g. organic-cotton-tee)' },
      { key: 'description', label: 'Description', required: true, type: 'String', width: 35, description: 'Detailed product description' },
      { key: 'category', label: 'Category Slug', required: true, type: 'String', width: 20, description: 'Slug of existing category' },
      { key: 'brand', label: 'Brand Slug', required: true, type: 'String', width: 18, description: 'Slug of existing brand' },
      { key: 'basePrice', label: 'Selling Price (INR)', required: true, type: 'Number', width: 18, description: 'Selling price in whole INR' },
      { key: 'baseMrp', label: 'MRP (INR)', required: true, type: 'Number', width: 16, description: 'Maximum Retail Price in whole INR' },
      { key: 'status', label: 'Status', required: false, type: 'Enum', allowedValues: ['draft', 'published', 'archived'], width: 14, description: 'Publication status' },
      { key: 'isFeatured', label: 'Is Featured', required: false, type: 'Boolean', allowedValues: ['true', 'false'], width: 14, description: 'Feature on storefront' },
      { key: 'images', label: 'Image URLs', required: false, type: 'String', width: 30, description: 'Comma-separated URLs' },
      { key: 'variantTitle', label: 'Variant Title', required: false, type: 'String', width: 18, description: 'Title of default variant' },
      { key: 'variantStock', label: 'Stock Quantity', required: false, type: 'Number', width: 16, description: 'Initial inventory quantity' },
      { key: 'metaTitle', label: 'SEO Title', required: false, type: 'String', width: 25, description: 'SEO Meta Title' },
      { key: 'metaDescription', label: 'SEO Description', required: false, type: 'String', width: 30, description: 'SEO Meta Description' }
    ],
    sampleRows: [
      {
        title: 'Classic Oxford Cotton Shirt',
        sku: 'OXF-SHT-WHT-01',
        slug: 'classic-oxford-cotton-shirt',
        description: 'Premium tailored formal shirt with breathable cotton weave.',
        category: 'mens-apparel',
        brand: 'aura-craft',
        basePrice: 1999,
        baseMrp: 2999,
        status: 'published',
        isFeatured: 'true',
        images: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c',
        variantTitle: 'White / M',
        variantStock: 50,
        metaTitle: 'Classic Oxford Cotton Shirt | Aura',
        metaDescription: 'Shop our premium 100% cotton Oxford shirt with crisp collar.'
      }
    ],
    async getReferenceData() {
      const [categories, brands] = await Promise.all([
        Category.find({ isActive: true }).select('name slug').lean(),
        Brand.find({ isActive: true }).select('name slug').lean()
      ]);
      return {
        categories,
        brands,
        statuses: ['draft', 'published', 'archived']
      };
    },
    async validateRow(row, rowIndex, context) {
      const errors = [];
      const title = String(row.title || '').trim();
      const sku = String(row.sku || '').trim().toUpperCase();
      const slug = String(row.slug || '').trim().toLowerCase();
      const categorySlug = String(row.category || '').trim().toLowerCase();
      const brandSlug = String(row.brand || '').trim().toLowerCase();
      const basePrice = parseFloat(row.basePrice);
      const baseMrp = parseFloat(row.baseMrp);

      if (!title || title.length < 3) {
        errors.push({ column: 'Product Title', value: title, reason: 'Title must be at least 3 characters', suggestion: 'Provide a descriptive title' });
      }
      if (!sku) {
        errors.push({ column: 'SKU', value: sku, reason: 'SKU is required', suggestion: 'Provide unique alphanumeric SKU' });
      }
      if (!slug) {
        errors.push({ column: 'Slug', value: slug, reason: 'Slug is required', suggestion: 'Provide lowercased URL slug' });
      }
      if (row.basePrice === undefined || row.basePrice === null || String(row.basePrice).trim() === '') {
        errors.push({ column: 'Selling Price (INR)', value: '', reason: 'Selling Price is required (blank prices are not allowed)', suggestion: 'Provide selling price in whole INR' });
      } else if (isNaN(basePrice) || basePrice < 0) {
        errors.push({ column: 'Selling Price (INR)', value: row.basePrice, reason: 'Price must be a valid non-negative number', suggestion: 'e.g. 1999' });
      }

      if (row.baseMrp === undefined || row.baseMrp === null || String(row.baseMrp).trim() === '') {
        errors.push({ column: 'MRP (INR)', value: '', reason: 'MRP is required (blank prices are not allowed)', suggestion: 'Provide MRP in whole INR' });
      } else if (isNaN(baseMrp) || baseMrp < 0) {
        errors.push({ column: 'MRP (INR)', value: row.baseMrp, reason: 'MRP must be a valid non-negative number', suggestion: 'e.g. 2999' });
      } else if (!isNaN(basePrice) && basePrice > baseMrp) {
        errors.push({ column: 'Selling Price (INR)', value: String(basePrice), reason: 'Selling price cannot exceed MRP', suggestion: 'Ensure Selling Price <= MRP' });
      }

      // Validate category reference
      let categoryId = null;
      if (context.categoryMap && context.categoryMap[categorySlug]) {
        categoryId = context.categoryMap[categorySlug]._id;
      } else {
        errors.push({ column: 'Category Slug', value: categorySlug, reason: `Category '${categorySlug}' does not exist`, suggestion: 'Select category from Reference Data sheet' });
      }

      // Validate brand reference
      let brandId = null;
      if (context.brandMap && context.brandMap[brandSlug]) {
        brandId = context.brandMap[brandSlug]._id;
      } else {
        errors.push({ column: 'Brand Slug', value: brandSlug, reason: `Brand '${brandSlug}' does not exist`, suggestion: 'Select brand from Reference Data sheet' });
      }

      const existingRecord = context.existingProductsBySku ? context.existingProductsBySku[sku] : null;

      return {
        valid: errors.length === 0,
        errors,
        isExisting: !!existingRecord,
        sanitizedData: {
          title,
          sku,
          slug,
          description: String(row.description || title).trim(),
          categoryId,
          brandId,
          basePrice: Math.round(basePrice * 100), // convert INR to paise
          baseMrp: Math.round(baseMrp * 100),     // convert INR to paise
          status: ['published', 'archived', 'draft'].includes(row.status) ? row.status : 'draft',
          isFeatured: String(row.isFeatured).toLowerCase() === 'true',
          images: row.images ? row.images.split(',').map((u, i) => ({ url: u.trim(), isPrimary: i === 0 })) : [],
          variantTitle: String(row.variantTitle || 'Default').trim(),
          variantStock: parseInt(row.variantStock, 10) || 0,
          metaTitle: String(row.metaTitle || title).trim(),
          metaDescription: String(row.metaDescription || '').trim()
        }
      };
    },
    async executeRow({ data, isExisting, mode, user }) {
      const pricePaise = data.basePrice;
      const mrpPaise = data.baseMrp;

      const variantPayload = {
        sku: data.sku,
        title: data.variantTitle,
        price: pricePaise,
        mrp: mrpPaise,
        stockQuantity: data.variantStock,
        reservedQuantity: 0,
        lowStockThreshold: 5,
        isActive: true
      };

      if (isExisting) {
        if (mode === 'create_only') {
          return { action: 'skipped', reason: 'Record already exists and import mode is create_only' };
        }
        const updatePayload = {
          title: data.title,
          description: data.description,
          categoryId: data.categoryId,
          brandId: data.brandId,
          basePrice: pricePaise,
          baseMrp: mrpPaise,
          status: data.status,
          isFeatured: data.isFeatured,
          'seo.metaTitle': data.metaTitle,
          'seo.metaDescription': data.metaDescription
        };

        if (Array.isArray(data.images) && data.images.length > 0) {
          updatePayload.images = data.images;
        }

        await Product.findOneAndUpdate(
          { 'variants.sku': data.sku },
          {
            $set: updatePayload
          }
        );
        return { action: 'updated', sku: data.sku };
      } else {
        if (mode === 'update_existing') {
          return { action: 'skipped', reason: 'Record does not exist and import mode is update_existing' };
        }
        await Product.create({
          title: data.title,
          slug: data.slug,
          description: data.description,
          categoryId: data.categoryId,
          brandId: data.brandId,
          basePrice: pricePaise,
          baseMrp: mrpPaise,
          status: data.status,
          isFeatured: data.isFeatured,
          images: data.images,
          hasVariants: false,
          variants: [variantPayload],
          seo: {
            metaTitle: data.metaTitle,
            metaDescription: data.metaDescription
          }
        });
        return { action: 'created', sku: data.sku };
      }
    },
    async fetchExportData() {
      const products = await Product.find({})
        .populate('categoryId', 'slug')
        .populate('brandId', 'slug')
        .lean();

      return products.map((p) => {
        const primaryVariant = p.variants && p.variants[0] ? p.variants[0] : {};
        return {
          title: p.title,
          sku: primaryVariant.sku || '',
          slug: p.slug,
          description: p.description,
          category: p.categoryId?.slug || '',
          brand: p.brandId?.slug || '',
          basePrice: Math.round((p.basePrice || primaryVariant.price || 0) / 100),
          baseMrp: Math.round((p.baseMrp || primaryVariant.mrp || 0) / 100),
          status: p.status,
          isFeatured: String(p.isFeatured),
          images: (p.images || []).map((img) => img.url).join(','),
          variantTitle: primaryVariant.title || 'Default',
          variantStock: primaryVariant.stockQuantity ?? 0,
          metaTitle: p.seo?.metaTitle || '',
          metaDescription: p.seo?.metaDescription || ''
        };
      });
    }
  },

  // 2. CATEGORIES
  categories: {
    id: 'categories',
    name: 'Categories',
    supportsImport: true,
    supportsExport: true,
    columns: [
      { key: 'name', label: 'Category Name', required: true, type: 'String', width: 24, description: 'Name of the category' },
      { key: 'slug', label: 'Category Slug', required: true, type: 'String', width: 22, description: 'Unique category URL slug' },
      { key: 'description', label: 'Description', required: false, type: 'String', width: 35, description: 'Category summary' },
      { key: 'parentSlug', label: 'Parent Slug', required: false, type: 'String', width: 20, description: 'Slug of parent category (if any)' },
      { key: 'imageUrl', label: 'Image URL', required: false, type: 'String', width: 30, description: 'Cover image URL' },
      { key: 'displayOrder', label: 'Display Order', required: false, type: 'Number', width: 14, description: 'Numerical sort index' },
      { key: 'isActive', label: 'Is Active', required: false, type: 'Boolean', allowedValues: ['true', 'false'], width: 14, description: 'Category visibility' },
      { key: 'metaTitle', label: 'SEO Title', required: false, type: 'String', width: 25, description: 'Meta title' },
      { key: 'metaDescription', label: 'SEO Description', required: false, type: 'String', width: 30, description: 'Meta description' }
    ],
    sampleRows: [
      {
        name: 'Footwear & Shoes',
        slug: 'footwear-shoes',
        description: 'Explore our latest handcrafted leather boots and sneakers.',
        parentSlug: '',
        imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772',
        displayOrder: 1,
        isActive: 'true',
        metaTitle: 'Footwear Collection | Aura',
        metaDescription: 'Discover handcrafted leather footwear for all occasions.'
      }
    ],
    async getReferenceData() {
      const categories = await Category.find({}).select('name slug').lean();
      return {
        existingCategories: categories
      };
    },
    async validateRow(row, rowIndex, context) {
      const errors = [];
      const name = String(row.name || '').trim();
      const slug = String(row.slug || '').trim().toLowerCase();
      const parentSlug = String(row.parentSlug || '').trim().toLowerCase();

      if (!name || name.length < 2) {
        errors.push({ column: 'Category Name', value: name, reason: 'Name must be at least 2 characters', suggestion: 'Provide a valid name' });
      }
      if (!slug) {
        errors.push({ column: 'Category Slug', value: slug, reason: 'Slug is required', suggestion: 'Provide lowercased URL slug' });
      }
      if (parentSlug && parentSlug === slug) {
        errors.push({ column: 'Parent Slug', value: parentSlug, reason: 'Category cannot be its own parent (circular reference)', suggestion: 'Leave blank or specify a valid parent' });
      }

      let parentId = null;
      if (parentSlug) {
        if (context.categoryMap && context.categoryMap[parentSlug]) {
          parentId = context.categoryMap[parentSlug]._id;
        } else if (context.inSheetSlugs && context.inSheetSlugs.has(parentSlug)) {
          // Parent is defined within the same spreadsheet!
          parentId = null; // Will be resolved dynamically during topological execution
        } else {
          errors.push({ column: 'Parent Slug', value: parentSlug, reason: `Parent category '${parentSlug}' not found in database or file`, suggestion: 'Ensure parent category exists or is defined in this sheet' });
        }
      }

      const existingRecord = context.existingCategoriesBySlug ? context.existingCategoriesBySlug[slug] : null;

      return {
        valid: errors.length === 0,
        errors,
        isExisting: !!existingRecord,
        sanitizedData: {
          name,
          slug,
          description: String(row.description || '').trim(),
          parentId,
          parentSlug,
          imageUrl: String(row.imageUrl || '').trim(),
          displayOrder: parseInt(row.displayOrder, 10) || 0,
          isActive: String(row.isActive).toLowerCase() !== 'false',
          metaTitle: String(row.metaTitle || name).trim(),
          metaDescription: String(row.metaDescription || '').trim()
        }
      };
    },
    async executeRow({ data, isExisting, mode, context }) {
      // Dynamically resolve parentId from in-flight created categories if parent was in the same file
      let parentId = data.parentId;
      if (!parentId && data.parentSlug) {
        if (context?.createdCategories && context.createdCategories.has(data.parentSlug)) {
          parentId = context.createdCategories.get(data.parentSlug);
        } else if (context?.categoryMap && context.categoryMap[data.parentSlug]) {
          parentId = context.categoryMap[data.parentSlug]._id;
        }
      }

      if (isExisting) {
        if (mode === 'create_only') {
          return { action: 'skipped', reason: 'Record already exists and import mode is create_only' };
        }
        const updated = await Category.findOneAndUpdate(
          { slug: data.slug },
          {
            $set: {
              name: data.name,
              description: data.description,
              parentId: parentId || null,
              imageUrl: data.imageUrl,
              displayOrder: data.displayOrder,
              isActive: data.isActive,
              'seo.metaTitle': data.metaTitle,
              'seo.metaDescription': data.metaDescription
            }
          },
          { new: true }
        );
        if (context?.createdCategories && updated) {
          context.createdCategories.set(data.slug, updated._id);
        }
        return { action: 'updated', slug: data.slug, id: updated?._id };
      } else {
        if (mode === 'update_existing') {
          return { action: 'skipped', reason: 'Record does not exist and import mode is update_existing' };
        }
        const created = await Category.create({
          name: data.name,
          slug: data.slug,
          description: data.description,
          parentId: parentId || null,
          imageUrl: data.imageUrl,
          displayOrder: data.displayOrder,
          isActive: data.isActive,
          seo: {
            metaTitle: data.metaTitle,
            metaDescription: data.metaDescription
          }
        });
        if (context?.createdCategories && created) {
          context.createdCategories.set(data.slug, created._id);
        }
        return { action: 'created', slug: data.slug, id: created._id };
      }
    },
    async fetchExportData() {
      const categories = await Category.find({}).populate('parentId', 'slug').lean();
      return categories.map((c) => ({
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        parentSlug: c.parentId?.slug || '',
        imageUrl: c.imageUrl || '',
        displayOrder: c.displayOrder || 0,
        isActive: String(c.isActive !== false),
        metaTitle: c.seo?.metaTitle || '',
        metaDescription: c.seo?.metaDescription || ''
      }));
    }
  },

  // 3. BRANDS
  brands: {
    id: 'brands',
    name: 'Brands',
    supportsImport: true,
    supportsExport: true,
    columns: [
      { key: 'name', label: 'Brand Name', required: true, type: 'String', width: 24, description: 'Brand display name' },
      { key: 'slug', label: 'Brand Slug', required: true, type: 'String', width: 22, description: 'Unique brand slug' },
      { key: 'description', label: 'Description', required: false, type: 'String', width: 35, description: 'Brand summary' },
      { key: 'logoUrl', label: 'Logo URL', required: false, type: 'String', width: 30, description: 'Brand logo image URL' },
      { key: 'website', label: 'Website URL', required: false, type: 'String', width: 25, description: 'Official website' },
      { key: 'isActive', label: 'Is Active', required: false, type: 'Boolean', allowedValues: ['true', 'false'], width: 14, description: 'Active status' }
    ],
    sampleRows: [
      {
        name: 'Aura Artisans',
        slug: 'aura-artisans',
        description: 'Sustainable luxury apparel and lifestyle collection.',
        logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9',
        website: 'https://aura-store.example.com',
        isActive: 'true'
      }
    ],
    async getReferenceData() {
      const brands = await Brand.find({}).select('name slug').lean();
      return { existingBrands: brands };
    },
    async validateRow(row, rowIndex, context) {
      const errors = [];
      const name = String(row.name || '').trim();
      const slug = String(row.slug || '').trim().toLowerCase();

      if (!name || name.length < 2) {
        errors.push({ column: 'Brand Name', value: name, reason: 'Brand name must be at least 2 characters', suggestion: 'Provide valid brand name' });
      }
      if (!slug) {
        errors.push({ column: 'Brand Slug', value: slug, reason: 'Brand slug is required', suggestion: 'Provide lowercased URL slug' });
      }

      const existingRecord = context.existingBrandsBySlug ? context.existingBrandsBySlug[slug] : null;

      return {
        valid: errors.length === 0,
        errors,
        isExisting: !!existingRecord,
        sanitizedData: {
          name,
          slug,
          description: String(row.description || '').trim(),
          logoUrl: String(row.logoUrl || '').trim(),
          website: String(row.website || '').trim(),
          isActive: String(row.isActive).toLowerCase() !== 'false'
        }
      };
    },
    async executeRow({ data, isExisting, mode }) {
      if (isExisting) {
        if (mode === 'create_only') return { action: 'skipped', reason: 'Record already exists' };
        await Brand.findOneAndUpdate(
          { slug: data.slug },
          {
            $set: {
              name: data.name,
              description: data.description,
              logoUrl: data.logoUrl,
              website: data.website,
              isActive: data.isActive
            }
          }
        );
        return { action: 'updated', slug: data.slug };
      } else {
        if (mode === 'update_existing') return { action: 'skipped', reason: 'Record does not exist' };
        await Brand.create(data);
        return { action: 'created', slug: data.slug };
      }
    },
    async fetchExportData() {
      const brands = await Brand.find({}).lean();
      return brands.map((b) => ({
        name: b.name,
        slug: b.slug,
        description: b.description || '',
        logoUrl: b.logoUrl || '',
        website: b.website || '',
        isActive: String(b.isActive !== false)
      }));
    }
  },

  // 4. ATTRIBUTES
  attributes: {
    id: 'attributes',
    name: 'Dynamic Attributes',
    supportsImport: true,
    supportsExport: true,
    columns: [
      { key: 'name', label: 'Attribute Name', required: true, type: 'String', width: 22, description: 'Display label' },
      { key: 'code', label: 'Attribute Code', required: true, type: 'String', width: 18, description: 'Lowercase identifier' },
      { key: 'categorySlug', label: 'Category Slug', required: true, type: 'String', width: 20, description: 'Associated category slug' },
      { key: 'type', label: 'Data Type', required: true, type: 'Enum', allowedValues: ATTRIBUTE_TYPES, width: 16, description: 'text, number, boolean, select, multiselect' },
      { key: 'options', label: 'Allowed Options', required: false, type: 'String', width: 28, description: 'Comma-separated options for select types' },
      { key: 'unit', label: 'Measurement Unit', required: false, type: 'String', width: 16, description: 'e.g. cm, kg, ml' },
      { key: 'isRequired', label: 'Is Required', required: false, type: 'Boolean', allowedValues: ['true', 'false'], width: 14, description: 'Enforce on products' },
      { key: 'isFilterable', label: 'Is Filterable', required: false, type: 'Boolean', allowedValues: ['true', 'false'], width: 14, description: 'Enable in storefront filters' }
    ],
    sampleRows: [
      {
        name: 'Fabric Material',
        code: 'fabric_material',
        categorySlug: 'mens-apparel',
        type: 'select',
        options: 'Cotton,Linen,Silk,Polyester',
        unit: '',
        isRequired: 'true',
        isFilterable: 'true'
      }
    ],
    async getReferenceData() {
      const categories = await Category.find({ isActive: true }).select('name slug').lean();
      return {
        categories,
        attributeTypes: ATTRIBUTE_TYPES
      };
    },
    async validateRow(row, rowIndex, context) {
      const errors = [];
      const name = String(row.name || '').trim();
      const code = String(row.code || '').trim().toLowerCase();
      const categorySlug = String(row.categorySlug || '').trim().toLowerCase();
      const type = String(row.type || '').trim().toLowerCase();

      if (!name || name.length < 2) {
        errors.push({ column: 'Attribute Name', value: name, reason: 'Name must be at least 2 characters', suggestion: 'Provide attribute label' });
      }
      if (!code || code.length < 2) {
        errors.push({ column: 'Attribute Code', value: code, reason: 'Code must be at least 2 characters', suggestion: 'e.g. fabric_type' });
      }
      if (!ATTRIBUTE_TYPES.includes(type)) {
        errors.push({ column: 'Data Type', value: type, reason: `Invalid type '${type}'`, suggestion: `Must be one of: ${ATTRIBUTE_TYPES.join(', ')}` });
      }

      let categoryId = null;
      if (context.categoryMap && context.categoryMap[categorySlug]) {
        categoryId = context.categoryMap[categorySlug]._id;
      } else {
        errors.push({ column: 'Category Slug', value: categorySlug, reason: `Category '${categorySlug}' does not exist`, suggestion: 'Use valid category from Reference Data sheet' });
      }

      const existingRecord = context.existingAttributesByCode ? context.existingAttributesByCode[code] : null;

      return {
        valid: errors.length === 0,
        errors,
        isExisting: !!existingRecord,
        sanitizedData: {
          name,
          code,
          categoryId,
          type,
          options: row.options ? row.options.split(',').map((o) => o.trim()).filter(Boolean) : [],
          unit: String(row.unit || '').trim(),
          isRequired: String(row.isRequired).toLowerCase() === 'true',
          isFilterable: String(row.isFilterable).toLowerCase() !== 'false'
        }
      };
    },
    async executeRow({ data, isExisting, mode }) {
      if (isExisting) {
        if (mode === 'create_only') return { action: 'skipped', reason: 'Record already exists' };
        await AttributeDefinition.findOneAndUpdate(
          { code: data.code },
          {
            $set: {
              name: data.name,
              categoryId: data.categoryId,
              type: data.type,
              options: data.options,
              unit: data.unit,
              isRequired: data.isRequired,
              isFilterable: data.isFilterable
            }
          }
        );
        return { action: 'updated', code: data.code };
      } else {
        if (mode === 'update_existing') return { action: 'skipped', reason: 'Record does not exist' };
        await AttributeDefinition.create(data);
        return { action: 'created', code: data.code };
      }
    },
    async fetchExportData() {
      const attrs = await AttributeDefinition.find({}).populate('categoryId', 'slug').lean();
      return attrs.map((a) => ({
        name: a.name,
        code: a.code,
        categorySlug: a.categoryId?.slug || '',
        type: a.type,
        options: (a.options || []).join(','),
        unit: a.unit || '',
        isRequired: String(!!a.isRequired),
        isFilterable: String(a.isFilterable !== false)
      }));
    }
  },

  // 5. INVENTORY MANAGEMENT (Strictly Atomic adjustments & InventoryLog recording)
  inventory: {
    id: 'inventory',
    name: 'Inventory Stock Adjustments',
    supportsImport: true,
    supportsExport: true,
    columns: [
      { key: 'sku', label: 'Variant SKU', required: true, type: 'String', width: 20, description: 'Exact SKU of product variant' },
      { key: 'delta', label: 'Stock Adjustment (Delta)', required: true, type: 'Number', width: 25, description: 'Positive (+10) to restock, Negative (-5) to deduct' },
      { key: 'reason', label: 'Adjustment Reason', required: true, type: 'Enum', allowedValues: ['RESTOCK', 'CORRECTION', 'DAMAGED', 'AUDIT', 'RETURN'], width: 22, description: 'Audit reason' },
      { key: 'referenceId', label: 'Reference ID', required: false, type: 'String', width: 20, description: 'PO Number, Ticket or Batch ID' },
      { key: 'note', label: 'Audit Note', required: false, type: 'String', width: 35, description: 'Explanatory notes for inventory logs' }
    ],
    sampleRows: [
      {
        sku: 'OXF-SHT-WHT-01',
        delta: 25,
        reason: 'RESTOCK',
        referenceId: 'PO-2026-11-001',
        note: 'Seasonal inventory replenishment from master supplier'
      }
    ],
    async getReferenceData() {
      const products = await Product.find({}).select('variants.sku variants.stockQuantity title').lean();
      const skus = [];
      products.forEach((p) => {
        (p.variants || []).forEach((v) => {
          skus.push({ sku: v.sku, currentStock: v.stockQuantity, productTitle: p.title });
        });
      });
      return {
        activeSkus: skus,
        allowedReasons: ['RESTOCK', 'CORRECTION', 'DAMAGED', 'AUDIT', 'RETURN']
      };
    },
    async validateRow(row, rowIndex, context) {
      const errors = [];
      const sku = String(row.sku || '').trim().toUpperCase();
      const delta = parseInt(row.delta, 10);
      const reason = String(row.reason || '').trim().toUpperCase();
      const allowedReasons = ['RESTOCK', 'CORRECTION', 'DAMAGED', 'AUDIT', 'RETURN'];

      if (!sku) {
        errors.push({ column: 'Variant SKU', value: sku, reason: 'SKU is required', suggestion: 'Provide an active variant SKU' });
      }
      if (isNaN(delta) || delta === 0) {
        errors.push({ column: 'Stock Adjustment (Delta)', value: row.delta, reason: 'Delta must be a non-zero integer', suggestion: 'e.g. 15 for addition or -5 for deduction' });
      }
      if (!allowedReasons.includes(reason)) {
        errors.push({ column: 'Adjustment Reason', value: reason, reason: `Invalid reason '${reason}'`, suggestion: `Must be one of: ${allowedReasons.join(', ')}` });
      }

      // Check SKU in context products
      let variantStock = null;
      if (context.skuMap && context.skuMap[sku] !== undefined) {
        variantStock = context.skuMap[sku].stockQuantity;
        if (!isNaN(delta) && variantStock + delta < 0) {
          errors.push({
            column: 'Stock Adjustment (Delta)',
            value: String(delta),
            reason: `Adjustment causes negative inventory. Current stock: ${variantStock}, Delta: ${delta}`,
            suggestion: `Deduction cannot exceed current stock of ${variantStock}`
          });
        }
      } else {
        errors.push({ column: 'Variant SKU', value: sku, reason: `SKU '${sku}' not found in active catalog`, suggestion: 'Verify SKU in Reference Data sheet' });
      }

      return {
        valid: errors.length === 0,
        errors,
        isExisting: true, // Inventory rows target existing SKUs
        sanitizedData: {
          sku,
          delta,
          reason,
          referenceId: String(row.referenceId || '').trim(),
          note: String(row.note || 'Bulk Excel Stock Adjustment').trim()
        }
      };
    },
    async executeRow({ data, user }) {
      // Strictly reuse the atomic inventory adjustment service to record InventoryLog & AuditLog!
      const result = await inventoryOperationsService.adjustStock(
        {
          sku: data.sku,
          delta: data.delta,
          reason: data.reason.toLowerCase(),
          referenceId: data.referenceId,
          note: data.note
        },
        user
      );
      return { action: 'updated', sku: data.sku, newStock: result.newStock };
    },
    async fetchExportData() {
      const products = await Product.find({}).lean();
      const rows = [];
      products.forEach((p) => {
        (p.variants || []).forEach((v) => {
          rows.push({
            sku: v.sku,
            delta: 0,
            reason: 'AUDIT',
            referenceId: '',
            note: `Current Stock: ${v.stockQuantity}`
          });
        });
      });
      return rows;
    }
  },

  // 6. COUPONS
  coupons: {
    id: 'coupons',
    name: 'Coupons & Promotions',
    supportsImport: true,
    supportsExport: true,
    columns: [
      { key: 'code', label: 'Coupon Code', required: true, type: 'String', width: 18, description: 'Unique uppercase promo code' },
      { key: 'description', label: 'Description', required: false, type: 'String', width: 30, description: 'Discount campaign description' },
      { key: 'discountType', label: 'Discount Type', required: true, type: 'Enum', allowedValues: ['percentage', 'fixed'], width: 16, description: 'percentage or fixed' },
      { key: 'discountValue', label: 'Discount Value', required: true, type: 'Number', width: 18, description: 'Percent (e.g. 15) or INR (e.g. 250)' },
      { key: 'maxDiscountAmount', label: 'Max Discount (INR)', required: false, type: 'Number', width: 20, description: 'Cap in INR for % discounts' },
      { key: 'minCartAmount', label: 'Min Cart (INR)', required: false, type: 'Number', width: 18, description: 'Minimum cart value in INR' },
      { key: 'startDate', label: 'Start Date', required: false, type: 'Date', width: 18, description: 'YYYY-MM-DD' },
      { key: 'expiryDate', label: 'Expiry Date', required: false, type: 'Date', width: 18, description: 'YYYY-MM-DD' },
      { key: 'usageLimit', label: 'Total Usage Limit', required: false, type: 'Number', width: 18, description: 'Max total redemptions' },
      { key: 'perUserLimit', label: 'Per User Limit', required: false, type: 'Number', width: 16, description: 'Max redemptions per user' },
      { key: 'isActive', label: 'Is Active', required: false, type: 'Boolean', allowedValues: ['true', 'false'], width: 14, description: 'Active coupon status' }
    ],
    sampleRows: [
      {
        code: 'FESTIVE25',
        description: '25% off festive celebration discount',
        discountType: 'percentage',
        discountValue: 25,
        maxDiscountAmount: 500,
        minCartAmount: 1499,
        startDate: '2026-11-01',
        expiryDate: '2026-12-31',
        usageLimit: 1000,
        perUserLimit: 1,
        isActive: 'true'
      }
    ],
    async getReferenceData() {
      const coupons = await Coupon.find({}).select('code discountType discountValue').lean();
      return {
        existingCoupons: coupons,
        discountTypes: ['percentage', 'fixed']
      };
    },
    async validateRow(row, rowIndex, context) {
      const errors = [];
      const code = String(row.code || '').trim().toUpperCase();
      const discountType = String(row.discountType || '').trim().toLowerCase();
      const discountValue = parseFloat(row.discountValue);
      const minCartAmount = parseFloat(row.minCartAmount) || 0;
      const maxDiscountAmount = parseFloat(row.maxDiscountAmount) || null;

      if (!code || code.length < 3) {
        errors.push({ column: 'Coupon Code', value: code, reason: 'Code must be at least 3 characters', suggestion: 'e.g. SAVE20' });
      }
      if (!['percentage', 'fixed'].includes(discountType)) {
        errors.push({ column: 'Discount Type', value: discountType, reason: "Discount type must be 'percentage' or 'fixed'", suggestion: "Choose 'percentage' or 'fixed'" });
      }
      if (isNaN(discountValue) || discountValue <= 0) {
        errors.push({ column: 'Discount Value', value: row.discountValue, reason: 'Discount value must be greater than zero', suggestion: 'e.g. 15 for 15% or 200 for ₹200' });
      }
      if (discountType === 'percentage' && discountValue > 100) {
        errors.push({ column: 'Discount Value', value: String(discountValue), reason: 'Percentage discount cannot exceed 100%', suggestion: 'Set value between 1 and 100' });
      }

      let startDate = row.startDate ? new Date(row.startDate) : new Date();
      let expiryDate = row.expiryDate ? new Date(row.expiryDate) : null;

      if (expiryDate && isNaN(expiryDate.getTime())) {
        errors.push({ column: 'Expiry Date', value: row.expiryDate, reason: 'Invalid expiry date format', suggestion: 'Use YYYY-MM-DD format' });
      } else if (expiryDate && expiryDate <= startDate) {
        errors.push({ column: 'Expiry Date', value: row.expiryDate, reason: 'Expiry date must be after start date', suggestion: 'Set a future date' });
      }

      const existingRecord = context.existingCouponsByCode ? context.existingCouponsByCode[code] : null;

      return {
        valid: errors.length === 0,
        errors,
        isExisting: !!existingRecord,
        sanitizedData: {
          code,
          description: String(row.description || '').trim(),
          discountType,
          discountValue: discountType === 'fixed' ? Math.round(discountValue * 100) : discountValue, // fixed in paise
          maxDiscountAmount: maxDiscountAmount ? Math.round(maxDiscountAmount * 100) : null,
          minCartAmount: Math.round(minCartAmount * 100),
          startDate,
          expiryDate,
          usageLimit: parseInt(row.usageLimit, 10) || null,
          perUserLimit: parseInt(row.perUserLimit, 10) || 1,
          isActive: String(row.isActive).toLowerCase() !== 'false'
        }
      };
    },
    async executeRow({ data, isExisting, mode }) {
      if (isExisting) {
        if (mode === 'create_only') return { action: 'skipped', reason: 'Record already exists' };
        await Coupon.findOneAndUpdate(
          { code: data.code },
          {
            $set: {
              description: data.description,
              discountType: data.discountType,
              discountValue: data.discountValue,
              maxDiscountAmount: data.maxDiscountAmount,
              minCartAmount: data.minCartAmount,
              startDate: data.startDate,
              expiryDate: data.expiryDate,
              usageLimit: data.usageLimit,
              perUserLimit: data.perUserLimit,
              isActive: data.isActive
            }
          }
        );
        return { action: 'updated', code: data.code };
      } else {
        if (mode === 'update_existing') return { action: 'skipped', reason: 'Record does not exist' };
        await Coupon.create(data);
        return { action: 'created', code: data.code };
      }
    },
    async fetchExportData() {
      const coupons = await Coupon.find({}).lean();
      return coupons.map((c) => ({
        code: c.code,
        description: c.description || '',
        discountType: c.discountType,
        discountValue: c.discountType === 'fixed' ? Math.round(c.discountValue / 100) : c.discountValue,
        maxDiscountAmount: c.maxDiscountAmount ? Math.round(c.maxDiscountAmount / 100) : '',
        minCartAmount: c.minCartAmount ? Math.round(c.minCartAmount / 100) : 0,
        startDate: c.startDate ? c.startDate.toISOString().split('T')[0] : '',
        expiryDate: c.expiryDate ? c.expiryDate.toISOString().split('T')[0] : '',
        usageLimit: c.usageLimit || '',
        perUserLimit: c.perUserLimit || 1,
        isActive: String(c.isActive !== false)
      }));
    }
  },

  // 7. CMS CONTENT PAGES
  'cms-pages': {
    id: 'cms-pages',
    name: 'CMS Content Pages',
    supportsImport: true,
    supportsExport: true,
    columns: [
      { key: 'title', label: 'Page Title', required: true, type: 'String', width: 25, description: 'Title of the policy or content page' },
      { key: 'slug', label: 'Slug', required: true, type: 'String', width: 22, description: 'URL slug (e.g. privacy-policy)' },
      { key: 'content', label: 'HTML Content', required: true, type: 'String', width: 45, description: 'Page body markup' },
      { key: 'seoTitle', label: 'SEO Title', required: false, type: 'String', width: 25, description: 'Meta title' },
      { key: 'seoDescription', label: 'SEO Description', required: false, type: 'String', width: 35, description: 'Meta description' },
      { key: 'isPublished', label: 'Is Published', required: false, type: 'Boolean', allowedValues: ['true', 'false'], width: 14, description: 'Set true to publish' }
    ],
    sampleRows: [
      {
        title: 'Shipping & Delivery Policy',
        slug: 'shipping-policy',
        content: '<p>All orders are dispatched within 24-48 business hours with complimentary express tracking.</p>',
        seoTitle: 'Shipping & Delivery Policy | Aura',
        seoDescription: 'Read about our national shipping timelines, logistics partners, and delivery guarantees.',
        isPublished: 'true'
      }
    ],
    async getReferenceData() {
      const pages = await ContentPage.find({}).select('title slug isPublished').lean();
      return { existingPages: pages };
    },
    async validateRow(row, rowIndex, context) {
      const errors = [];
      const title = String(row.title || '').trim();
      const slug = String(row.slug || '').trim().toLowerCase();
      const rawContent = String(row.content || '').trim();

      if (!title || title.length < 2) {
        errors.push({ column: 'Page Title', value: title, reason: 'Title must be at least 2 characters', suggestion: 'Provide page title' });
      }
      if (!slug) {
        errors.push({ column: 'Slug', value: slug, reason: 'Slug is required', suggestion: 'Provide lowercased URL slug' });
      }
      if (!rawContent) {
        errors.push({ column: 'HTML Content', value: '', reason: 'Content is required', suggestion: 'Provide page body content' });
      }

      // Sanitize HTML using existing CMS sanitization logic
      const sanitizedContent = cmsService.sanitizeHtml(rawContent);

      const existingRecord = context.existingPagesBySlug ? context.existingPagesBySlug[slug] : null;

      return {
        valid: errors.length === 0,
        errors,
        isExisting: !!existingRecord,
        sanitizedData: {
          title,
          slug,
          content: sanitizedContent,
          seoTitle: String(row.seoTitle || title).trim(),
          seoDescription: String(row.seoDescription || '').trim(),
          isPublished: String(row.isPublished).toLowerCase() === 'true'
        }
      };
    },
    async executeRow({ data, isExisting, mode, user }) {
      if (isExisting) {
        if (mode === 'create_only') return { action: 'skipped', reason: 'Record already exists' };
        await ContentPage.findOneAndUpdate(
          { slug: data.slug },
          {
            $set: {
              title: data.title,
              content: data.content,
              seoTitle: data.seoTitle,
              seoDescription: data.seoDescription,
              isPublished: data.isPublished
            },
            $push: {
              revisions: {
                title: data.title,
                content: data.content,
                changeSummary: 'Bulk Excel Import Revision',
                updatedBy: user?._id || null,
                updatedAt: new Date()
              }
            }
          }
        );
        return { action: 'updated', slug: data.slug };
      } else {
        if (mode === 'update_existing') return { action: 'skipped', reason: 'Record does not exist' };
        await ContentPage.create({
          title: data.title,
          slug: data.slug,
          content: data.content,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          isPublished: data.isPublished,
          revisions: [
            {
              title: data.title,
              content: data.content,
              changeSummary: 'Created via Bulk Excel Import',
              updatedBy: user?._id || null,
              updatedAt: new Date()
            }
          ]
        });
        return { action: 'created', slug: data.slug };
      }
    },
    async fetchExportData() {
      const pages = await ContentPage.find({}).lean();
      return pages.map((p) => ({
        title: p.title,
        slug: p.slug,
        content: p.content,
        seoTitle: p.seoTitle || '',
        seoDescription: p.seoDescription || '',
        isPublished: String(p.isPublished === true)
      }));
    }
  },

  // 8. FAQS
  faqs: {
    id: 'faqs',
    name: 'Frequently Asked Questions (FAQs)',
    supportsImport: true,
    supportsExport: true,
    columns: [
      { key: 'question', label: 'Question', required: true, type: 'String', width: 35, description: 'FAQ query string' },
      { key: 'answer', label: 'Answer', required: true, type: 'String', width: 45, description: 'FAQ response' },
      { key: 'category', label: 'Category', required: true, type: 'Enum', allowedValues: FAQ_CATEGORIES, width: 25, description: 'FAQ grouping category' },
      { key: 'displayOrder', label: 'Display Order', required: false, type: 'Number', width: 14, description: 'Order of appearance' },
      { key: 'isActive', label: 'Is Active', required: false, type: 'Boolean', allowedValues: ['true', 'false'], width: 14, description: 'Display on public FAQ page' }
    ],
    sampleRows: [
      {
        question: 'What are the delivery timelines for metro cities?',
        answer: 'Deliveries to Tier-1 and Metro locations typically arrive in 2-4 business days.',
        category: 'Orders & Shipping',
        displayOrder: 1,
        isActive: 'true'
      }
    ],
    async getReferenceData() {
      return {
        faqCategories: FAQ_CATEGORIES
      };
    },
    async validateRow(row, rowIndex, context) {
      const errors = [];
      const question = String(row.question || '').trim();
      const answer = String(row.answer || '').trim();
      const category = String(row.category || '').trim();

      if (!question || question.length < 5) {
        errors.push({ column: 'Question', value: question, reason: 'Question must be at least 5 characters', suggestion: 'Provide complete question' });
      }
      if (!answer || answer.length < 5) {
        errors.push({ column: 'Answer', value: answer, reason: 'Answer must be at least 5 characters', suggestion: 'Provide informative answer' });
      }
      if (!FAQ_CATEGORIES.includes(category)) {
        errors.push({ column: 'Category', value: category, reason: `Invalid category '${category}'`, suggestion: `Select from: ${FAQ_CATEGORIES.join(', ')}` });
      }

      const existingRecord = context.existingFaqsByQuestion ? context.existingFaqsByQuestion[question.toLowerCase()] : null;

      return {
        valid: errors.length === 0,
        errors,
        isExisting: !!existingRecord,
        sanitizedData: {
          question,
          answer,
          category,
          displayOrder: parseInt(row.displayOrder, 10) || 0,
          isActive: String(row.isActive).toLowerCase() !== 'false'
        }
      };
    },
    async executeRow({ data, isExisting, mode }) {
      if (isExisting) {
        if (mode === 'create_only') return { action: 'skipped', reason: 'Record already exists' };
        await FAQ.findOneAndUpdate(
          { question: new RegExp(`^${data.question.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          {
            $set: {
              answer: data.answer,
              category: data.category,
              displayOrder: data.displayOrder,
              isActive: data.isActive
            }
          }
        );
        return { action: 'updated', question: data.question };
      } else {
        if (mode === 'update_existing') return { action: 'skipped', reason: 'Record does not exist' };
        await FAQ.create(data);
        return { action: 'created', question: data.question };
      }
    },
    async fetchExportData() {
      const faqs = await FAQ.find({}).sort({ displayOrder: 1 }).lean();
      return faqs.map((f) => ({
        question: f.question,
        answer: f.answer,
        category: f.category,
        displayOrder: f.displayOrder || 0,
        isActive: String(f.isActive !== false)
      }));
    }
  },

  // 9. BANNERS
  banners: {
    id: 'banners',
    name: 'Banners & Hero Sliders',
    supportsImport: true,
    supportsExport: true,
    columns: [
      { key: 'title', label: 'Banner Title', required: true, type: 'String', width: 25, description: 'Banner headline' },
      { key: 'subtitle', label: 'Subtitle', required: false, type: 'String', width: 35, description: 'Secondary headline' },
      { key: 'desktopImageUrl', label: 'Desktop Image URL', required: true, type: 'String', width: 35, description: 'High-res landscape image URL' },
      { key: 'mobileImageUrl', label: 'Mobile Image URL', required: false, type: 'String', width: 35, description: 'Mobile portrait image URL' },
      { key: 'altText', label: 'Alt Text', required: true, type: 'String', width: 25, description: 'Accessibility alt text' },
      { key: 'ctaLabel', label: 'CTA Label', required: false, type: 'String', width: 18, description: 'Button text (e.g. Explore Now)' },
      { key: 'ctaDestination', label: 'CTA Destination URL', required: false, type: 'String', width: 25, description: 'Link URL (e.g. /shop)' },
      { key: 'bannerType', label: 'Banner Type', required: false, type: 'Enum', allowedValues: BANNER_TYPES, width: 16, description: 'hero, promo, sidebar' },
      { key: 'displayOrder', label: 'Display Order', required: false, type: 'Number', width: 14, description: 'Order index' },
      { key: 'isActive', label: 'Is Active', required: false, type: 'Boolean', allowedValues: ['true', 'false'], width: 14, description: 'Active visibility status' }
    ],
    sampleRows: [
      {
        title: 'Autumn Winter Elegance 2026',
        subtitle: 'Experience timeless craftsmanship with pure organic cotton & wool.',
        desktopImageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
        mobileImageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04',
        altText: 'Autumn Winter 2026 Collection Banner',
        ctaLabel: 'Shop The Collection',
        ctaDestination: '/shop',
        bannerType: 'hero',
        displayOrder: 1,
        isActive: 'true'
      }
    ],
    async getReferenceData() {
      return { bannerTypes: BANNER_TYPES };
    },
    async validateRow(row, rowIndex, context) {
      const errors = [];
      const title = String(row.title || '').trim();
      const desktopImageUrl = String(row.desktopImageUrl || '').trim();
      const altText = String(row.altText || '').trim();
      const bannerType = String(row.bannerType || 'hero').trim().toLowerCase();

      if (!title) {
        errors.push({ column: 'Banner Title', value: title, reason: 'Title is required', suggestion: 'Provide banner title' });
      }
      if (!desktopImageUrl) {
        errors.push({ column: 'Desktop Image URL', value: desktopImageUrl, reason: 'Desktop Image URL is required', suggestion: 'Provide valid image URL' });
      }
      if (!altText) {
        errors.push({ column: 'Alt Text', value: altText, reason: 'Alt text is required for accessibility', suggestion: 'Provide descriptive alt text' });
      }
      if (!BANNER_TYPES.includes(bannerType)) {
        errors.push({ column: 'Banner Type', value: bannerType, reason: `Invalid banner type '${bannerType}'`, suggestion: `Must be: ${BANNER_TYPES.join(', ')}` });
      }

      const existingRecord = context.existingBannersByTitle ? context.existingBannersByTitle[title.toLowerCase()] : null;

      return {
        valid: errors.length === 0,
        errors,
        isExisting: !!existingRecord,
        sanitizedData: {
          title,
          subtitle: String(row.subtitle || '').trim(),
          desktopImageUrl,
          mobileImageUrl: String(row.mobileImageUrl || '').trim(),
          altText,
          ctaLabel: String(row.ctaLabel || '').trim(),
          ctaDestination: String(row.ctaDestination || '').trim(),
          bannerType,
          displayOrder: parseInt(row.displayOrder, 10) || 0,
          isActive: String(row.isActive).toLowerCase() !== 'false'
        }
      };
    },
    async executeRow({ data, isExisting, mode }) {
      if (isExisting) {
        if (mode === 'create_only') return { action: 'skipped', reason: 'Record already exists' };
        await Banner.findOneAndUpdate(
          { title: new RegExp(`^${data.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          {
            $set: {
              subtitle: data.subtitle,
              desktopImageUrl: data.desktopImageUrl,
              mobileImageUrl: data.mobileImageUrl,
              altText: data.altText,
              ctaLabel: data.ctaLabel,
              ctaDestination: data.ctaDestination,
              bannerType: data.bannerType,
              displayOrder: data.displayOrder,
              isActive: data.isActive
            }
          }
        );
        return { action: 'updated', title: data.title };
      } else {
        if (mode === 'update_existing') return { action: 'skipped', reason: 'Record does not exist' };
        await Banner.create(data);
        return { action: 'created', title: data.title };
      }
    },
    async fetchExportData() {
      const banners = await Banner.find({}).sort({ displayOrder: 1 }).lean();
      return banners.map((b) => ({
        title: b.title,
        subtitle: b.subtitle || '',
        desktopImageUrl: b.desktopImageUrl,
        mobileImageUrl: b.mobileImageUrl || '',
        altText: b.altText,
        ctaLabel: b.ctaLabel || '',
        ctaDestination: b.ctaDestination || '',
        bannerType: b.bannerType,
        displayOrder: b.displayOrder || 0,
        isActive: String(b.isActive !== false)
      }));
    }
  },

  // EXPORT-ONLY MODULES (Import is strictly forbidden for security and integrity)

  // 10. CUSTOMERS (Export Only)
  customers: {
    id: 'customers',
    name: 'Customers',
    supportsImport: false, // Forbidden: no password imports, prevent role escalation
    supportsExport: true,
    columns: [
      { key: 'id', label: 'Customer ID', width: 25 },
      { key: 'firstName', label: 'First Name', width: 18 },
      { key: 'lastName', label: 'Last Name', width: 18 },
      { key: 'email', label: 'Email Address', width: 28 },
      { key: 'phone', label: 'Phone', width: 16 },
      { key: 'status', label: 'Account Status', width: 14 },
      { key: 'createdAt', label: 'Joined Date', width: 20 }
    ],
    async fetchExportData() {
      const customers = await User.find({ role: 'customer' }).select('-password -refreshTokens').lean();
      return customers.map((c) => ({
        id: String(c._id),
        firstName: c.firstName,
        lastName: c.lastName || '',
        email: c.email,
        phone: c.phone || '',
        status: c.status,
        createdAt: c.createdAt ? c.createdAt.toISOString() : ''
      }));
    }
  },

  // 11. STAFF (Export Only)
  staff: {
    id: 'staff',
    name: 'Staff & Operational Team',
    supportsImport: false, // Forbidden: no arbitrary staff privilege assignment
    supportsExport: true,
    columns: [
      { key: 'id', label: 'Staff ID', width: 25 },
      { key: 'name', label: 'Staff Name', width: 22 },
      { key: 'email', label: 'Staff Email', width: 28 },
      { key: 'role', label: 'Assigned Role', width: 18 },
      { key: 'status', label: 'Status', width: 14 },
      { key: 'lastLoginAt', label: 'Last Login', width: 20 }
    ],
    async fetchExportData() {
      const staff = await User.find({ role: { $in: ['store_manager', 'order_manager', 'support_staff'] } })
        .select('-password -refreshTokens')
        .lean();
      return staff.map((s) => ({
        id: String(s._id),
        name: `${s.firstName} ${s.lastName || ''}`.trim(),
        email: s.email,
        role: s.role,
        status: s.status,
        lastLoginAt: s.lastLoginAt ? s.lastLoginAt.toISOString() : 'Never'
      }));
    }
  },

  // 12. REVIEWS (Export & Moderation Only)
  reviews: {
    id: 'reviews',
    name: 'Product Reviews',
    supportsImport: false, // Forbidden: strictly no review fabrication
    supportsExport: true,
    columns: [
      { key: 'id', label: 'Review ID', width: 25 },
      { key: 'productTitle', label: 'Product', width: 28 },
      { key: 'customerName', label: 'Customer', width: 20 },
      { key: 'rating', label: 'Rating (1-5)', width: 14 },
      { key: 'title', label: 'Review Title', width: 25 },
      { key: 'comment', label: 'Comment', width: 40 },
      { key: 'isVerifiedPurchase', label: 'Verified Purchase', width: 18 },
      { key: 'moderationStatus', label: 'Moderation Status', width: 18 },
      { key: 'createdAt', label: 'Review Date', width: 20 }
    ],
    async fetchExportData() {
      const reviews = await Review.find({})
        .populate('productId', 'title')
        .populate('userId', 'firstName lastName')
        .lean();
      return reviews.map((r) => ({
        id: String(r._id),
        productTitle: r.productId?.title || 'Unknown Product',
        customerName: r.userId ? `${r.userId.firstName} ${r.userId.lastName || ''}`.trim() : 'Anonymous',
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        isVerifiedPurchase: String(r.isVerifiedPurchase === true),
        moderationStatus: r.moderationStatus,
        createdAt: r.createdAt ? r.createdAt.toISOString() : ''
      }));
    }
  },

  // 13. ORDERS (Export Only)
  orders: {
    id: 'orders',
    name: 'Orders',
    supportsImport: false, // Forbidden: transactional integrity
    supportsExport: true,
    columns: [
      { key: 'orderNumber', label: 'Order Number', width: 22 },
      { key: 'placedAt', label: 'Placed Date', width: 20 },
      { key: 'customerName', label: 'Customer Name', width: 22 },
      { key: 'customerEmail', label: 'Customer Email', width: 28 },
      { key: 'itemsCount', label: 'Items Count', width: 14 },
      { key: 'subtotal', label: 'Subtotal (INR)', width: 16 },
      { key: 'discount', label: 'Discount (INR)', width: 16 },
      { key: 'shipping', label: 'Shipping (INR)', width: 16 },
      { key: 'tax', label: 'Tax (INR)', width: 14 },
      { key: 'grandTotal', label: 'Grand Total (INR)', width: 18 },
      { key: 'paymentStatus', label: 'Payment Status', width: 16 },
      { key: 'orderStatus', label: 'Order Status', width: 16 }
    ],
    async fetchExportData() {
      const orders = await Order.find({}).sort({ createdAt: -1 }).limit(5000).lean();
      return orders.map((o) => ({
        orderNumber: o.orderNumber,
        placedAt: o.createdAt ? o.createdAt.toISOString() : '',
        customerName: o.shippingAddress?.fullName || 'Customer',
        customerEmail: o.customer?.email || o.shippingAddress?.email || '',
        itemsCount: (o.items || []).length,
        subtotal: Math.round((o.pricing?.subtotal || o.subtotal || 0) / 100),
        discount: Math.round((o.pricing?.discountTotal || o.discountAmount || 0) / 100),
        shipping: Math.round((o.pricing?.shippingFee || o.shippingFee || 0) / 100),
        tax: Math.round((o.pricing?.taxTotal || 0) / 100),
        grandTotal: Math.round((o.pricing?.grandTotal || o.grandTotal || 0) / 100),
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus
      }));
    }
  },

  // 14. PAYMENTS (Export Only)
  payments: {
    id: 'payments',
    name: 'Financial Payments & Settlements',
    supportsImport: false, // Forbidden: financial audit
    supportsExport: true,
    columns: [
      { key: 'paymentId', label: 'Payment Reference', width: 25 },
      { key: 'orderId', label: 'Order ID', width: 25 },
      { key: 'method', label: 'Method', width: 14 },
      { key: 'amount', label: 'Amount (INR)', width: 16 },
      { key: 'currency', label: 'Currency', width: 12 },
      { key: 'status', label: 'Payment Status', width: 16 },
      { key: 'gatewayTransactionId', label: 'Gateway TXN', width: 25 },
      { key: 'createdAt', label: 'Transaction Time', width: 20 }
    ],
    async fetchExportData() {
      const payments = await Payment.find({}).sort({ createdAt: -1 }).limit(5000).lean();
      return payments.map((p) => ({
        paymentId: String(p._id),
        orderId: String(p.orderId),
        method: p.method,
        amount: Math.round((p.amount || 0) / 100),
        currency: p.currency || 'INR',
        status: p.status,
        gatewayTransactionId: p.gatewayPaymentId || '',
        createdAt: p.createdAt ? p.createdAt.toISOString() : ''
      }));
    }
  }
};

export default MODULE_DEFINITIONS;
