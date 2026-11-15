import crypto from 'crypto';
import Razorpay from 'razorpay';
import env from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

let razorpayInstance = null;

const getRazorpayClient = () => {
  if (process.env.NODE_ENV === 'test' || env.NODE_ENV === 'test') {
    return null;
  }

  if (razorpayInstance) return razorpayInstance;

  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  if (keyId && keySecret) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
    return razorpayInstance;
  }

  return null;
};

export const razorpayService = {
  /**
   * Creates an official Razorpay order from the backend only.
   * 
   * @param {Object} params
   * @param {number} params.amount - Amount in integer paise
   * @param {string} params.receipt - Internal order number or identifier
   * @param {Object} [params.notes] - Additional metadata
   * @returns {Promise<Object>} Razorpay order object
   */
  async createOrder({ amount, receipt, notes = {} }) {
    if (!amount || amount <= 0) {
      throw ApiError.badRequest('Order amount must be a positive integer in paise', ERROR_CODES.VALIDATION_ERROR);
    }

    const client = getRazorpayClient();

    if (client) {
      try {
        const order = await client.orders.create({
          amount,
          currency: 'INR',
          receipt,
          notes
        });
        return order;
      } catch (err) {
        console.error('Razorpay order creation error:', err);
        throw ApiError.internal('Failed to initialize payment with Razorpay', ERROR_CODES.GATEWAY_ERROR);
      }
    }

    // Sandbox / Test fallback simulator when live keys are not configured
    const simulatedOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      id: simulatedOrderId,
      entity: 'order',
      amount,
      amount_paid: 0,
      amount_due: amount,
      currency: 'INR',
      receipt,
      status: 'created',
      notes,
      created_at: Math.floor(Date.now() / 1000)
    };
  },

  /**
   * Verifies Razorpay payment signature using HMAC SHA256.
   * 
   * @param {Object} params
   * @param {string} params.razorpayOrderId
   * @param {string} params.razorpayPaymentId
   * @param {string} params.razorpaySignature
   * @returns {boolean} Whether signature is authentic
   */
  verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return false;
    }

    const secret = env.RAZORPAY_KEY_SECRET || 'test_secret_for_sandbox_signatures';
    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    try {
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const receivedBuffer = Buffer.from(razorpaySignature, 'utf8');

      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch {
      return false;
    }
  },

  /**
   * Verifies webhook payload authenticity using the exact raw request body.
   * 
   * @param {Object} params
   * @param {Buffer|string} params.rawBody
   * @param {string} params.signature - The x-razorpay-signature header value
   * @returns {boolean}
   */
  verifyWebhookSignature({ rawBody, signature }) {
    if (!rawBody || !signature) {
      return false;
    }

    const secret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET || 'test_webhook_secret';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    try {
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const receivedBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch {
      return false;
    }
  },

  /**
   * Initiates a refund via Razorpay Refund API
   * 
   * @param {Object} params
   * @param {string} params.paymentId
   * @param {number} params.amount - Amount in paise
   * @param {Object} [params.notes]
   * @returns {Promise<Object>}
   */
  async createRefund({ paymentId, amount, notes = {} }) {
    const client = getRazorpayClient();

    if (client) {
      try {
        const refund = await client.payments.refund(paymentId, {
          amount,
          notes
        });
        return refund;
      } catch (err) {
        console.error('Razorpay refund error:', err);
        throw ApiError.internal('Failed to process refund with Razorpay', ERROR_CODES.GATEWAY_ERROR);
      }
    }

    // Sandbox simulated refund
    return {
      id: `rfnd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      entity: 'refund',
      amount,
      currency: 'INR',
      payment_id: paymentId,
      status: 'processed',
      notes,
      created_at: Math.floor(Date.now() / 1000)
    };
  }
};

export default razorpayService;
