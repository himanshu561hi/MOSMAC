import { analyticsService } from '../services/analyticsService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export async function getDashboardOverview(req, res, next) {
  try {
    const { period, startDate, endDate } = req.query;
    const overview = await analyticsService.getDashboardOverview({
      period,
      startDate,
      endDate
    });
    return sendSuccess(res, HTTP_STATUS.OK, 'Dashboard analytics retrieved successfully', overview);
  } catch (error) {
    next(error);
  }
}

export default {
  getDashboardOverview
};
