import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
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
    const { name, slug, logoUrl, description, website, isActive } = req.body;
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
      isActive
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

    const { name, slug, logoUrl, description, website, isActive } = req.body;

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

    await brand.save();

    return sendSuccess(res, HTTP_STATUS.OK, 'Brand updated successfully', { brand });
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

    const productCount = await Product.countDocuments({ brandId: brand._id });
    if (productCount > 0) {
      throw ApiError.badRequest(
        `Cannot delete brand with ${productCount} assigned products. Reassign or remove products first.`
      );
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
  createBrand,
  updateBrand,
  deleteBrand
};

