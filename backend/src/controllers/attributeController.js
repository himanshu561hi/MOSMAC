import { AttributeDefinition } from '../models/AttributeDefinition.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export async function getAttributesByCategory(req, res, next) {
  try {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Include attributes defined directly on this category or inherited from ancestors
    const categoryIds = [category._id, ...(category.ancestors || []).map((a) => a._id)];
    const attributes = await AttributeDefinition.find({ categoryId: { $in: categoryIds } });

    return sendSuccess(res, HTTP_STATUS.OK, 'Category attributes retrieved', { attributes });
  } catch (error) {
    next(error);
  }
}

export async function createAttribute(req, res, next) {
  try {
    const { categoryId, name, code, type, unit, options, isRequired, isFilterable, validation } = req.body;

    const category = await Category.findById(categoryId);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    const cleanCode = code.trim().toLowerCase();
    const existing = await AttributeDefinition.findOne({ categoryId, code: cleanCode });
    if (existing) {
      throw ApiError.conflict(`Attribute with code '${cleanCode}' already exists for this category.`);
    }

    if ((type === 'select' || type === 'multiselect') && (!options || options.length === 0)) {
      throw ApiError.badRequest(`Options array is required for '${type}' attribute type.`);
    }

    const attribute = await AttributeDefinition.create({
      categoryId,
      name,
      code: cleanCode,
      type,
      unit,
      options: options || [],
      isRequired: isRequired || false,
      isFilterable: isFilterable !== undefined ? isFilterable : true,
      validation
    });

    return sendSuccess(res, HTTP_STATUS.CREATED, 'Attribute created successfully', { attribute });
  } catch (error) {
    next(error);
  }
}

export async function updateAttribute(req, res, next) {
  try {
    const attribute = await AttributeDefinition.findById(req.params.id);
    if (!attribute) {
      throw ApiError.notFound('Attribute not found');
    }

    const { name, type, unit, options, isRequired, isFilterable, validation } = req.body;

    if (name) attribute.name = name;
    if (type) attribute.type = type;
    if (unit !== undefined) attribute.unit = unit;
    if (options !== undefined) attribute.options = options;
    if (isRequired !== undefined) attribute.isRequired = isRequired;
    if (isFilterable !== undefined) attribute.isFilterable = isFilterable;
    if (validation !== undefined) attribute.validation = validation;

    await attribute.save();

    return sendSuccess(res, HTTP_STATUS.OK, 'Attribute updated successfully', { attribute });
  } catch (error) {
    next(error);
  }
}

export async function deleteAttribute(req, res, next) {
  try {
    const attribute = await AttributeDefinition.findById(req.params.id);
    if (!attribute) {
      throw ApiError.notFound('Attribute not found');
    }

    await AttributeDefinition.deleteOne({ _id: attribute._id });
    return sendSuccess(res, HTTP_STATUS.OK, 'Attribute deleted successfully');
  } catch (error) {
    next(error);
  }
}

export default {
  getAttributesByCategory,
  createAttribute,
  updateAttribute,
  deleteAttribute
};

