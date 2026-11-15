import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { ApiError } from '../utils/ApiError.js';
import { auditService } from './auditService.js';

export const inventoryOperationsService = {
  /**
   * Retrieves low stock and replenishment alert items
   */
  async getReplenishmentAlerts({ page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;

    const pipeline = [
      { $unwind: '$variants' },
      {
        $match: {
          $expr: {
            $lte: ['$variants.stockQuantity', '$variants.lowStockThreshold']
          }
        }
      },
      {
        $project: {
          productId: '$_id',
          title: 1,
          slug: 1,
          sku: '$variants.sku',
          stockQuantity: '$variants.stockQuantity',
          reservedQuantity: '$variants.reservedQuantity',
          availableStock: {
            $max: [0, { $subtract: ['$variants.stockQuantity', '$variants.reservedQuantity'] }]
          },
          lowStockThreshold: '$variants.lowStockThreshold',
          costPrice: '$variants.costPrice',
          sellingPrice: '$variants.price',
          suggestedReorderQuantity: {
            $max: [
              10,
              {
                $subtract: [
                  { $multiply: ['$variants.lowStockThreshold', 2] },
                  '$variants.stockQuantity'
                ]
              }
            ]
          },
          status: {
            $cond: [
              { $eq: ['$variants.stockQuantity', 0] },
              'OUT_OF_STOCK',
              'LOW_STOCK'
            ]
          }
        }
      },
      { $sort: { stockQuantity: 1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const countPipeline = [
      { $unwind: '$variants' },
      {
        $match: {
          $expr: {
            $lte: ['$variants.stockQuantity', '$variants.lowStockThreshold']
          }
        }
      },
      { $count: 'total' }
    ];

    const [alerts, countResult] = await Promise.all([
      Product.aggregate(pipeline),
      Product.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;

    return {
      alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Update SKU low-stock alert threshold
   */
  async updateSkuThreshold(sku, threshold, staffUser) {
    const numThreshold = parseInt(threshold, 10);
    if (isNaN(numThreshold) || numThreshold < 0) {
      throw ApiError.badRequest('Threshold must be a non-negative number');
    }

    const product = await Product.findOne({ 'variants.sku': sku.toUpperCase().trim() });
    if (!product) {
      throw ApiError.notFound(`SKU ${sku} not found`);
    }

    const variant = product.variants.find((v) => v.sku === sku.toUpperCase().trim());
    const oldThreshold = variant.lowStockThreshold;
    variant.lowStockThreshold = numThreshold;

    await product.save();

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'INVENTORY_THRESHOLD_UPDATE',
      resourceType: 'Product',
      resourceId: product._id,
      changes: { sku, oldThreshold, newThreshold: numThreshold },
      notes: `Low-stock threshold for SKU ${sku} updated to ${numThreshold}`
    });

    return { sku, lowStockThreshold: numThreshold };
  },

  /**
   * Perform stock adjustment with logging
   */
  async adjustStock({ sku, delta, reason, referenceId = '', note = '' }, staffUser) {
    const deltaNum = parseInt(delta, 10);
    if (isNaN(deltaNum) || deltaNum === 0) {
      throw ApiError.badRequest('Delta must be a non-zero integer');
    }

    const product = await Product.findOne({ 'variants.sku': sku.toUpperCase().trim() });
    if (!product) {
      throw ApiError.notFound(`SKU ${sku} not found`);
    }

    const variant = product.variants.find((v) => v.sku === sku.toUpperCase().trim());
    const previousStock = variant.stockQuantity;
    const newStock = previousStock + deltaNum;

    if (newStock < 0) {
      throw ApiError.badRequest(
        `Insufficient stock for adjustment. Current stock is ${previousStock}, requested deduction is ${Math.abs(deltaNum)}`
      );
    }

    variant.stockQuantity = newStock;
    await product.save();

    // Record in InventoryLog
    await InventoryLog.create({
      productId: product._id,
      sku: variant.sku,
      delta: deltaNum,
      previousStock,
      newStock,
      reason,
      referenceId,
      note,
      performedBy: staffUser._id
    });

    // Record in AuditLog
    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'INVENTORY_ADJUSTMENT',
      resourceType: 'Product',
      resourceId: product._id,
      changes: { sku: variant.sku, delta: deltaNum, previousStock, newStock, reason },
      notes: note || `Stock adjusted by ${deltaNum} (${reason})`
    });

    return {
      sku: variant.sku,
      previousStock,
      newStock,
      delta: deltaNum,
      reason
    };
  },

  /**
   * Export complete inventory list as CSV
   */
  async exportInventoryCsv() {
    const products = await Product.find({})
      .select('title slug variants categoryId brandId')
      .populate('categoryId', 'name')
      .populate('brandId', 'name')
      .lean();

    const headers = [
      'Product Title',
      'SKU',
      'Category',
      'Brand',
      'Stock Quantity',
      'Reserved Quantity',
      'Available Stock',
      'Low Stock Threshold',
      'Selling Price (INR)',
      'Cost Price (INR)',
      'Stock Status'
    ];

    const rows = [];
    products.forEach((p) => {
      (p.variants || []).forEach((v) => {
        const available = Math.max(0, (v.stockQuantity || 0) - (v.reservedQuantity || 0));
        const status = (v.stockQuantity || 0) === 0 ? 'OUT_OF_STOCK' : (v.stockQuantity || 0) <= (v.lowStockThreshold || 5) ? 'LOW_STOCK' : 'IN_STOCK';
        rows.push([
          `"${(p.title || '').replace(/"/g, '""')}"`,
          `"${v.sku}"`,
          `"${(p.categoryId?.name || '').replace(/"/g, '""')}"`,
          `"${(p.brandId?.name || '').replace(/"/g, '""')}"`,
          v.stockQuantity || 0,
          v.reservedQuantity || 0,
          available,
          v.lowStockThreshold || 5,
          ((v.price || 0) / 100).toFixed(2),
          ((v.costPrice || 0) / 100).toFixed(2),
          `"${status}"`
        ]);
      });
    });

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
};

export default inventoryOperationsService;
