import crypto from 'crypto';
import { Order, ORDER_STATUSES, PAYMENT_STATUSES } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { Coupon } from '../models/Coupon.js';
import { Cart } from '../models/Cart.js';
import { checkoutQuoteService } from './checkoutQuoteService.js';
import { inventoryReservationService } from './inventoryReservationService.js';
import { razorpayService } from './razorpayService.js';
import { codService } from './codService.js';
import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

// Allowed state transitions map
const VALID_ORDER_STATUS_TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['returned'],
  cancelled: [],
  returned: []
};

export const orderService = {
  /**
   * Generates a unique human-readable order number: ORD-YYYYMMDD-XXXXX
   */
  generateOrderNumber() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${dateStr}-${randomHex}`;
  },

  /**
   * Creates an order with complete server-side quote recalculation,
   * inventory reservation, and payment provider setup.
   */
  async createOrder({
    userId = null,
    guestId = null,
    customer,
    items,
    shippingAddress,
    billingAddress,
    couponCode = '',
    paymentMethod,
    idempotencyKey = null
  }) {
    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ idempotencyKey });
      if (existingOrder) {
        return {
          order: existingOrder,
          razorpayOrder: existingOrder.paymentDetails?.razorpayOrderId
            ? { id: existingOrder.paymentDetails.razorpayOrderId, amount: existingOrder.pricing.grandTotal, currency: 'INR' }
            : null,
          isDuplicate: true
        };
      }
    }

    if (!paymentMethod || !['razorpay', 'cod'].includes(paymentMethod)) {
      throw ApiError.badRequest('Payment method must be either "razorpay" or "cod"', ERROR_CODES.VALIDATION_ERROR);
    }

    // 2. Authoritative Recalculation via Checkout Quote Service
    const quote = await checkoutQuoteService.generateQuote({
      items,
      couponCode,
      postalCode: shippingAddress.postalCode,
      userId
    });

    // 3. Cash on Delivery verification if COD chosen
    if (paymentMethod === 'cod') {
      const codCheck = codService.validateEligibility({
        orderAmount: quote.pricing.grandTotal,
        postalCode: shippingAddress.postalCode,
        items: quote.items
      });

      if (!codCheck.eligible) {
        throw ApiError.badRequest(codCheck.reason, ERROR_CODES.COD_NOT_AVAILABLE);
      }
    }

    const orderNumber = this.generateOrderNumber();

    // 4. Atomic Inventory Reservation
    const { reservationId } = await inventoryReservationService.reserveStockForCheckout({
      items: quote.items.map((i) => ({ sku: i.sku, productId: i.productId, quantity: i.quantity })),
      orderNumber
    });

    let razorpayOrder = null;

    if (paymentMethod === 'razorpay') {
      razorpayOrder = await razorpayService.createOrder({
        amount: quote.pricing.grandTotal,
        receipt: orderNumber,
        notes: {
          orderNumber,
          userId: userId ? userId.toString() : 'guest',
          customerEmail: customer.email
        }
      });
    }

    // 5. Build and save the Order record
    const isCod = paymentMethod === 'cod';
    const order = await Order.create({
      orderNumber,
      userId,
      guestId,
      customer: {
        firstName: customer.firstName.trim(),
        lastName: (customer.lastName || '').trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone.trim()
      },
      shippingAddress: {
        fullName: shippingAddress.fullName.trim(),
        phone: shippingAddress.phone.trim(),
        email: shippingAddress.email || customer.email,
        addressLine1: shippingAddress.addressLine1.trim(),
        addressLine2: shippingAddress.addressLine2.trim(),
        landmark: (shippingAddress.landmark || '').trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        postalCode: shippingAddress.postalCode.trim(),
        addressType: shippingAddress.addressType || 'home'
      },
      billingAddress: billingAddress
        ? {
            fullName: billingAddress.fullName.trim(),
            phone: billingAddress.phone.trim(),
            email: billingAddress.email || customer.email,
            addressLine1: billingAddress.addressLine1.trim(),
            addressLine2: billingAddress.addressLine2.trim(),
            landmark: (billingAddress.landmark || '').trim(),
            city: billingAddress.city.trim(),
            state: billingAddress.state.trim(),
            postalCode: billingAddress.postalCode.trim(),
            addressType: billingAddress.addressType || 'home'
          }
        : shippingAddress,
      items: quote.items,
      pricing: quote.pricing,
      appliedCoupon: quote.appliedCoupon,
      paymentMethod,
      paymentStatus: 'pending',
      orderStatus: isCod ? 'confirmed' : 'placed',
      statusHistory: [
        {
          status: isCod ? 'confirmed' : 'placed',
          timestamp: new Date(),
          note: isCod ? 'Order placed with Cash on Delivery' : 'Order initialized pending Razorpay payment',
          changedBy: 'system'
        }
      ],
      paymentDetails: {
        razorpayOrderId: razorpayOrder ? razorpayOrder.id : null,
        razorpayPaymentId: null,
        razorpaySignature: null
      },
      reservationId,
      idempotencyKey,
      expiresAt: isCod ? null : new Date(Date.now() + 15 * 60 * 1000)
    });

    // 6. Create ledger entry in Payment collection
    await Payment.create({
      orderId: order._id,
      orderNumber,
      gateway: paymentMethod,
      gatewayOrderId: razorpayOrder ? razorpayOrder.id : null,
      amount: quote.pricing.grandTotal,
      currency: 'INR',
      status: 'created',
      method: paymentMethod
    });

    // 7. If COD, commit reservation immediately & register coupon usage & clear cart
    if (isCod) {
      await inventoryReservationService.commitReservation({
        reservationId,
        orderNumber
      });

      if (quote.appliedCoupon) {
        await Coupon.updateOne(
          { code: quote.appliedCoupon.code },
          {
            $inc: { usedCount: 1 },
            $push: {
              usedBy: {
                userId,
                orderId: order._id,
                usedAt: new Date()
              }
            }
          }
        );
      }

      // Purge Cart
      if (userId) {
        await Cart.deleteOne({ userId });
      } else if (guestId) {
        await Cart.deleteOne({ guestId });
      }
    }

    return {
      order,
      razorpayOrder,
      quote
    };
  },

  /**
   * Verifies Razorpay payment signature and transitions order to CONFIRMED.
   */
  async verifyAndCapturePayment({ orderNumber, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const order = await Order.findOne({ orderNumber });
    if (!order) {
      throw ApiError.notFound(`Order '${orderNumber}' not found`, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Idempotency: if already captured, return immediately
    if (order.paymentStatus === 'captured') {
      return { success: true, order, alreadyCaptured: true };
    }

    // Verify razorpay order ID matches
    if (order.paymentDetails?.razorpayOrderId && order.paymentDetails.razorpayOrderId !== razorpayOrderId) {
      throw ApiError.badRequest('Razorpay order ID mismatch', ERROR_CODES.VALIDATION_ERROR);
    }

    // Verify cryptographic HMAC signature
    const isValidSignature = razorpayService.verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });

    if (!isValidSignature) {
      throw ApiError.badRequest('Invalid payment signature. Verification failed.', ERROR_CODES.INVALID_SIGNATURE);
    }

    // Commit reserved inventory permanently
    if (order.reservationId) {
      await inventoryReservationService.commitReservation({
        reservationId: order.reservationId,
        orderNumber: order.orderNumber
      });
    }

    // Update order status & payment details
    order.paymentStatus = 'captured';
    order.orderStatus = 'confirmed';
    order.paymentDetails.razorpayPaymentId = razorpayPaymentId;
    order.paymentDetails.razorpaySignature = razorpaySignature;
    order.expiresAt = null;
    order.statusHistory.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: `Payment verified and captured via Razorpay (${razorpayPaymentId})`,
      changedBy: 'payment_gateway'
    });

    await order.save();

    // Update Payment ledger
    await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        $set: {
          gatewayPaymentId: razorpayPaymentId,
          status: 'captured'
        }
      }
    );

    // Record coupon usage if applicable
    if (order.appliedCoupon?.code) {
      await Coupon.updateOne(
        { code: order.appliedCoupon.code },
        {
          $inc: { usedCount: 1 },
          $push: {
            usedBy: {
              userId: order.userId,
              orderId: order._id,
              usedAt: new Date()
            }
          }
        }
      );
    }

    // Clear active cart
    if (order.userId) {
      await Cart.deleteOne({ userId: order.userId });
    } else if (order.guestId) {
      await Cart.deleteOne({ guestId: order.guestId });
    }

    return { success: true, order };
  },

  /**
   * Handles payment failure notice and releases reserved stock safely
   */
  async handlePaymentFailure({ orderNumber, errorDetails = {} }) {
    const order = await Order.findOne({ orderNumber });
    if (!order) return null;

    if (order.paymentStatus === 'captured') {
      return order; // Cannot mark captured order as failed
    }

    order.paymentStatus = 'failed';
    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      note: `Payment failed: ${errorDetails.description || errorDetails.reason || 'Payment was declined or cancelled'}`,
      changedBy: 'payment_gateway'
    });

    await order.save();

    // Release reserved inventory
    if (order.reservationId) {
      await inventoryReservationService.releaseReservation({
        reservationId: order.reservationId,
        orderNumber: order.orderNumber,
        reason: 'payment_failed'
      });
    }

    // Update payment ledger
    await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        $set: {
          status: 'failed',
          errorDetails
        }
      }
    );

    return order;
  },

  /**
   * Processes inbound Razorpay webhooks idempotently
   */
  async processRazorpayWebhook({ rawBody, signature, payload }) {
    const eventId = payload.event_id || payload.id || `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const eventType = payload.event;

    // Verify HMAC signature on raw body
    const isValid = razorpayService.verifyWebhookSignature({ rawBody, signature });
    if (!isValid) {
      throw ApiError.badRequest('Invalid webhook signature', ERROR_CODES.INVALID_SIGNATURE);
    }

    // Webhook Deduplication / Replay Prevention
    const existingEvent = await WebhookEvent.findOne({ eventId });
    if (existingEvent) {
      return { duplicate: true, message: `Event '${eventId}' already processed` };
    }

    const webhookRecord = await WebhookEvent.create({
      eventId,
      eventType,
      status: 'processing',
      payload
    });

    try {
      if (eventType === 'payment.captured') {
        const paymentEntity = payload.payload?.payment?.entity;
        if (paymentEntity) {
          const razorpayOrderId = paymentEntity.order_id;
          const order = await Order.findOne({ 'paymentDetails.razorpayOrderId': razorpayOrderId });

          if (order && order.paymentStatus !== 'captured') {
            await this.verifyAndCapturePayment({
              orderNumber: order.orderNumber,
              razorpayOrderId,
              razorpayPaymentId: paymentEntity.id,
              razorpaySignature: 'webhook_verified'
            });
          }
        }
      } else if (eventType === 'payment.failed') {
        const paymentEntity = payload.payload?.payment?.entity;
        if (paymentEntity) {
          const razorpayOrderId = paymentEntity.order_id;
          const order = await Order.findOne({ 'paymentDetails.razorpayOrderId': razorpayOrderId });
          if (order && order.paymentStatus !== 'captured') {
            await this.handlePaymentFailure({
              orderNumber: order.orderNumber,
              errorDetails: {
                code: paymentEntity.error_code,
                description: paymentEntity.error_description,
                reason: paymentEntity.error_reason
              }
            });
          }
        }
      }

      webhookRecord.status = 'processed';
      await webhookRecord.save();

      return { success: true, eventId };
    } catch (err) {
      webhookRecord.status = 'failed';
      webhookRecord.error = err.message;
      await webhookRecord.save();
      throw err;
    }
  },

  /**
   * Retrieves order details with strict privacy / IDOR ownership checks.
   */
  async getOrderDetails({ orderNumber, userId = null, guestEmail = '', guestPhone = '' }) {
    const order = await Order.findOne({ orderNumber }).lean();
    if (!order) {
      throw ApiError.notFound(`Order '${orderNumber}' not found`, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Authenticated access verification
    if (userId) {
      if (order.userId && order.userId.toString() !== userId.toString()) {
        throw ApiError.forbidden('You do not have permission to view this order', ERROR_CODES.FORBIDDEN);
      }
      return order;
    }

    // Guest lookup verification: must match customer email OR phone
    const cleanEmail = (guestEmail || '').trim().toLowerCase();
    const cleanPhone = (guestPhone || '').trim();

    const matchesEmail = cleanEmail && order.customer?.email?.toLowerCase() === cleanEmail;
    const matchesPhone = cleanPhone && order.customer?.phone === cleanPhone;

    if (!matchesEmail && !matchesPhone) {
      throw ApiError.forbidden(
        'Order verification failed. Please check the order number, email or phone number.',
        ERROR_CODES.FORBIDDEN
      );
    }

    return order;
  },

  /**
   * Lists customer order history with pagination
   */
  async listCustomerOrders(userId, { page = 1, limit = 10, status = '' } = {}) {
    const query = { userId };
    if (status && ORDER_STATUSES.includes(status)) {
      query.orderStatus = status;
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(query)
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Customer order cancellation before dispatch
   */
  async cancelOrder({ orderNumber, userId, reason = 'Cancelled by customer' }) {
    const order = await Order.findOne({ orderNumber });
    if (!order) {
      throw ApiError.notFound(`Order '${orderNumber}' not found`, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    if (order.userId && order.userId.toString() !== userId.toString()) {
      throw ApiError.forbidden('You do not have permission to cancel this order', ERROR_CODES.FORBIDDEN);
    }

    // Only orders not yet shipped can be cancelled
    if (['shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'].includes(order.orderStatus)) {
      throw ApiError.badRequest(
        `Order '${orderNumber}' cannot be cancelled as it is already ${order.orderStatus}.`,
        ERROR_CODES.BAD_REQUEST
      );
    }

    order.orderStatus = 'cancelled';
    order.cancellation = {
      reason,
      cancelledAt: new Date(),
      cancelledBy: userId.toString()
    };
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: `Order cancelled by customer: ${reason}`,
      changedBy: 'customer'
    });

    await order.save();

    // Release reserved inventory if not yet committed or restore stock
    if (order.reservationId) {
      await inventoryReservationService.releaseReservation({
        reservationId: order.reservationId,
        orderNumber: order.orderNumber,
        reason: 'order_cancelled'
      });
    }

    return order;
  },

  /**
   * Admin: List orders with filters, search, and pagination
   */
  async adminListOrders({ page = 1, limit = 20, orderStatus = '', paymentStatus = '', search = '' } = {}) {
    const query = {};

    if (orderStatus && ORDER_STATUSES.includes(orderStatus)) {
      query.orderStatus = orderStatus;
    }
    if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus)) {
      query.paymentStatus = paymentStatus;
    }
    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { orderNumber: { $regex: term, $options: 'i' } },
        { 'customer.firstName': { $regex: term, $options: 'i' } },
        { 'customer.lastName': { $regex: term, $options: 'i' } },
        { 'customer.email': { $regex: term, $options: 'i' } },
        { 'customer.phone': { $regex: term, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(query)
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Admin: Transition order status with state machine enforcement
   */
  async adminUpdateOrderStatus(orderId, { newStatus, trackingDetails = {}, note = '', adminUser }) {
    if (!ORDER_STATUSES.includes(newStatus)) {
      throw ApiError.badRequest(`Invalid order status: ${newStatus}`, ERROR_CODES.VALIDATION_ERROR);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found', ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    const currentStatus = order.orderStatus;
    if (currentStatus === newStatus) {
      return order; // No-op
    }

    const allowedNextStatuses = VALID_ORDER_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(newStatus)) {
      throw ApiError.badRequest(
        `Cannot transition order from '${currentStatus}' to '${newStatus}'. Allowed: [${allowedNextStatuses.join(', ')}]`,
        ERROR_CODES.INVALID_STATE_TRANSITION
      );
    }

    order.orderStatus = newStatus;
    if (trackingDetails && Object.keys(trackingDetails).length > 0) {
      order.trackingDetails = {
        ...order.trackingDetails,
        ...trackingDetails,
        ...(newStatus === 'shipped' && !order.trackingDetails.shippedAt ? { shippedAt: new Date() } : {})
      };
    }

    order.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      note: note || `Status updated to ${newStatus}`,
      changedBy: adminUser?.email || adminUser?.role || 'admin'
    });

    await order.save();
    return order;
  }
};

export default orderService;
