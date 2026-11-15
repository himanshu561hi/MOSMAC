import { inventoryOperationsService } from '../services/inventoryOperationsService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export async function getReplenishmentAlerts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const result = await inventoryOperationsService.getReplenishmentAlerts({ page, limit });
    return sendSuccess(res, HTTP_STATUS.OK, 'Replenishment alerts retrieved', { alerts: result.alerts }, result.pagination);
  } catch (error) {
    next(error);
  }
}

export async function updateThreshold(req, res, next) {
  try {
    const { sku } = req.params;
    const { lowStockThreshold } = req.body;
    const result = await inventoryOperationsService.updateSkuThreshold(sku, lowStockThreshold, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, 'Low-stock threshold updated successfully', result);
  } catch (error) {
    next(error);
  }
}

export async function adjustStock(req, res, next) {
  try {
    const { sku, delta, reason, referenceId, note } = req.body;
    const result = await inventoryOperationsService.adjustStock(
      { sku, delta, reason, referenceId, note },
      req.user
    );
    return sendSuccess(res, HTTP_STATUS.OK, 'Stock adjusted successfully', result);
  } catch (error) {
    next(error);
  }
}

export async function exportInventory(req, res, next) {
  try {
    const csvData = await inventoryOperationsService.exportInventoryCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-export.csv"');
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
}

export default {
  getReplenishmentAlerts,
  updateThreshold,
  adjustStock,
  exportInventory
};
