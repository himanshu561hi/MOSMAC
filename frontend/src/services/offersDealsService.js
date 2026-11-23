import { apiClient } from './apiClient';

export const offersDealsService = {
  /**
   * Fetches public storefront data for Offers & Deals page
   */
  async getOffersDealsData() {
    const res = await apiClient.get('/offers-deals/data');
    return res.data || res;
  },

  /**
   * Retrieves config
   */
  async getConfig() {
    const res = await apiClient.get('/offers-deals/config');
    return res.data?.config || res.config || res;
  },

  /**
   * Admin updates visibility and focus cards
   */
  async updateConfig(data) {
    const res = await apiClient.put('/admin/offers-deals/config', data);
    return res.data?.config || res.config || res;
  }
};

export default offersDealsService;
