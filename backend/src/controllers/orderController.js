import { orderService } from '../services/orderService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import {
  createOrderSchema,
  guestOrderLookupSchema,
  cancelOrderSchema,
  adminUpdateOrderStatusSchema
} from '../validators/orderValidators.js';

export const orderController = {
  /**
   * Places an order (authenticated or guest)
   */
  async createOrder(req, res, next) {
    try {
      const validated = createOrderSchema.parse(req.body);
      const userId = req.user ? req.user._id : null;
      const guestId = req.headers['x-guest-id'] || req.cookies?.guestId || null;

      const result = await orderService.createOrder({
        userId,
        guestId,
        customer: validated.customer,
        items: validated.items,
        shippingAddress: validated.shippingAddress,
        billingAddress: validated.billingAddress,
        couponCode: validated.couponCode,
        paymentMethod: validated.paymentMethod,
        idempotencyKey: validated.idempotencyKey
      });

      return sendSuccess(
        res,
        201,
        validated.paymentMethod === 'cod' ? 'Order confirmed with Cash on Delivery' : 'Order initialized. Proceed with payment.',
        result
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * Retrieves authenticated customer orders
   */
  async getCustomerOrders(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const status = req.query.status || '';

      const data = await orderService.listCustomerOrders(req.user._id, { page, limit, status });
      return sendSuccess(res, 200, 'Order history fetched successfully', data.orders, data.pagination);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Retrieves specific customer order details
   */
  async getOrderDetails(req, res, next) {
    try {
      const { orderNumber } = req.params;
      const userId = req.user ? req.user._id : null;

      const order = await orderService.getOrderDetails({
        orderNumber,
        userId
      });

      return sendSuccess(res, 200, 'Order details fetched successfully', order);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Public guest order lookup with email/phone verification
   */
  async guestOrderLookup(req, res, next) {
    try {
      const validated = guestOrderLookupSchema.parse(req.body);
      const order = await orderService.getOrderDetails({
        orderNumber: validated.orderNumber,
        guestEmail: validated.email,
        guestPhone: validated.phone
      });

      return sendSuccess(res, 200, 'Order found and verified', order);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Customer cancels an order before dispatch
   */
  async cancelOrder(req, res, next) {
    try {
      const { orderNumber } = req.params;
      const validated = cancelOrderSchema.parse(req.body);

      const order = await orderService.cancelOrder({
        orderNumber,
        userId: req.user._id,
        reason: validated.reason
      });

      return sendSuccess(res, 200, 'Order cancelled successfully', order);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin: List all orders with filters & pagination
   */
  async adminListOrders(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const orderStatus = req.query.orderStatus || '';
      const paymentStatus = req.query.paymentStatus || '';
      const search = req.query.search || '';

      const data = await orderService.adminListOrders({
        page,
        limit,
        orderStatus,
        paymentStatus,
        search
      });

      return sendSuccess(res, 200, 'Admin orders list fetched successfully', data.orders, data.pagination);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin: Get order details by ID
   */
  async adminGetOrderById(req, res, next) {
    try {
      const order = await orderService.getOrderDetails({
        orderNumber: req.params.orderNumber || req.params.id,
        userId: null // Admin bypasses ownership
      });

      return sendSuccess(res, 200, 'Admin order details fetched', order);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin: Update order status with state machine enforcement
   */
  async adminUpdateOrderStatus(req, res, next) {
    try {
      const validated = adminUpdateOrderStatusSchema.parse(req.body);
      const order = await orderService.adminUpdateOrderStatus(req.params.id, {
        newStatus: validated.newStatus,
        trackingDetails: validated.trackingDetails,
        note: validated.note,
        adminUser: req.user
      });

      return sendSuccess(res, 200, `Order status updated to '${validated.newStatus}'`, order);
    } catch (err) {
      next(err);
    }
  }
};

export default orderController;
