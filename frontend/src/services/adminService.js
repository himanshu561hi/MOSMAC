import { apiClient } from './apiClient';

/**
 * Downloads raw CSV text string as a named file in the client browser
 */
export function downloadCsv(csvContent, filename) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const adminService = {
  // 1. Executive Analytics & Dashboard
  async getDashboardOverview({ period = 'last_30_days', startDate, endDate } = {}) {
    const params = { period };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await apiClient.get('/admin/analytics/overview', { params });
    return res?.data?.data || res?.data || res;
  },

  // 2. Customers & CRM
  async getCustomers({ page = 1, limit = 20, search, status, sortBy, sortOrder } = {}) {
    const params = { page, limit };
    if (search) params.search = search;
    if (status) params.status = status;
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;
    const res = await apiClient.get('/admin/customers', { params });
    const data = res?.data?.data || res?.data || res || {};
    return {
      customers: data.customers || (Array.isArray(data) ? data : []),
      pagination: res?.meta || data.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
    };
  },

  async getCustomerProfile(id) {
    const res = await apiClient.get(`/admin/customers/${id}`);
    return res?.data?.data || res?.data || res;
  },

  async addCustomerNote(id, note) {
    const res = await apiClient.post(`/admin/customers/${id}/notes`, { note });
    return res?.data?.data || res?.data || res;
  },

  async updateCustomerStatus(id, { status, reason }) {
    const res = await apiClient.patch(`/admin/customers/${id}/status`, { status, reason });
    return res?.data?.data || res?.data || res;
  },

  async exportCustomersCsv({ search, status } = {}) {
    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;
    const res = await apiClient.get('/admin/customers/export', {
      params,
      responseType: 'text'
    });
    return typeof res === 'string' ? res : (res?.data || res);
  },

  // 3. Staff & Roles Management
  async getStaff({ page = 1, limit = 20, search, role } = {}) {
    const params = { page, limit };
    if (search) params.search = search;
    if (role) params.role = role;
    const res = await apiClient.get('/admin/staff', { params });
    const data = res?.data?.data || res?.data || res || {};
    return {
      staff: data.staff || (Array.isArray(data) ? data : []),
      pagination: res?.meta || data.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
    };
  },

  async createStaff(staffData) {
    const res = await apiClient.post('/admin/staff', staffData);
    return res?.data?.data || res?.data || res;
  },

  async updateStaffRole(id, { role }) {
    const res = await apiClient.patch(`/admin/staff/${id}/role`, { role });
    return res?.data?.data || res?.data || res;
  },

  async revokeStaffSessions(id) {
    const res = await apiClient.post(`/admin/staff/${id}/revoke`);
    return res?.data?.data || res?.data || res;
  },

  // 4. Inventory Operations & Replenishment
  async getReplenishmentAlerts({ page = 1, limit = 20 } = {}) {
    const res = await apiClient.get('/admin/inventory/replenishment-alerts', {
      params: { page, limit }
    });
    const data = res?.data?.data || res?.data || res || {};
    return {
      alerts: data.alerts || data.items || (Array.isArray(data) ? data : []),
      pagination: res?.meta || data.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
    };
  },

  async updateSkuThreshold(sku, threshold) {
    const res = await apiClient.patch(`/admin/inventory/threshold/${encodeURIComponent(sku)}`, {
      threshold
    });
    return res?.data?.data || res?.data || res;
  },

  async adjustStock({ sku, delta, reason, note }) {
    const res = await apiClient.post('/admin/inventory/adjust', {
      sku,
      delta,
      reason,
      note
    });
    return res?.data?.data || res?.data || res;
  },

  async exportInventoryCsv() {
    const res = await apiClient.get('/admin/inventory/export', { responseType: 'text' });
    return typeof res === 'string' ? res : (res?.data || res);
  },

  // 5. Financial Operations (Payments & Refunds)
  async getPayments({ page = 1, limit = 20, status, gateway, paymentMethod, search } = {}) {
    const params = { page, limit };
    if (status) params.status = status;
    if (gateway) params.gateway = gateway;
    if (paymentMethod) params.paymentMethod = paymentMethod;
    if (search) params.search = search;
    const res = await apiClient.get('/admin/payments', { params });
    const data = res?.data?.data || res?.data || res || {};
    return {
      payments: data.payments || (Array.isArray(data) ? data : []),
      pagination: res?.meta || data.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
    };
  },

  async getRefunds({ page = 1, limit = 20, status } = {}) {
    const params = { page, limit };
    if (status) params.status = status;
    const res = await apiClient.get('/admin/payments/refunds', { params });
    const data = res?.data?.data || res?.data || res || {};
    return {
      refunds: data.refunds || (Array.isArray(data) ? data : []),
      pagination: res?.meta || data.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
    };
  },

  async exportPaymentsCsv({ status, gateway } = {}) {
    const params = {};
    if (status) params.status = status;
    if (gateway) params.gateway = gateway;
    const res = await apiClient.get('/admin/payments/export', { params, responseType: 'text' });
    return typeof res === 'string' ? res : (res?.data || res);
  },

  // 6. Reports & Data Exports
  async exportOrdersReport({ period = 'last_30_days', startDate, endDate, orderStatus, paymentStatus } = {}) {
    const params = { period };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (orderStatus) params.orderStatus = orderStatus;
    if (paymentStatus) params.paymentStatus = paymentStatus;
    const res = await apiClient.get('/admin/reports/orders', { params, responseType: 'text' });
    return typeof res === 'string' ? res : (res?.data || res);
  },

  async exportTaxReport({ period = 'last_30_days', startDate, endDate } = {}) {
    const params = { period };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await apiClient.get('/admin/reports/tax', { params, responseType: 'text' });
    return typeof res === 'string' ? res : (res?.data || res);
  },

  async exportCouponsReport() {
    const res = await apiClient.get('/admin/reports/coupons', { responseType: 'text' });
    return typeof res === 'string' ? res : (res?.data || res);
  },

  // 7. Audit Logging
  async getAuditLogs({ page = 1, limit = 50, action, resourceType, actorId, search } = {}) {
    const params = { page, limit };
    if (action) params.action = action;
    if (resourceType) params.resourceType = resourceType;
    if (actorId) params.actorId = actorId;
    if (search) params.search = search;
    const res = await apiClient.get('/admin/audit-logs', { params });
    const data = res?.data?.data || res?.data || res || {};
    return {
      logs: data.logs || (Array.isArray(data) ? data : []),
      pagination: res?.meta || data.pagination || { page: 1, limit: 50, total: 0, pages: 1 }
    };
  },

  // 8. Coupons Management
  async getCoupons({ page = 1, limit = 20, search } = {}) {
    const params = { page, limit };
    if (search) params.search = search;
    const res = await apiClient.get('/coupons', { params });
    return res.data?.data || res.data || res;
  },

  async createCoupon(data) {
    const res = await apiClient.post('/coupons', data);
    return res.data?.data || res.data || res;
  },

  async updateCoupon(id, data) {
    const res = await apiClient.put(`/coupons/${id}`, data);
    return res.data?.data || res.data || res;
  },

  async deleteCoupon(id) {
    const res = await apiClient.delete(`/coupons/${id}`);
    return res.data?.data || res.data || res;
  }
};

export default adminService;
