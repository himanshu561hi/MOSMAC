import { apiClient } from './apiClient';

export const reviewService = {
  /**
   * Retrieves paginated public approved reviews with rating statistics for a product
   */
  async getProductReviews(productId, params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/products/${productId}/reviews${query ? `?${query}` : ''}`);
    return {
      reviews: res.data?.reviews || [],
      summary: res.data?.summary || {
        totalReviews: res.data?.totalReviews || 0,
        averageRating: res.data?.averageRating || 0,
        distribution: res.data?.starDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      },
      pagination: res.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 }
    };
  },

  /**
   * Evaluates verified purchaser review eligibility for the current customer
   */
  async checkEligibility(productId, sku) {
    const query = sku ? `?sku=${encodeURIComponent(sku)}` : '';
    const res = await apiClient.get(`/products/${productId}/reviews/eligibility${query}`);
    return res.data;
  },

  /**
   * Submits a new review for a product by a verified purchaser
   */
  async submitReview(productId, data) {
    const res = await apiClient.post(`/products/${productId}/reviews`, data);
    return res.data?.review || res.data;
  },

  /**
   * Administrative review moderation queue listing
   */
  async listAdminReviews(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/admin/reviews${query ? `?${query}` : ''}`);
    return {
      reviews: res.data?.reviews || [],
      pagination: res.data?.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
    };
  },

  /**
   * Moderates a review (approve / reject) with optional reason
   */
  async moderateReview(id, status, moderationNote = '') {
    const res = await apiClient.patch(`/admin/reviews/${id}/status`, {
      status,
      moderationNote
    });
    return res.data?.review || res.data;
  },

  /**
   * Deletes a review permanently and triggers rating re-aggregation
   */
  async deleteReview(id) {
    const res = await apiClient.delete(`/admin/reviews/${id}`);
    return res.data;
  }
};

export default reviewService;
