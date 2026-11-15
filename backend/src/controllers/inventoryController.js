import { InventoryLog } from '../models/InventoryLog.js';
import { adjustStock, getInventoryOverview } from '../services/inventoryService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export async function adjustInventoryStock(req, res, next) {
  try {
    const { sku, delta, reason, referenceId, note } = req.body;

    const result = await adjustStock({
      sku,
      delta,
      reason,
      referenceId,
      note,
      performedBy: req.user._id
    });

    return sendSuccess(res, HTTP_STATUS.OK, `Stock for SKU '${sku}' adjusted successfully`, result);
  } catch (error) {
    next(error);
  }
}

export async function getInventory(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = req.query.search || '';
    const lowStockOnly = req.query.lowStock === 'true';

    const result = await getInventoryOverview({ page, limit, search, lowStockOnly });

    return sendSuccess(res, HTTP_STATUS.OK, 'Inventory overview retrieved', result.items, result.pagination);
  } catch (error) {
    next(error);
  }
}

export async function getInventoryLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.sku) {
      query.sku = req.query.sku.toUpperCase();
    }
    if (req.query.productId) {
      query.productId = req.query.productId;
    }
    if (req.query.reason) {
      query.reason = req.query.reason;
    }

    const [logs, total] = await Promise.all([
      InventoryLog.find(query)
        .populate('performedBy', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      InventoryLog.countDocuments(query)
    ]);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Inventory movement history retrieved',
      { logs },
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

export default {
  adjustInventoryStock,
  getInventory,
  getInventoryLogs
};

