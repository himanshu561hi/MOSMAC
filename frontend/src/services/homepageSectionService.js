import { apiClient } from './apiClient';

export const homepageSectionService = {
  /**
   * Retrieves all homepage sections for admin management
   */
  async listAdminSections() {
    const res = await apiClient.get('/admin/homepage-sections');
    return res.data?.sections || res.data || [];
  },

  /**
   * Retrieves a single section by ID
   */
  async getSectionById(id) {
    const res = await apiClient.get(`/admin/homepage-sections/${id}`);
    return res.data?.section || res.data;
  },

  /**
   * Creates a new custom homepage section
   */
  async createSection(data) {
    const res = await apiClient.post('/admin/homepage-sections', data);
    return res.data?.section || res.data;
  },

  /**
   * Updates an existing homepage section configuration
   */
  async updateSection(id, data) {
    const res = await apiClient.put(`/admin/homepage-sections/${id}`, data);
    return res.data?.section || res.data;
  },

  /**
   * Deletes a custom homepage section
   */
  async deleteSection(id) {
    const res = await apiClient.delete(`/admin/homepage-sections/${id}`);
    return res.data;
  },

  /**
   * Toggles visibility/active status of a section
   */
  async toggleSectionStatus(id, isActive) {
    const res = await apiClient.patch(`/admin/homepage-sections/${id}/status`, { isActive });
    return res.data?.section || res.data;
  },

  /**
   * Persists section-level drag-and-drop display positions
   */
  async reorderSections(sections) {
    const res = await apiClient.patch('/admin/homepage-sections/reorder', { sections });
    return res.data?.sections || res.data || [];
  },

  /**
   * Retrieves products assigned to a section in exact displayOrder
   */
  async getSectionProducts(sectionId) {
    const res = await apiClient.get(`/admin/homepage-sections/${sectionId}/products`);
    return res.data?.products || res.data || [];
  },

  /**
   * Assigns multiple products to a section
   */
  async assignProducts(sectionId, productIds) {
    const payload = Array.isArray(productIds) ? { productIds } : productIds;
    const res = await apiClient.post(`/admin/homepage-sections/${sectionId}/products`, payload);
    return res.data?.products || res.data || [];
  },

  /**
   * Updates the exact display order or replaces products in a section
   */
  async updateSectionProducts(sectionId, products) {
    const res = await apiClient.put(`/admin/homepage-sections/${sectionId}/products`, { products });
    return res.data?.products || res.data || [];
  },

  /**
   * Removes a single product from a section
   */
  async removeProductFromSection(sectionId, productId) {
    const res = await apiClient.delete(`/admin/homepage-sections/${sectionId}/products/${productId}`);
    return res.data;
  },

  /**
   * Searchable product catalog selector for admin assignment
   */
  async searchProducts(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    const res = await apiClient.get(`/admin/homepage-sections/search-products?${query.toString()}`);
    return {
      products: res.data?.products || [],
      pagination: res.meta || { page: 1, limit: 10, total: 0, totalPages: 1 },
      categories: res.data?.categories || [],
      brands: res.data?.brands || []
    };
  },

  /**
   * Downloads sample template Excel file (.xlsx)
   */
  async downloadSampleExcel() {
    const res = await apiClient.get('/admin/homepage-sections/sample-excel', {
      responseType: 'blob'
    });
    const blob = new Blob([res], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'homepage_sections_sample_template.xlsx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Uploads and validates Excel file, returning pre-import preview stats
   */
  async validateExcelUpload(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/admin/homepage-sections/validate-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data?.preview || res.data;
  },

  /**
   * Confirms and executes Excel import with Replace or Append mode
   */
  async executeExcelImport({ validItems, mode = 'append' }) {
    const res = await apiClient.post('/admin/homepage-sections/import', { validItems, mode });
    return res.data;
  },

  /**
   * Exports all current section-product assignments to Excel
   */
  async exportAssignmentsExcel() {
    const res = await apiClient.get('/admin/homepage-sections/export', {
      responseType: 'blob'
    });
    const blob = new Blob([res], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `homepage_section_assignments_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Public storefront endpoint fetching dynamic sections with assigned products
   */
  async getStorefrontSections() {
    const res = await apiClient.get('/homepage/sections');
    return res.data?.sections || res.data || [];
  }
};

export default homepageSectionService;
