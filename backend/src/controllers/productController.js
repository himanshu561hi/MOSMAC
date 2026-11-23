import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { Order } from '../models/Order.js';
import { HomepageSection } from '../models/HomepageSection.js';
import { HomepageSectionProduct } from '../models/HomepageSectionProduct.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import {
  generateSlug,
  validateProductAttributes,
  validateProductVariants
} from '../services/catalogueService.js';

export async function getProducts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    // Customer vs Admin status scoping
    const isStaff = req.user && ['super_admin', 'store_manager', 'order_manager'].includes(req.user.role);
    if (!isStaff) {
      query.status = 'published';
    } else if (req.query.status) {
      query.status = req.query.status;
    }

    // Category Filter (support category slug or ID, including child categories)
    if (req.query.category) {
      const rawCategory = req.query.category.trim();
      let cat = await Category.findOne({
        $or: [{ slug: rawCategory }, { _id: rawCategory.match(/^[0-9a-fA-F]{24}$/) ? rawCategory : null }]
      });
      if (!cat) {
        const altSlug = rawCategory.endsWith('es')
          ? rawCategory.slice(0, -2)
          : rawCategory.endsWith('s')
          ? rawCategory.slice(0, -1)
          : `${rawCategory}es`;
        const altSlugS = rawCategory.endsWith('s') ? rawCategory.slice(0, -1) : `${rawCategory}s`;
        cat = await Category.findOne({ slug: { $in: [altSlug, altSlugS] } });
      }
      if (cat) {
        // Match this category or any descendant category (check both parentId tree and ancestors._id)
        const allCatIds = [cat._id];
        let currentParents = [cat._id];
        for (let d = 0; d < 5; d++) {
          if (currentParents.length === 0) break;
          const children = await Category.find({
            $or: [
              { parentId: { $in: currentParents } },
              { 'ancestors._id': { $in: currentParents } }
            ]
          }).select('_id');
          const newIds = children
            .map((c) => c._id)
            .filter((id) => !allCatIds.some((existing) => existing.toString() === id.toString()));
          if (newIds.length === 0) break;
          allCatIds.push(...newIds);
          currentParents = newIds;
        }
        query.categoryId = { $in: allCatIds };
      }
    }

    // Brand Filter (supports single slug, comma-separated slugs, or ObjectIds)
    if (req.query.brand) {
      const brandIdentifiers = req.query.brand.split(',').map((b) => b.trim()).filter(Boolean);
      const orClauses = brandIdentifiers.map((b) => {
        if (/^[0-9a-fA-F]{24}$/.test(b)) {
          return { _id: b };
        }
        return { slug: b };
      });
      const matchingBrands = await Brand.find({ $or: orClauses }).select('_id');
      if (matchingBrands.length > 0) {
        query.brandId = { $in: matchingBrands.map((b) => b._id) };
      }
    }

    // Homepage Section & Collection Filters (e.g. ?section=trending, ?section=bestsellers, ?featured=true, ?section=mosmac_select, ?discount=true)
    const targetSectionSlug = req.query.section ||
      (req.query.trending === 'true' || req.query.sort === 'trending' ? 'trending' : null) ||
      (req.query.bestseller === 'true' || req.query.bestsellers === 'true' || req.query.sort === 'best_selling' ? 'bestsellers' : null) ||
      (req.query.featured === 'true' ? 'featured' : null) ||
      (req.query.select === 'true' ? 'mosmac_select' : null) ||
      (req.query.discount === 'true' ? 'offers_deals' : null);

    let sectionProductIds = [];
    if (targetSectionSlug) {
      const section = await HomepageSection.findOne({ slug: targetSectionSlug });
      if (section) {
        const assignments = await HomepageSectionProduct.find({ sectionId: section._id }).sort({ displayOrder: 1 });
        sectionProductIds = assignments.map((a) => a.productId);
        if (sectionProductIds.length > 0) {
          query._id = { $in: sectionProductIds };
        } else if (targetSectionSlug === 'featured') {
          query.isFeatured = true;
        } else if (targetSectionSlug === 'offers_deals' || req.query.discount === 'true') {
          query.$expr = { $gt: ['$baseMrp', '$basePrice'] };
        }
      } else if (targetSectionSlug === 'featured') {
        query.isFeatured = true;
      } else if (targetSectionSlug === 'offers_deals' || req.query.discount === 'true') {
        query.$expr = { $gt: ['$baseMrp', '$basePrice'] };
      }
    } else if (req.query.discount === 'true') {
      query.$expr = { $gt: ['$baseMrp', '$basePrice'] };
    }

    // Availability Filter (In Stock Only)
    if (req.query.inStock === 'true') {
      query['variants.stockQuantity'] = { $gt: 0 };
    }

    // Rating Filter (Minimum average rating)
    if (req.query.minRating) {
      const minRating = parseFloat(req.query.minRating);
      if (!isNaN(minRating) && minRating > 0) {
        query['ratings.average'] = { $gte: minRating };
      }
    }

    // Dynamic Category Attribute Filters (e.g. attrs[ram]=16GB or attrs[color]=Black,Blue)
    if (req.query.attrs && typeof req.query.attrs === 'object') {
      const elemMatches = [];
      for (const [code, rawVal] of Object.entries(req.query.attrs)) {
        if (rawVal) {
          const values = typeof rawVal === 'string'
            ? rawVal.split(',').map((v) => v.trim()).filter(Boolean)
            : Array.isArray(rawVal)
            ? rawVal
            : [rawVal];

          if (values.length === 1) {
            elemMatches.push({
              attributes: { $elemMatch: { code, value: values[0] } }
            });
          } else if (values.length > 1) {
            elemMatches.push({
              attributes: { $elemMatch: { code, value: { $in: values } } }
            });
          }
        }
      }
      if (elemMatches.length > 0) {
        query.$and = query.$and ? [...query.$and, ...elemMatches] : elemMatches;
      }
    }

    // Price Range Filter (minor units / paise)
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      query.basePrice = {};
      if (req.query.minPrice !== undefined) {
        query.basePrice.$gte = parseInt(req.query.minPrice, 10);
      }
      if (req.query.maxPrice !== undefined) {
        query.basePrice.$lte = parseInt(req.query.maxPrice, 10);
      }
    }

    // Search Query (Supports partial match, SKU match, and keywords)
    if (req.query.search) {
      const sanitized = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(sanitized, 'i');
      const searchOr = [
        { title: regex },
        { slug: regex },
        { 'seo.keywords': regex },
        { 'variants.sku': regex }
      ];
      query.$and = query.$and ? [...query.$and, { $or: searchOr }] : [{ $or: searchOr }];
    }

    // Sorting
    let sort = { createdAt: -1 };
    if (req.query.sortBy) {
      const order = req.query.sortOrder === 'asc' ? 1 : -1;
      switch (req.query.sortBy) {
        case 'price':
          sort = { basePrice: order };
          break;
        case 'rating':
          sort = { 'ratings.average': -1, createdAt: -1 };
          break;
        case 'title':
          sort = { title: order };
          break;
        case 'popular':
        case 'recommended':
          sort = { isFeatured: -1, 'ratings.average': -1, createdAt: -1 };
          break;
        case 'discount':
          sort = { baseMrp: -1, createdAt: -1 };
          break;
        case 'newest':
        default:
          sort = { createdAt: order };
          break;
      }
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('categoryId', 'name slug')
        .populate('brandId', 'name slug logoUrl')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query)
    ]);

    // Preserve section displayOrder if no explicit sort was requested by customer
    if (sectionProductIds.length > 0 && !req.query.sortBy) {
      const orderMap = new Map(sectionProductIds.map((id, idx) => [id.toString(), idx]));
      products.sort((a, b) => (orderMap.get(a._id.toString()) ?? 999) - (orderMap.get(b._id.toString()) ?? 999));
    }

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Products retrieved',
      { products },
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    );
  } catch (error) {
    next(error);
  }
}

