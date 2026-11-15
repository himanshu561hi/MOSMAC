import { orderService } from '../services/orderService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { verifyPaymentSchema, paymentFailureSchema } from '../validators/orderValidators.js';

export const paymentController = {
  /**
   * Verifies Razorpay payment signature from client callback
   */
  async verifyPayment(req, res, next) {
    try {
      const validated = verifyPaymentSchema.parse(req.body);

      const result = await orderService.verifyAndCapturePayment({
        orderNumber: validated.orderNumber,
        razorpayOrderId: validated.razorpayOrderId,
        razorpayPaymentId: validated.razorpayPaymentId,
        razorpaySignature: validated.razorpaySignature
      });

      return sendSuccess(res, 200, 'Payment verified and captured successfully', result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Records payment failure notice from client modal dismiss or gateway error
   */
  async recordPaymentFailure(req, res, next) {
    try {
      const validated = paymentFailureSchema.parse(req.body);

      const order = await orderService.handlePaymentFailure({
        orderNumber: validated.orderNumber,
        errorDetails: validated.errorDetails || {}
      });

      return sendSuccess(res, 200, 'Payment failure recorded and stock released', order);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Handles inbound Razorpay webhooks using raw request body buffer
   */
  async handleRazorpayWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const rawBody = req.rawBody || JSON.stringify(req.body);

      const result = await orderService.processRazorpayWebhook({
        rawBody,
        signature,
        payload: req.body
      });

      // Always return 200 to Razorpay webhook dispatcher
      return res.status(200).json({ status: 'ok', ...result });
    } catch (err) {
      console.error('Webhook error:', err);
      // Even on signature error or processing error, return 400 to signal rejection
      return res.status(400).json({ status: 'error', message: err.message });
    }
  }
};

export default paymentController;
