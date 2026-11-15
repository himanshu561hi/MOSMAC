import { Product } from '../models/Product.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Atomically adjusts stock quantity for a specific SKU.
 * Prevents negative stock via condition filters, preventing race conditions.
 * Records an immutable audit log.
 * 
 * @param {Object} params
 * @param {string} params.sku
 * @param {number} params.delta - Positive for addition, negative for reduction
 * @param {string} params.reason - 'restock', 'correction', 'damaged', 'return', 'audit', etc.
 * @param {string} [params.referenceId]
 * @param {string} [params.note]
 * @param {string} params.performedBy - User ID
 */
export async function adjustStock({ sku, delta, reason, referenceId = '', note = '', performedBy }) {
  const cleanSku = sku.trim().toUpperCase();

  // Find product to read current state
  const product = await Product.findOne({ 'variants.sku': cleanSku });
  if (!product) {
    throw ApiError.notFound(`SKU '${cleanSku}' not found in any product catalogue.`);
  }

  const variant = product.variants.find((v) => v.sku === cleanSku);
  const previousStock = variant.stockQuantity;

  // Query condition ensures atomic check-and-decrement
  const updateQuery = {
    _id: product._id,
    'variants.sku': cleanSku
  };

  // If reducing stock, atomically verify that available stock >= delta to prevent negative inventory
  if (delta < 0) {
    updateQuery['variants.stockQuantity'] = { $gte: Math.abs(delta) };
  }

  const updatedProduct = await Product.findOneAndUpdate(
    updateQuery,
    {
      $inc: { 'variants.$.stockQuantity': delta }
    },
    { new: true }
  );

  if (!updatedProduct) {
    throw ApiError.badRequest(
      `Insufficient stock for SKU '${cleanSku}'. Current stock: ${previousStock}, requested deduction: ${Math.abs(delta)}`,
      ERROR_CODES.INSUFFICIENT_STOCK
    );
  }

  const updatedVariant = updatedProduct.variants.find((v) => v.sku === cleanSku);
  const newStock = updatedVariant.stockQuantity;

  // Record audit log
  const log = await InventoryLog.create({
    productId: product._id,
    sku: cleanSku,
    delta,
    previousStock,
    newStock,
    reason,
    referenceId,
    note,
    performedBy
  });

  return {
    product: updatedProduct,
    variant: updatedVariant,
    log
  };
}

/**
 * Atomically reserves stock for checkout.
 * Moves quantity from stockQuantity to reservedQuantity.
 */
export async function reserveStock({ sku, quantity, referenceId = '', performedBy }) {
  const cleanSku = sku.trim().toUpperCase();

  const updated = await Product.findOneAndUpdate(
    {
      'variants.sku': cleanSku,
      'variants.stockQuantity': { $gte: quantity }
    },
    {
      $inc: {
        'variants.$.stockQuantity': -quantity,
        'variants.$.reservedQuantity': quantity
      }
    },
    { new: true }
  );

  if (!updated) {
    throw ApiError.badRequest(
      `Unable to reserve stock for SKU '${cleanSku}'. Insufficient inventory.`,
      ERROR_CODES.INSUFFICIENT_STOCK
    );
  }

  const variant = updated.variants.find((v) => v.sku === cleanSku);

  await InventoryLog.create({
    productId: updated._id,
    sku: cleanSku,
    delta: -quantity,
    previousStock: variant.stockQuantity + quantity,
    newStock: variant.stockQuantity,
    reason: 'order_reservation',
    referenceId,
    note: `Reserved ${quantity} units for checkout session`,
    performedBy: performedBy || updated._id
  });

  return updated;
}

/**
 * Releases reserved stock (e.g., checkout expired or payment abandoned).
 */
export async function releaseReservedStock({ sku, quantity, referenceId = '', performedBy }) {
  const cleanSku = sku.trim().toUpperCase();

  const updated = await Product.findOneAndUpdate(
    {
      'variants.sku': cleanSku,
      'variants.reservedQuantity': { $gte: quantity }
    },
    {
      $inc: {
        'variants.$.stockQuantity': quantity,
        'variants.$.reservedQuantity': -quantity
      }
    },
    { new: true }
  );

  if (!updated) {
    throw ApiError.badRequest(`Could not release reserved stock for SKU '${cleanSku}'.`);
  }

  const variant = updated.variants.find((v) => v.sku === cleanSku);

  await InventoryLog.create({
    productId: updated._id,
    sku: cleanSku,
    delta: quantity,
    previousStock: variant.stockQuantity - quantity,
    newStock: variant.stockQuantity,
    reason: 'order_cancellation',
    referenceId,
    note: `Released ${quantity} units back to available inventory`,
    performedBy: performedBy || updated._id
  });

  return updated;
}

/**
 * Retrieves paginated inventory overview with low-stock alerts
 */
export async function getInventoryOverview({ page = 1, limit = 20, search = '', lowStockOnly = false }) {
  const skip = (page - 1) * limit;

  // Unwind variants to show individual SKU rows
  const matchStage = {};
  if (search) {
    matchStage.$or = [
      { 'variants.sku': { $regex: search, $options: 'i' } },
      { 'variants.title': { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } }
    ];
  }

  const pipeline = [
    { $unwind: '$variants' },
    { $match: matchStage }
  ];

  if (lowStockOnly) {
    pipeline.push({
      $match: {
        $expr: {
          $lte: ['$variants.stockQuantity', '$variants.lowStockThreshold']
        }
      }
    });
  }

  const countPipeline = [...pipeline, { $count: 'total' }];

  pipeline.push(
    { $sort: { 'variants.stockQuantity': 1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        productTitle: '$title',
        productSlug: '$slug',
        status: 1,
        variantId: '$variants._id',
        sku: '$variants.sku',
        title: '$variants.title',
        attributes: '$variants.attributes',
        price: '$variants.price',
        mrp: '$variants.mrp',
        stockQuantity: '$variants.stockQuantity',
        reservedQuantity: '$variants.reservedQuantity',
        availableStock: { $subtract: ['$variants.stockQuantity', '$variants.reservedQuantity'] },
        lowStockThreshold: '$variants.lowStockThreshold',
        isLowStock: { $lte: ['$variants.stockQuantity', '$variants.lowStockThreshold'] },
        isOutOfStock: { $eq: ['$variants.stockQuantity', 0] }
      }
    }
  );

  const [items, countResult] = await Promise.all([
    Product.aggregate(pipeline),
    Product.aggregate(countPipeline)
  ]);

  const total = countResult[0] ? countResult[0].total : 0;

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export default {
  adjustStock,
  reserveStock,
  releaseReservedStock,
  getInventoryOverview
};

