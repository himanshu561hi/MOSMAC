import { adminPaymentService } from '../services/adminPaymentService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export async function listPayments(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { status, gateway, paymentMethod, search } = req.query;

    const result = await adminPaymentService.listPayments({
      page,
      limit,
      status,
      gateway,
      paymentMethod,
      search
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Payments retrieved successfully', { payments: result.payments }, result.pagination);
  } catch (error) {
    next(error);
  }
}

export async function listRefunds(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { status } = req.query;

    const result = await adminPaymentService.listRefunds({ page, limit, status });
    return sendSuccess(res, HTTP_STATUS.OK, 'Refunds retrieved successfully', { refunds: result.refunds }, result.pagination);
  } catch (error) {
    next(error);
  }
}

export async function exportPayments(req, res, next) {
  try {
    const { status, gateway } = req.query;
    const csvData = await adminPaymentService.exportPaymentsCsv({ status, gateway });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payments-export.csv"');
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
}

export default {
  listPayments,
  listRefunds,
  exportPayments
};
