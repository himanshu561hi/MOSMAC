import mongoose from 'mongoose';
import { Refund } from '../models/Refund.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { razorpayService } from './razorpayService.js';
import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

export const refundService = {
  /**
   * Processes a full or partial refund with strict financial boundaries.
   * 
   * @param {Object} params
   * @param {string} params.orderId
   * @param {number} params.amount - Amount in integer paise
   * @param {string} params.reason
   * @param {Object} params.adminUser
   * @returns {Promise<{ refund: Object, order: Object }>}
   */
  async processRefund({ orderId, amount, reason, adminUser }) {
    if (!amount || amount <= 0) {
      throw ApiError.badRequest('Refund amount must be a positive integer in paise', ERROR_CODES.VALIDATION_ERROR);
    }

    if (!reason || !reason.trim()) {
      throw ApiError.badRequest('A refund reason must be documented', ERROR_CODES.VALIDATION_ERROR);
    }

    let order;
    if (mongoose.isValidObjectId(orderId)) {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ $or: [{ _id: orderId }, { orderNumber: orderId }] });
    }
    if (!order) {
      throw ApiError.notFound('Order not found', ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Only orders with captured payment or already partially refunded can receive refunds
    if (!['captured', 'partially_refunded'].includes(order.paymentStatus)) {
      throw ApiError.badRequest(
        `Cannot issue a refund for order with payment status '${order.paymentStatus}'`,
        ERROR_CODES.BAD_REQUEST
      );
    }

    const totalPaid = order.pricing.grandTotal;
    const previouslyRefunded = order.totalRefundedAmount || 0;
    const remainingRefundable = totalPaid - previouslyRefunded;

    if (amount > remainingRefundable) {
      throw ApiError.badRequest(
        `Requested refund (₹${amount / 100}) exceeds maximum remaining refundable balance of ₹${remainingRefundable / 100}`,
        ERROR_CODES.BAD_REQUEST
      );
    }

    let gatewayRefund = null;
    let paymentRecord = await Payment.findOne({ orderId: order._id, status: 'captured' });

    if (order.paymentMethod === 'razorpay') {
      const paymentId = order.paymentDetails?.razorpayPaymentId;
      if (!paymentId) {
        throw ApiError.badRequest('No valid Razorpay payment ID found to refund', ERROR_CODES.GATEWAY_ERROR);
      }

      gatewayRefund = await razorpayService.createRefund({
        paymentId,
        amount,
        notes: {
          orderNumber: order.orderNumber,
          reason,
          initiatedBy: adminUser.email
        }
      });
    }

    // Create immutable Refund ledger record
    const refund = await Refund.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentId: paymentRecord ? paymentRecord._id : null,
      gatewayRefundId: gatewayRefund ? gatewayRefund.id : `cod_rfnd_${Date.now()}`,
      amount,
      reason: reason.trim(),
      status: 'processed',
      processedBy: adminUser._id,
      rawResponse: gatewayRefund || { method: 'cod_manual_payout' }
    });

    // Update Order state
    order.refunds.push(refund._id);
    order.totalRefundedAmount = previouslyRefunded + amount;
    const isFullRefund = order.totalRefundedAmount >= totalPaid;
    order.paymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';

    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      note: `Refund of ₹${amount / 100} processed (${isFullRefund ? 'Full Refund' : 'Partial Refund'}). Reason: ${reason}`,
      changedBy: adminUser.email || 'admin'
    });

    await order.save();

    return { refund, order };
  },

  /**
   * Lists all refunds for a specific order
   */
  async listOrderRefunds(orderId) {
    return Refund.find({ orderId })
      .populate('processedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }
};

export default refundService;
