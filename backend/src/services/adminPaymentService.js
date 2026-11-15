import { Payment } from '../models/Payment.js';
import { Refund } from '../models/Refund.js';
import { Order } from '../models/Order.js';

export const adminPaymentService = {
  /**
   * Paginated listing of all payment transactions
   */
  async listPayments({ page = 1, limit = 20, status, gateway, paymentMethod, search } = {}) {
    const query = {};

    if (status) query.status = status;
    if (gateway) query.gateway = gateway;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { gatewayPaymentId: searchRegex },
        { gatewayOrderId: searchRegex }
      ];
    }

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('orderId', 'orderNumber grandTotal orderStatus customerSnapshot shippingAddress')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query)
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Paginated listing of all refunds
   */
  async listRefunds({ page = 1, limit = 20, status } = {}) {
    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [refunds, total] = await Promise.all([
      Refund.find(query)
        .populate('orderId', 'orderNumber grandTotal orderStatus')
        .populate('processedBy', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Refund.countDocuments(query)
    ]);

    return {
      refunds,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Export payment transactions to CSV
   */
  async exportPaymentsCsv({ status, gateway } = {}) {
    const query = {};
    if (status) query.status = status;
    if (gateway) query.gateway = gateway;

    const payments = await Payment.find(query)
      .populate('orderId', 'orderNumber grandTotal')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const headers = [
      'Transaction ID',
      'Order Reference',
      'Gateway',
      'Gateway Order ID',
      'Gateway Payment ID',
      'Amount (INR)',
      'Payment Method',
      'Status',
      'Date'
    ];

    const rows = payments.map((p) => [
      `"${p._id}"`,
      `"${p.orderId?.orderNumber || 'N/A'}"`,
      `"${p.gateway}"`,
      `"${p.gatewayOrderId || 'N/A'}"`,
      `"${p.gatewayPaymentId || 'N/A'}"`,
      ((p.amount || 0) / 100).toFixed(2),
      `"${p.paymentMethod || 'N/A'}"`,
      `"${p.status}"`,
      `"${new Date(p.createdAt).toISOString()}"`
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
};

export default adminPaymentService;
