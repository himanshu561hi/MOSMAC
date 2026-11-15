import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
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
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Fetch immediate child categories
    const subcategories = await Category.find({ parentId: category._id, isActive: true }).sort({ displayOrder: 1 });

    return sendSuccess(res, HTTP_STATUS.OK, 'Category details retrieved', {
      category: category.toJSON(),
      subcategories
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

export async function deleteCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Safety checks: Prevent deletion if subcategories or products exist
    const subcategoryCount = await Category.countDocuments({ parentId: category._id });
    if (subcategoryCount > 0) {
      throw ApiError.badRequest(
        `Cannot delete category with ${subcategoryCount} active subcategories. Reassign or delete subcategories first.`
      );
    }

    const productCount = await Product.countDocuments({ categoryId: category._id });
    if (productCount > 0) {
      throw ApiError.badRequest(
        `Cannot delete category with ${productCount} assigned products. Reassign products first.`
      );
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
  createCategory,
  updateCategory,
  deleteCategory
};

