import { auditService } from '../services/auditService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export async function getAuditLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const { action, resourceType, actorId, startDate, endDate } = req.query;

    const result = await auditService.getLogs({
      page,
      limit,
      action,
      resourceType,
      actorId,
      startDate,
      endDate
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Audit logs retrieved successfully', { logs: result.logs }, result.pagination);
  } catch (error) {
    next(error);
  }
}

export default {
  getAuditLogs
};
