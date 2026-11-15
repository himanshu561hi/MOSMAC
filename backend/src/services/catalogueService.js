import { Category } from '../models/Category.js';
import { AttributeDefinition } from '../models/AttributeDefinition.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Creates a URL-friendly slug from string
 * @param {string} text 
 * @returns {string}
 */
export function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Verifies that setting target parentId does not cause a circular dependency.
 * @param {string} categoryId - The category being updated
 * @param {string} targetParentId - The intended new parentId
 */
export async function validateCategoryHierarchy(categoryId, targetParentId) {
  if (!targetParentId) return;

  if (categoryId.toString() === targetParentId.toString()) {
    throw ApiError.badRequest('A category cannot be its own parent', ERROR_CODES.BAD_REQUEST);
  }

  // Check if targetParent has categoryId anywhere in its ancestors chain
  const parentCategory = await Category.findById(targetParentId);
  if (!parentCategory) {
    throw ApiError.badRequest('Parent category does not exist', ERROR_CODES.NOT_FOUND);
  }

  const hasCircularAncestor = (parentCategory.ancestors || []).some(
    (anc) => anc._id.toString() === categoryId.toString()
  );

  if (hasCircularAncestor) {
    throw ApiError.badRequest(
      'Circular reference detected: Target parent is a descendant of this category',
      ERROR_CODES.BAD_REQUEST
    );
  }
}

/**
 * Reconstructs the ancestors array for a category based on its parentId
 * @param {string|null} parentId 
 * @returns {Promise<Array<{ _id: string, name: string, slug: string }>>}
 */
export async function buildAncestors(parentId) {
  if (!parentId) return [];

  const parent = await Category.findById(parentId);
  if (!parent) return [];

  return [
    ...(parent.ancestors || []),
    {
      _id: parent._id,
      name: parent.name,
      slug: parent.slug
    }
  ];
}

/**
 * Validates product attributes dynamically against category-defined AttributeDefinitions
 * @param {string} categoryId 
 * @param {Array<{ attributeId: string, code: string, value: any }>} attributes 
 */
export async function validateProductAttributes(categoryId, attributes = []) {
  const definitions = await AttributeDefinition.find({ categoryId });
  const attrMap = new Map(attributes.map((a) => [a.code.toLowerCase(), a.value]));

  // 1. Check for required attributes
  for (const def of definitions) {
    if (def.isRequired && (!attrMap.has(def.code) || attrMap.get(def.code) === null || attrMap.get(def.code) === undefined || attrMap.get(def.code) === '')) {
      throw ApiError.badRequest(
        `Attribute '${def.name}' (${def.code}) is required for this category.`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }

  // 2. Validate attribute types and allowed options
  const defMap = new Map(definitions.map((d) => [d.code, d]));

  for (const attr of attributes) {
    const def = defMap.get(attr.code.toLowerCase());
    if (!def) {
      // Attribute does not belong to category definitions
      continue;
    }

    const val = attr.value;

    switch (def.type) {
      case 'number':
        if (typeof val !== 'number' || isNaN(val)) {
          throw ApiError.badRequest(`Attribute '${def.name}' must be a valid number.`);
        }
        if (def.validation?.min !== undefined && val < def.validation.min) {
          throw ApiError.badRequest(`Attribute '${def.name}' must be >= ${def.validation.min}.`);
        }
        if (def.validation?.max !== undefined && val > def.validation.max) {
          throw ApiError.badRequest(`Attribute '${def.name}' must be <= ${def.validation.max}.`);
        }
        break;

      case 'boolean':
        if (typeof val !== 'boolean') {
          throw ApiError.badRequest(`Attribute '${def.name}' must be a boolean.`);
        }
        break;

      case 'select':
        if (!def.options.includes(val)) {
          throw ApiError.badRequest(
            `Invalid option '${val}' for '${def.name}'. Allowed options: ${def.options.join(', ')}`
          );
        }
        break;

      case 'multiselect':
        if (!Array.isArray(val)) {
          throw ApiError.badRequest(`Attribute '${def.name}' must be an array of selected options.`);
        }
        for (const item of val) {
          if (!def.options.includes(item)) {
            throw ApiError.badRequest(
              `Invalid option '${item}' in '${def.name}'. Allowed options: ${def.options.join(', ')}`
            );
          }
        }
        break;

      case 'text':
      default:
        if (def.validation?.pattern) {
          const regex = new RegExp(def.validation.pattern);
          if (!regex.test(String(val))) {
            throw ApiError.badRequest(`Attribute '${def.name}' does not match required format.`);
          }
        }
        break;
    }
  }
}

/**
 * Validates uniqueness of variants within a product and verifies SKU uniqueness
 * @param {Array<Object>} variants 
 * @param {string|null} existingProductId 
 */
export async function validateProductVariants(variants = [], existingProductId = null) {
  const skuSet = new Set();
  const combinationsSet = new Set();

  for (const v of variants) {
    const cleanSku = v.sku.trim().toUpperCase();
    if (skuSet.has(cleanSku)) {
      throw ApiError.conflict(`Duplicate SKU detected in variants payload: ${cleanSku}`);
    }
    skuSet.add(cleanSku);

    // Combination check
    if (v.attributes && typeof v.attributes === 'object') {
      const sortedKeys = Object.keys(v.attributes).sort();
      const comboKey = sortedKeys.map((k) => `${k}:${v.attributes[k]}`).join('|');
      if (comboKey) {
        if (combinationsSet.has(comboKey)) {
          throw ApiError.conflict(`Duplicate variant combination detected: [${comboKey}]`);
        }
        combinationsSet.add(comboKey);
      }
    }
  }

  // Check SKU uniqueness in database against OTHER products
  const query = {
    'variants.sku': { $in: Array.from(skuSet) }
  };
  if (existingProductId) {
    query._id = { $ne: existingProductId };
  }

  const conflicting = await Product.findOne(query);
  if (conflicting) {
    throw ApiError.conflict(`One or more SKUs are already assigned to another product`);
  }
}

export default {
  generateSlug,
  validateCategoryHierarchy,
  buildAncestors,
  validateProductAttributes,
  validateProductVariants
};

