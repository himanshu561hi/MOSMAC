import { apiClient } from '@/services/apiClient';

export const adminCatalogueService = {
  // Categories
  async getCategories(tree = false) {
    const res = await apiClient.get(`/categories?tree=${tree}`);
    return res.data?.categories || [];
  },
  async createCategory(data) {
    const res = await apiClient.post('/categories', data);
    return res.data?.category;
  },
  async updateCategory(id, data) {
    const res = await apiClient.put(`/categories/${id}`, data);
    return res.data?.category;
  },
  async deleteCategory(id) {
    await apiClient.delete(`/categories/${id}`);
  },

  // Brands
  async getBrands(search = '') {
    const res = await apiClient.get(`/brands?search=${encodeURIComponent(search)}`);
    return res.data?.brands || [];
  },
  async createBrand(data) {
    const res = await apiClient.post('/brands', data);
    return res.data?.brand;
  },
  async updateBrand(id, data) {
    const res = await apiClient.put(`/brands/${id}`, data);
    return res.data?.brand;
  },
  async deleteBrand(id) {
    await apiClient.delete(`/brands/${id}`);
  },

  // Dynamic Attributes
  async getAttributesByCategory(categoryId) {
    const res = await apiClient.get(`/attributes/category/${categoryId}`);
    return res.data?.attributes || [];
  },
  async createAttribute(data) {
    const res = await apiClient.post('/attributes', data);
    return res.data?.attribute;
  },
  async updateAttribute(id, data) {
    const res = await apiClient.put(`/attributes/${id}`, data);
    return res.data?.attribute;
  },
  async deleteAttribute(id) {
    await apiClient.delete(`/attributes/${id}`);
  },

  // Products
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/products?${queryString}`);
    return {
      products: res.data?.products || [],
      pagination: res.meta || { page: 1, limit: 20, total: 0, totalPages: 1 }
    };
  },
  async getProductBySlug(slug) {
    const res = await apiClient.get(`/products/${slug}`);
    return res.data?.product;
  },
  async createProduct(data) {
    const res = await apiClient.post('/products', data);
    return res.data?.product;
  },
  async updateProduct(id, data) {
    const res = await apiClient.put(`/products/${id}`, data);
    return res.data?.product;
  },
  async deleteProduct(id) {
    await apiClient.delete(`/products/${id}`);
  },

  // Inventory
  async getInventory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/inventory?${queryString}`);
    return {
      items: res.data || [],
      pagination: res.meta || { page: 1, limit: 20, total: 0, totalPages: 1 }
    };
  },
  async adjustStock(data) {
    const res = await apiClient.post('/inventory/adjust', data);
    return res.data;
  },
  async getInventoryLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/inventory/logs?${queryString}`);
    return {
      logs: res.data?.logs || [],
      pagination: res.meta || { page: 1, limit: 20, total: 0, totalPages: 1 }
    };
  },

  // Media
  async getUploadSignature(folder = 'ecommerce/products') {
    const res = await apiClient.get(`/media/signature?folder=${folder}`);
    return res.data;
  }
};

export default adminCatalogueService;

