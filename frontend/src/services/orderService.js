import { apiClient } from './apiClient';

export const orderService = {
  // Customer & Guest Order Endpoints
  async getCustomerOrders({ page = 1, limit = 10, status } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    const response = await apiClient.get(`/orders?${params.toString()}`);
    return response.data;
  },

  async getOrderByNumber(orderNumber) {
    const response = await apiClient.get(`/orders/${encodeURIComponent(orderNumber)}`);
    return response.data;
  },

  async cancelOrder(orderNumber, reason) {
    const response = await apiClient.post(`/orders/${encodeURIComponent(orderNumber)}/cancel`, {
      reason
    });
    return response.data;
  },

  async guestLookup({ orderNumber, email, phone }) {
    const payload = { orderNumber };
    if (email) payload.email = email;
    if (phone) payload.phone = phone;
    const response = await apiClient.post('/orders/guest-lookup', payload);
    return response.data;
  },

  // Admin Operations Endpoints
  async adminListOrders({ page = 1, limit = 20, search, orderStatus, paymentStatus, sortBy, sortOrder } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.append('search', search);
    if (orderStatus) params.append('orderStatus', orderStatus);
    if (paymentStatus) params.append('paymentStatus', paymentStatus);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    const response = await apiClient.get(`/admin/orders?${params.toString()}`);
    return response.data;
  },

  async adminGetOrder(id) {
    const response = await apiClient.get(`/admin/orders/${id}`);
    return response.data;
  },

  async adminUpdateStatus(id, { orderStatus, notes, trackingNumber, carrier, trackingUrl }) {
    const payload = { orderStatus };
    if (notes) payload.notes = notes;
    if (trackingNumber) payload.trackingNumber = trackingNumber;
    if (carrier) payload.carrier = carrier;
    if (trackingUrl) payload.trackingUrl = trackingUrl;
    const response = await apiClient.patch(`/admin/orders/${id}/status`, payload);
    return response.data;
  },

  async adminProcessRefund(id, { amount, reason }) {
    const payload = { amount, reason };
    const response = await apiClient.post(`/admin/orders/${id}/refund`, payload);
    return response.data;
  }
};

export default orderService;