export async function getProductSuggestions(req, res, next) {
  try {
    const q = (req.query.q || req.query.search || '').trim();
    if (!q || q.length < 2) {
      return sendSuccess(res, HTTP_STATUS.OK, 'Suggestions retrieved', {
        products: [],
        categories: [],
        brands: []
      });
    }

    // Escape regex special characters to prevent ReDoS / injection
    const sanitized = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(sanitized, 'i');

    const [products, categories, brands] = await Promise.all([
      Product.find({
        status: 'published',
        $or: [{ title: regex }, { slug: regex }, { 'seo.keywords': regex }, { 'variants.sku': regex }]
      })
        .select('title slug basePrice baseMrp images categoryId brandId variants')
        .populate('categoryId', 'name slug')
        .populate('brandId', 'name slug')
        .limit(6),
      Category.find({ name: regex, isActive: true }).select('name slug').limit(3),
      Brand.find({ name: regex, isActive: true }).select('name slug logoUrl').limit(3)
    ]);

    return sendSuccess(res, HTTP_STATUS.OK, 'Suggestions retrieved', {
      products,
      categories,
      brands
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductBySlug(req, res, next) {
  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.slug);
    const query = isObjectId
      ? { $or: [{ slug: req.params.slug }, { _id: req.params.slug }] }
      : { slug: req.params.slug };

    const product = await Product.findOne(query)
      .populate('categoryId', 'name slug ancestors')
      .populate('brandId', 'name slug logoUrl website');

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const isStaff = req.user && ['super_admin', 'store_manager', 'order_manager'].includes(req.user.role);
    if (!isStaff && product.status !== 'published') {
      throw ApiError.notFound('Product is not currently available');
    }

    // Fetch related products in the same category
    const catId = product.categoryId?._id || product.categoryId;
    const relatedProducts = await Product.find({
      categoryId: catId,
      _id: { $ne: product._id },
      status: 'published'
    })
      .select('title slug basePrice baseMrp images variants isFeatured badges brandId')
      .populate('brandId', 'name slug')
      .limit(4);

    return sendSuccess(res, HTTP_STATUS.OK, 'Product details retrieved', {
      product,
      relatedProducts
    });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const {
      title,
      slug,
      description,
      categoryId,
      brandId,
      status,
      isFeatured,
      badges,
      hasVariants,
      images,
      attributes,
      variants,
      seo
    } = req.body;

    // Validate Category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      throw ApiError.badRequest('Referenced Category does not exist');
    }

    // Validate Brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      throw ApiError.badRequest('Referenced Brand does not exist');
    }

    const finalSlug = slug ? generateSlug(slug) : generateSlug(title);
    const existingSlug = await Product.findOne({ slug: finalSlug });
    if (existingSlug) {
      throw ApiError.conflict(`Product slug '${finalSlug}' is already taken.`);
    }

    // Dynamic Attribute Validation against Category
    await validateProductAttributes(categoryId, attributes);

    // Variant Validation (SKU uniqueness & combination uniqueness)
    await validateProductVariants(variants);

    const product = new Product({
      title,
      slug: finalSlug,
      description,
      categoryId,
      brandId,
      status: status || 'draft',
      isFeatured: isFeatured || false,
      badges: badges || [],
      hasVariants: hasVariants || false,
      images: images || [],
      attributes: attributes || [],
      variants,
      seo
    });

    await product.save();

    // Create initial inventory logs for non-zero variant stocks
    for (const v of variants) {
      if (v.stockQuantity > 0) {
        await InventoryLog.create({
          productId: product._id,
          sku: v.sku,
          delta: v.stockQuantity,
          previousStock: 0,
          newStock: v.stockQuantity,
          reason: 'restock',
          note: 'Initial catalogue entry stock',
          performedBy: req.user._id
        });
      }
    }

    return sendSuccess(res, HTTP_STATUS.CREATED, 'Product created successfully', {
      product: product.toJSON()
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const {
      title,
      slug,
      description,
      categoryId,
      brandId,
      status,
      isFeatured,
      badges,
      hasVariants,
      images,
      attributes,
      variants,
      seo
    } = req.body;

    const targetCategoryId = categoryId || product.categoryId;

    if (categoryId && categoryId.toString() !== product.categoryId.toString()) {
      const category = await Category.findById(categoryId);
      if (!category) throw ApiError.badRequest('Referenced Category does not exist');
      product.categoryId = categoryId;
    }

    if (brandId && brandId.toString() !== product.brandId.toString()) {
      const brand = await Brand.findById(brandId);
      if (!brand) throw ApiError.badRequest('Referenced Brand does not exist');
      product.brandId = brandId;
    }

    if (slug) {
      const finalSlug = generateSlug(slug);
      if (finalSlug !== product.slug) {
        const existing = await Product.findOne({ slug: finalSlug, _id: { $ne: product._id } });
        if (existing) throw ApiError.conflict(`Product slug '${finalSlug}' is already taken.`);
        product.slug = finalSlug;
      }
    }

    if (attributes) {
      await validateProductAttributes(targetCategoryId, attributes);
      product.attributes = attributes;
    }

    if (variants) {
      await validateProductVariants(variants, product._id);
      product.variants = variants;
    }

    if (title) product.title = title;
    if (description) product.description = description;
    if (status) product.status = status;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (badges !== undefined) product.badges = badges;
    if (hasVariants !== undefined) product.hasVariants = hasVariants;
    if (images !== undefined) product.images = images;
    if (seo !== undefined) product.seo = seo;

    await product.save();

    return sendSuccess(res, HTTP_STATUS.OK, 'Product updated successfully', {
      product: product.toJSON()
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const orderCount = await Order.countDocuments({ 'items.productId': product._id });

    // If permanent deletion requested and no orders exist, delete permanently
    if (req.query.permanent === 'true') {
      if (orderCount === 0) {
        await Product.deleteOne({ _id: product._id });
        return sendSuccess(res, HTTP_STATUS.OK, 'Product permanently deleted successfully');
      } else {
        // If orders exist, archive and disassociate to protect historical order records
        product.status = 'archived';
        await product.save();
        return sendSuccess(res, HTTP_STATUS.OK, 'Product has order history, safely archived');
      }
    }

    // Soft delete by setting status to archived
    product.status = 'archived';
    await product.save();

    return sendSuccess(res, HTTP_STATUS.OK, 'Product archived successfully');
  } catch (error) {
    next(error);
  }
}

export default {
  getProducts,
  getProductSuggestions,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct
};
