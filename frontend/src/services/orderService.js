import { apiClient } from './apiClient';

export const orderService = {
  // Customer & Guest Order Endpoints
  async getCustomerOrders({ page = 1, limit = 10, status } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    const response = await apiClient.get(`/orders?${params.toString()}`);
    const orders = Array.isArray(response?.data)
      ? response.data
      : (Array.isArray(response?.data?.orders)
        ? response.data.orders
        : (Array.isArray(response) ? response : []));
    const pagination = response?.meta || response?.data?.pagination || response?.pagination || {
      page: Number(page),
      limit: Number(limit),
      total: orders.length,
      pages: Math.ceil(orders.length / limit) || 1
    };
    return { orders, pagination };
  },

  async getOrderByNumber(orderNumber) {
    const response = await apiClient.get(`/orders/${encodeURIComponent(orderNumber)}`);
    return response?.data?.data || response?.data || response;
  },

  async cancelOrder(orderNumber, reason) {
    const response = await apiClient.post(`/orders/${encodeURIComponent(orderNumber)}/cancel`, {
      reason
    });
    return response?.data?.data || response?.data || response;
  },

  async guestLookup({ orderNumber, email, phone }) {
    const payload = { orderNumber };
    if (email) payload.email = email;
    if (phone) payload.phone = phone;
    const response = await apiClient.post('/orders/guest-lookup', payload);
    return response?.data?.data || response?.data || response;
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
    const orders = Array.isArray(response?.data)
      ? response.data
      : (Array.isArray(response?.data?.orders)
        ? response.data.orders
        : (Array.isArray(response) ? response : []));
    const pagination = response?.meta || response?.data?.pagination || response?.pagination || {
      page: Number(page),
      limit: Number(limit),
      total: orders.length,
      pages: Math.ceil(orders.length / limit) || 1
    };
    return { orders, pagination };
  },

  async adminGetOrder(id) {
    const response = await apiClient.get(`/admin/orders/${id}`);
    return response?.data?.data || response?.data || response;
  },

  async adminUpdateStatus(id, { orderStatus, notes, trackingNumber, carrier, trackingUrl, newStatus, note, courierName, trackingDetails } = {}) {
    const statusVal = newStatus || orderStatus;
    const noteVal = note || notes;
    const courierVal = trackingDetails?.courierName || carrier || courierName;
    const trackNumVal = trackingDetails?.trackingNumber || trackingNumber;
    const trackUrlVal = trackingDetails?.trackingUrl || trackingUrl;

    const payload = {
      newStatus: statusVal
    };
    if (noteVal) payload.note = noteVal;
    if (courierVal || trackNumVal || trackUrlVal) {
      payload.trackingDetails = {
        ...(courierVal ? { courierName: courierVal } : {}),
        ...(trackNumVal ? { trackingNumber: trackNumVal } : {}),
        ...(trackUrlVal ? { trackingUrl: trackUrlVal } : {})
      };
    }

    const response = await apiClient.patch(`/admin/orders/${id}/status`, payload);
    return response?.data?.data || response?.data || response;
  },

  async adminProcessRefund(id, { amount, reason }) {
    const payload = { amount, reason };
    const response = await apiClient.post(`/admin/orders/${id}/refund`, payload);
    return response?.data?.data || response?.data || response;
  }
};

export default orderService;
