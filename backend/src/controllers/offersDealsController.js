import { offersDealsService } from '../services/offersDealsService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const offersDealsController = {
  /**
   * Public: returns aggregated data for the Offers & Deals storefront page
   */
  async getStorefrontData(req, res, next) {
    try {
      const data = await offersDealsService.getStorefrontData();
      return sendSuccess(res, HTTP_STATUS.OK, 'Offers & Deals data retrieved', data);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Admin/Public: retrieves config
   */
  async getConfig(req, res, next) {
    try {
      const config = await offersDealsService.getConfig();
      return sendSuccess(res, HTTP_STATUS.OK, 'Offers & Deals config retrieved', { config });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Admin: updates visibility & cards
   */
  async updateConfig(req, res, next) {
    try {
      const config = await offersDealsService.updateConfig(req.body, req.user);
      return sendSuccess(res, HTTP_STATUS.OK, 'Offers & Deals config updated successfully', { config });
    } catch (error) {
      next(error);
    }
  }
};

export default offersDealsController;
