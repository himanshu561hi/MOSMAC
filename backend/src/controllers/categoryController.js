import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Brand } from '../models/Brand.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { generateSlug, validateCategoryHierarchy, buildAncestors } from '../services/catalogueService.js';

export async function getCategories(req, res, next) {
  try {
    const isTree = req.query.tree === 'true';
    const query = {};

    // If client is not admin, only show active categories
    if (!req.user || req.user.role === 'customer') {
      query.isActive = true;
    }

    const categories = await Category.find(query).sort({ displayOrder: 1, name: 1 });

    if (isTree) {
      // Build hierarchical tree
      const categoryMap = new Map();
      categories.forEach((cat) => {
        categoryMap.set(cat._id.toString(), { ...cat.toJSON(), children: [] });
      });

      const rootCategories = [];
      categories.forEach((cat) => {
        const item = categoryMap.get(cat._id.toString());
        if (cat.parentId && categoryMap.has(cat.parentId.toString())) {
          categoryMap.get(cat.parentId.toString()).children.push(item);
        } else {
          rootCategories.push(item);
        }
      });

      return sendSuccess(res, HTTP_STATUS.OK, 'Category tree retrieved', { categories: rootCategories });
    }

    return sendSuccess(res, HTTP_STATUS.OK, 'Categories list retrieved', { categories });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryBySlug(req, res, next) {
  try {
    const rawSlug = req.params.slug?.trim();
    let category = await Category.findOne({ slug: rawSlug });
    if (!category && rawSlug) {
      const altSlug = rawSlug.endsWith('es')
        ? rawSlug.slice(0, -2)
        : rawSlug.endsWith('s')
        ? rawSlug.slice(0, -1)
        : `${rawSlug}es`;
      const altSlugS = rawSlug.endsWith('s') ? rawSlug.slice(0, -1) : `${rawSlug}s`;
      category = await Category.findOne({ slug: { $in: [altSlug, altSlugS] } });
    }
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Fetch immediate child categories (subcategories)
    const subcategories = await Category.find({ parentId: category._id, isActive: true }).sort({ displayOrder: 1 });
    const subcatIds = subcategories.map((s) => s._id);

    // For each subcategory, fetch count and top 4 products (including its descendant categories)
    const enrichedSubcategories = await Promise.all(
      subcategories.map(async (sub) => {
        const descendantCats = await Category.find({
          $or: [{ parentId: sub._id }, { 'ancestors._id': sub._id }]
        }).select('_id');
        const subCatIds = [sub._id, ...descendantCats.map((c) => c._id)];

        const [productCount, products] = await Promise.all([
          Product.countDocuments({ categoryId: { $in: subCatIds }, status: 'published' }),
          Product.find({ categoryId: { $in: subCatIds }, status: 'published' })
            .select('title slug description basePrice baseMrp images ratings badges isFeatured brandId categoryId')
            .populate('brandId', 'name slug logoUrl')
            .populate('categoryId', 'name slug')
            .sort({ isFeatured: -1, createdAt: -1 })
            .limit(4)
            .lean()
        ]);

        return {
          ...sub.toJSON(),
          productCount,
          products
        };
      })
    );

    // All category IDs under this category tree (including self and all descendants)
    const allDescendantCategories = await Category.find({
      $or: [
        { 'ancestors._id': category._id },
        { parentId: category._id },
        { parentId: { $in: subcatIds } },
        { 'ancestors._id': { $in: subcatIds } }
      ]
    }).select('_id');
    const allCategoryIds = [category._id, ...subcatIds, ...allDescendantCategories.map((c) => c._id)];

    // Fetch top deals in this category tree (highest discount where baseMrp > basePrice)
    const deals = await Product.find({
      categoryId: { $in: allCategoryIds },
      status: 'published',
      $expr: { $gt: ['$baseMrp', '$basePrice'] }
    })
      .select('title slug description basePrice baseMrp images ratings badges isFeatured brandId categoryId')
      .populate('brandId', 'name slug logoUrl')
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    // Fetch top rated products in this category tree (ratings.average >= 4)
    const topRated = await Product.find({
      categoryId: { $in: allCategoryIds },
      status: 'published',
      'ratings.average': { $gte: 4 }
    })
      .select('title slug description basePrice baseMrp images ratings badges isFeatured brandId categoryId')
      .populate('brandId', 'name slug logoUrl')
      .populate('categoryId', 'name slug')
      .sort({ 'ratings.average': -1, 'ratings.count': -1 })
      .limit(4)
      .lean();

    // Fetch bestsellers / trending in this category tree
    const bestsellers = await Product.find({
      categoryId: { $in: allCategoryIds },
      status: 'published',
      $or: [{ badges: { $in: ['BESTSELLER', 'HOT', 'TRENDING'] } }, { isFeatured: true }]
    })
      .select('title slug description basePrice baseMrp images ratings badges isFeatured brandId categoryId')
      .populate('brandId', 'name slug logoUrl')
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    // Fetch distinct brands active in this category
    const brandIds = await Product.distinct('brandId', {
      categoryId: { $in: allCategoryIds },
      status: 'published'
    });
    const brands = await Brand.find({ _id: { $in: brandIds }, isActive: true })
      .select('name slug logoUrl description')
      .lean();

    // Total products in this category
    const totalProducts = await Product.countDocuments({
      categoryId: { $in: allCategoryIds },
      status: 'published'
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Category details retrieved', {
      category: category.toJSON(),
      subcategories: enrichedSubcategories,
      deals,
      topRated,
      bestsellers,
      brands,
      totalProducts
    });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, slug, description, parentId, imageUrl, displayOrder, isActive } = req.body;

    const finalSlug = slug ? generateSlug(slug) : generateSlug(name);

    const existing = await Category.findOne({ slug: finalSlug });
    if (existing) {
      throw ApiError.conflict(`A category with slug '${finalSlug}' already exists.`);
    }

    const ancestors = await buildAncestors(parentId);

    const category = await Category.create({
      name,
      slug: finalSlug,
      description,
      parentId: parentId || null,
      ancestors,
      imageUrl,
      displayOrder,
      isActive
    });

    return sendSuccess(res, HTTP_STATUS.CREATED, 'Category created successfully', {
      category: category.toJSON()
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    const { name, slug, description, parentId, imageUrl, displayOrder, isActive } = req.body;

    if (slug) {
      const finalSlug = generateSlug(slug);
      if (finalSlug !== category.slug) {
        const existing = await Category.findOne({ slug: finalSlug, _id: { $ne: category._id } });
        if (existing) {
          throw ApiError.conflict(`A category with slug '${finalSlug}' already exists.`);
        }
        category.slug = finalSlug;
      }
    }

    if (parentId !== undefined && parentId !== null) {
      await validateCategoryHierarchy(category._id, parentId);
      category.parentId = parentId;
      category.ancestors = await buildAncestors(parentId);
    } else if (parentId === null) {
      category.parentId = null;
      category.ancestors = [];
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (imageUrl !== undefined) category.imageUrl = imageUrl;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    return sendSuccess(res, HTTP_STATUS.OK, 'Category updated successfully', {
      category: category.toJSON()
    });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryDeletePreview(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Find all direct child subcategories and recursive descendants
    const subcategories = await Category.find({ parentId: category._id }).select('_id name slug').lean();
    const subcategoryIds = subcategories.map((s) => s._id);
    const allCatIds = [category._id, ...subcategoryIds];

    const products = await Product.find({ categoryId: { $in: allCatIds } })
      .select('_id title slug status basePrice variants brandId categoryId')
      .populate('brandId', 'name')
      .populate('categoryId', 'name')
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
      brandName: p.brandId?.name || 'Unbranded',
      categoryName: p.categoryId?.name || category.name,
      sku: p.variants?.[0]?.sku || 'N/A',
      hasOrders: orderedProductIds.has(String(p._id))
    }));

    return sendSuccess(res, HTTP_STATUS.OK, 'Category delete preview generated', {
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug
      },
      subcategories,
      products: enrichedProducts,
      totalSubcategories: subcategories.length,
      totalProducts: enrichedProducts.length,
      canDirectlyDelete: subcategories.length === 0 && enrichedProducts.length === 0
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    const subcategories = await Category.find({ parentId: category._id });
    const subcategoryCount = subcategories.length;
    const allCatIds = [category._id, ...subcategories.map((s) => s._id)];
    const products = await Product.find({ categoryId: { $in: allCatIds } });
    const productCount = products.length;

    if (subcategoryCount > 0 || productCount > 0) {
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
            prod.categoryId = null;
            await prod.save();
          } else {
            await Product.deleteOne({ _id: prod._id });
          }
        }

        // Delete all child subcategories
        await Category.deleteMany({ parentId: category._id });
      } else {
        if (subcategoryCount > 0) {
          throw ApiError.badRequest(
            `Cannot delete category with ${subcategoryCount} active subcategories. Reassign or delete subcategories first.`
          );
        }
        if (productCount > 0) {
          throw ApiError.badRequest(
            `Cannot delete category with ${productCount} assigned products. Reassign products first.`
          );
        }
      }
    }

    await Category.deleteOne({ _id: category._id });

    return sendSuccess(res, HTTP_STATUS.OK, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
}

export default {
  getCategories,
  getCategoryBySlug,
  getCategoryDeletePreview,
  createCategory,
  updateCategory,
  deleteCategory
};

