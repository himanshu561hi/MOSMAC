import { apiClient } from './apiClient';

export const storefrontService = {
  /**
   * Retrieves dynamic homepage sections
   */
  async getHomepageData() {
    const res = await apiClient.get('/storefront/homepage');
    return res.data;
  },

  /**
   * Verifies delivery serviceability for a 6-digit Indian PIN code
   */
  async checkPinCode(pincode) {
    const res = await apiClient.get(`/storefront/check-pincode?pincode=${encodeURIComponent(pincode)}`);
    return res.data;
  },

  /**
   * Fetches paginated & filtered products for PLP
   */
  async getProducts(params = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        if (key === 'attrs' && typeof val === 'object') {
          Object.entries(val).forEach(([attrCode, attrVal]) => {
            if (attrVal) {
              query.append(`attrs[${attrCode}]`, attrVal);
            }
          });
        } else {
          query.append(key, val);
        }
      }
    });

    const res = await apiClient.get(`/products?${query.toString()}`);
    return {
      products: res.data?.products || [],
      pagination: res.meta || { page: 1, limit: 20, total: 0, totalPages: 1 }
    };
  },

  /**
   * Retrieves full product details and related products by slug or ID
   */
  async getProductBySlug(slug) {
    const res = await apiClient.get(`/products/${encodeURIComponent(slug)}`);
    return res.data;
  },

  /**
   * Retrieves debounced search suggestions for live search
   */
  async getSearchSuggestions(query) {
    if (!query || query.trim().length < 2) {
      return { products: [], categories: [], brands: [] };
    }
    const res = await apiClient.get(`/products/suggestions?q=${encodeURIComponent(query.trim())}`);
    return res.data || { products: [], categories: [], brands: [] };
  },

  /**
   * Retrieves category tree or flat list
   */
  async getCategories(tree = true) {
    const res = await apiClient.get(`/categories?tree=${tree}`);
    return res.data?.categories || [];
  },

  /**
   * Retrieves category dynamic attribute definitions for faceted filtering
   */
  async getCategoryAttributes(categoryId) {
    if (!categoryId) return [];
    const res = await apiClient.get(`/attributes/category/${categoryId}`);
    return res.data?.attributes || [];
  },

  /**
   * Retrieves active brands list
   */
  async getBrands() {
    const res = await apiClient.get('/brands');
    return res.data?.brands || [];
  }
};

export default storefrontService;

