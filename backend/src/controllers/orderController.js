import mongoose from 'mongoose';
import { orderService } from '../services/orderService.js';
import { Cart } from '../models/Cart.js';
import { User } from '../models/User.js';
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
      const body = { ...req.body };
      const userId = req.user ? req.user._id : null;
      const guestId = req.headers['x-guest-id'] || req.cookies?.guestId || null;

      // Auto-populate customer if missing or incomplete
      if (!body.customer && (body.shippingAddress || req.user)) {
        const fullName = (body.shippingAddress?.fullName || req.user?.name || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`).trim();
        const parts = fullName.split(/\s+/);
        const firstName = parts[0] || req.user?.firstName || 'Customer';
        const lastName = parts.slice(1).join(' ') || req.user?.lastName || '';
        const email = (body.shippingAddress?.email || req.user?.email || body.guestEmail || 'customer@example.in').trim();
        let rawPhone = (body.shippingAddress?.phone || req.user?.phone || body.guestPhone || '').toString().replace(/\D/g, '');
        if (rawPhone.length === 12 && rawPhone.startsWith('91')) rawPhone = rawPhone.slice(2);
        if (rawPhone.length === 11 && rawPhone.startsWith('0')) rawPhone = rawPhone.slice(1);
        const phone = rawPhone.length === 10 ? rawPhone : (rawPhone.slice(-10) || '9876543210');

        body.customer = { firstName, lastName, email, phone };
      } else if (body.customer) {
        let rawPhone = (body.customer.phone || '').toString().replace(/\D/g, '');
        if (rawPhone.length === 12 && rawPhone.startsWith('91')) rawPhone = rawPhone.slice(2);
        if (rawPhone.length === 11 && rawPhone.startsWith('0')) rawPhone = rawPhone.slice(1);
        body.customer.phone = rawPhone.length === 10 ? rawPhone : (rawPhone.slice(-10) || body.customer.phone);
      }

      // Auto-populate items from active Cart if missing
      if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
        if (userId || guestId) {
          const cart = await Cart.findOne(userId ? { userId } : { guestId });
          if (cart?.items?.length > 0) {
            body.items = cart.items.map((i) => ({
              productId: i.productId.toString(),
              sku: i.sku,
              quantity: i.quantity
            }));
          }
        }
      }

      const validated = createOrderSchema.parse(body);

      let effectiveUserId = userId;
      if (!effectiveUserId && validated.customer?.email) {
        try {
          const matchedUser = await User.findOne({ email: validated.customer.email.toLowerCase() }).select('_id').lean();
          if (matchedUser) {
            effectiveUserId = matchedUser._id;
          }
        } catch (_) {}
      }

      const result = await orderService.createOrder({
        userId: effectiveUserId,
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
        'Order placed successfully. Awaiting admin confirmation.',
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
      const isAdmin = req.user && ['super_admin', 'store_manager', 'order_manager', 'support_staff'].includes(req.user.role);

      const order = await orderService.getOrderDetails({
        orderNumber,
        userId: isAdmin ? null : userId,
        isAdmin
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
   * Admin: Get order details by ID or orderNumber
   */
  async adminGetOrderById(req, res, next) {
    try {
      const identifier = req.params.orderNumber || req.params.id;
      const order = await orderService.getOrderDetails({
        orderNumber: identifier,
        orderId: mongoose.isValidObjectId(identifier) ? identifier : undefined,
        userId: null,
        isAdmin: true
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
      const body = { ...req.body };
      if (!body.newStatus && body.orderStatus) body.newStatus = body.orderStatus;
      if (!body.note && body.notes) body.note = body.notes;
      if (!body.trackingDetails && (body.carrier || body.courierName || body.trackingNumber || body.trackingUrl)) {
        body.trackingDetails = {
          courierName: body.courierName || body.carrier || '',
          trackingNumber: body.trackingNumber || '',
          trackingUrl: body.trackingUrl || ''
        };
      }

      const validated = adminUpdateOrderStatusSchema.parse(body);
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
