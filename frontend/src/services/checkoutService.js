import { apiClient } from './apiClient';

export const checkoutService = {
  async getQuote({ items, couponCode, postalCode } = {}) {
    const payload = {};
    if (items && Array.isArray(items) && items.length > 0) {
      payload.items = items;
    }
    if (couponCode) {
      payload.couponCode = couponCode;
    }
    if (postalCode) {
      payload.postalCode = postalCode;
    }
    const response = await apiClient.post('/checkout/quote', payload);
    return response.data;
  },

  async checkCodEligibility(postalCode, amount) {
    const params = new URLSearchParams();
    if (postalCode) params.append('postalCode', postalCode);
    if (amount !== undefined && amount !== null) params.append('amount', amount);
    const response = await apiClient.get(`/checkout/cod-eligibility?${params.toString()}`);
    return response.data;
  },

  async createOrder(orderData, idempotencyKey) {
    const headers = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const response = await apiClient.post('/orders', orderData, { headers });
    return response.data;
  },

  async verifyPayment(verificationData) {
    const response = await apiClient.post('/payments/verify', verificationData);
    return response.data;
  },

  async recordPaymentFailure(failureData) {
    const response = await apiClient.post('/payments/failure', failureData);
    return response.data;
  }
};

export default checkoutService;
