import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { generateSlug } from '../services/catalogueService.js';

export async function getBrands(req, res, next) {
  try {
    const query = {};
    if (!req.user || req.user.role === 'customer') {
      query.isActive = true;
    }

    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }

    const brands = await Brand.find(query).sort({ name: 1 });
    return sendSuccess(res, HTTP_STATUS.OK, 'Brands retrieved', { brands });
  } catch (error) {
    next(error);
  }
}

export async function getBrandBySlug(req, res, next) {
  try {
    const brand = await Brand.findOne({ slug: req.params.slug });
    if (!brand) {
      throw ApiError.notFound('Brand not found');
    }
    return sendSuccess(res, HTTP_STATUS.OK, 'Brand retrieved', { brand });
  } catch (error) {
    next(error);
  }
}

export async function createBrand(req, res, next) {
  try {
    const {
      name,
      slug,
      logoUrl,
      description,
      website,
      isActive,
      isMosmacLoves,
      isTopBrand,
      isNewlyAdded,
      isFeatured,
      isMosmacRed,
      isHomegrown
    } = req.body;
    const finalSlug = slug ? generateSlug(slug) : generateSlug(name);

    const existing = await Brand.findOne({ $or: [{ name }, { slug: finalSlug }] });
    if (existing) {
      throw ApiError.conflict('A brand with this name or slug already exists.');
    }

    const brand = await Brand.create({
      name,
      slug: finalSlug,
      logoUrl,
      description,
      website,
      isActive,
      isMosmacLoves: Boolean(isMosmacLoves),
      isTopBrand: Boolean(isTopBrand),
      isNewlyAdded: Boolean(isNewlyAdded),
      isFeatured: Boolean(isFeatured),
      isMosmacRed: Boolean(isMosmacRed),
      isHomegrown: Boolean(isHomegrown)
    });

    return sendSuccess(res, HTTP_STATUS.CREATED, 'Brand created successfully', { brand });
  } catch (error) {
    next(error);
  }
}

export async function updateBrand(req, res, next) {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      throw ApiError.notFound('Brand not found');
    }

    const {
      name,
      slug,
      logoUrl,
      description,
      website,
      isActive,
      isMosmacLoves,
      isTopBrand,
      isNewlyAdded,
      isFeatured,
      isMosmacRed,
      isHomegrown
    } = req.body;

    if (slug) {
      const finalSlug = generateSlug(slug);
      if (finalSlug !== brand.slug) {
        const existing = await Brand.findOne({ slug: finalSlug, _id: { $ne: brand._id } });
        if (existing) {
          throw ApiError.conflict('A brand with this slug already exists.');
        }
        brand.slug = finalSlug;
      }
    }

    if (name) brand.name = name;
    if (logoUrl !== undefined) brand.logoUrl = logoUrl;
    if (description !== undefined) brand.description = description;
    if (website !== undefined) brand.website = website;
    if (isActive !== undefined) brand.isActive = isActive;
    if (isMosmacLoves !== undefined) brand.isMosmacLoves = Boolean(isMosmacLoves);
    if (isTopBrand !== undefined) brand.isTopBrand = Boolean(isTopBrand);
    if (isNewlyAdded !== undefined) brand.isNewlyAdded = Boolean(isNewlyAdded);
    if (isFeatured !== undefined) brand.isFeatured = Boolean(isFeatured);
    if (isMosmacRed !== undefined) brand.isMosmacRed = Boolean(isMosmacRed);
    if (isHomegrown !== undefined) brand.isHomegrown = Boolean(isHomegrown);

    await brand.save();

    return sendSuccess(res, HTTP_STATUS.OK, 'Brand updated successfully', { brand });
  } catch (error) {
    next(error);
  }
}

export async function getBrandDeletePreview(req, res, next) {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      throw ApiError.notFound('Brand not found');
    }

    const products = await Product.find({ brandId: brand._id })
      .select('_id title slug status basePrice variants categoryId')
      .populate('categoryId', 'name slug')
      .lean();

    const productIds = products.map((p) => p._id);
    const ordersWithProducts = await Order.find({ 'items.productId': { $in: productIds } })
      .select('items.productId')
      .lean();

    const orderedProductIds = new Set();
    ordersWithProducts.forEach((order) => {
      order.items?.forEach((item) => {
        if (item.productId) orderedProductIds.add(String(item.productId));
      });
    });

    const enrichedProducts = products.map((p) => ({
      _id: p._id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      basePrice: p.basePrice,
      categoryName: p.categoryId?.name || 'Unassigned',
      sku: p.variants?.[0]?.sku || 'N/A',
      hasOrders: orderedProductIds.has(String(p._id))
    }));

    return sendSuccess(res, HTTP_STATUS.OK, 'Brand delete preview generated', {
      brand: {
        _id: brand._id,
        name: brand.name,
        slug: brand.slug
      },
      products: enrichedProducts,
      totalProducts: enrichedProducts.length,
      canDirectlyDelete: enrichedProducts.length === 0
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteBrand(req, res, next) {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      throw ApiError.notFound('Brand not found');
    }

    const products = await Product.find({ brandId: brand._id });
    const productCount = products.length;

    if (productCount > 0) {
      if (req.query.cascade === 'true') {
        const productIds = products.map((p) => p._id);
        const ordersWithProducts = await Order.find({ 'items.productId': { $in: productIds } })
          .select('items.productId')
          .lean();

        const orderedProductIds = new Set();
        ordersWithProducts.forEach((order) => {
          order.items?.forEach((item) => {
            if (item.productId) orderedProductIds.add(String(item.productId));
          });
        });

        // For products without orders: permanently delete. For products with orders: archive and disassociate.
        for (const prod of products) {
          if (orderedProductIds.has(String(prod._id))) {
            prod.status = 'archived';
            prod.brandId = null;
            await prod.save();
          } else {
            await Product.deleteOne({ _id: prod._id });
          }
        }
      } else {
        throw ApiError.badRequest(
          `Cannot delete brand with ${productCount} assigned products. Reassign or remove products first.`
        );
      }
    }

    await Brand.deleteOne({ _id: brand._id });
    return sendSuccess(res, HTTP_STATUS.OK, 'Brand deleted successfully');
  } catch (error) {
    next(error);
  }
}

export default {
  getBrands,
  getBrandBySlug,
  getBrandDeletePreview,
  createBrand,
  updateBrand,
  deleteBrand
};

