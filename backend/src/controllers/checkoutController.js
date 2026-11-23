import { checkoutQuoteService } from '../services/checkoutQuoteService.js';
import { codService } from '../services/codService.js';
import { Cart } from '../models/Cart.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { checkoutQuoteSchema } from '../validators/orderValidators.js';

export const checkoutController = {
  /**
   * Generates authoritative server-calculated checkout quote
   */
  async getQuote(req, res, next) {
    try {
      const validated = checkoutQuoteSchema.parse(req.body);
      const userId = req.user ? req.user._id : null;
      const guestId = req.headers['x-guest-id'] || req.cookies?.guestId || null;

      let quoteItems = validated.items;
      if (!quoteItems || quoteItems.length === 0) {
        if (userId || guestId) {
          const cart = await Cart.findOne(userId ? { userId } : { guestId });
          if (cart?.items?.length > 0) {
            quoteItems = cart.items.map((i) => ({
              productId: i.productId.toString(),
              sku: i.sku,
              quantity: i.quantity
            }));
          }
        }
      }

      const quote = await checkoutQuoteService.generateQuote({
        items: quoteItems || [],
        couponCode: validated.couponCode,
        postalCode: validated.postalCode,
        userId
      });

      return sendSuccess(res, 200, 'Authoritative checkout quote calculated successfully', quote);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Checks Cash on Delivery eligibility
   */
  async checkCodEligibility(req, res, next) {
    try {
      const { postalCode, amount } = req.query;
      const orderAmount = parseInt(amount, 10) || 0;

      const result = codService.validateEligibility({
        orderAmount,
        postalCode
      });

      return sendSuccess(
        res,
        200,
        result.eligible ? 'Cash on Delivery is available' : (result.reason || 'Cash on Delivery unavailable'),
        result
      );
    } catch (err) {
      next(err);
    }
  }
};

export default checkoutController;
