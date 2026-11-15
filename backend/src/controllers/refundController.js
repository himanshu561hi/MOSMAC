import { refundService } from '../services/refundService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { processRefundSchema } from '../validators/orderValidators.js';

export const refundController = {
  /**
   * Admin: Process a full or partial refund
   */
  async processRefund(req, res, next) {
    try {
      const validated = processRefundSchema.parse(req.body);
      const { orderId } = req.body;

      const result = await refundService.processRefund({
        orderId,
        amount: validated.amount,
        reason: validated.reason,
        adminUser: req.user
      });

      return sendSuccess(res, 201, 'Refund processed successfully', result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin: List refunds for a specific order
   */
  async getOrderRefunds(req, res, next) {
    try {
      const refunds = await refundService.listOrderRefunds(req.params.orderId);
      return sendSuccess(res, 200, 'Order refunds fetched successfully', refunds);
    } catch (err) {
      next(err);
    }
  }
};

export default refundController;
