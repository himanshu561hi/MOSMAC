import { apiClient } from './apiClient';

export const shoppingService = {
  // Cart Endpoints
  async getCart() {
    const response = await apiClient.get('/cart');
    return response.data;
  },

  async addToCart({ productId, sku, quantity = 1 }) {
    const response = await apiClient.post('/cart/items', {
      productId,
      sku,
      quantity
    });
    return response.data;
  },

  async updateQuantity(sku, quantity) {
    const response = await apiClient.patch(`/cart/items/${encodeURIComponent(sku)}`, {
      quantity
    });
    return response.data;
  },

  async removeItem(sku) {
    const response = await apiClient.delete(`/cart/items/${encodeURIComponent(sku)}`);
    return response.data;
  },

  async clearCart() {
    const response = await apiClient.delete('/cart');
    return response.data;
  },

  async applyCoupon(code) {
    const response = await apiClient.post('/cart/coupon', { code });
    return response.data;
  },

  async removeCoupon() {
    const response = await apiClient.delete('/cart/coupon');
    return response.data;
  },

  async mergeCart(guestId) {
    const response = await apiClient.post('/cart/merge', { guestId });
    return response.data;
  },

  // Wishlist Endpoints
  async getWishlist() {
    const response = await apiClient.get('/wishlist');
    return response.data;
  },

  async addToWishlist(productId, sku = '') {
    const response = await apiClient.post('/wishlist/items', {
      productId,
      sku
    });
    return response.data;
  },

  async removeFromWishlist(productId) {
    const response = await apiClient.delete(`/wishlist/items/${productId}`);
    return response.data;
  },

  async moveWishlistItemToCart(productId, sku = '', quantity = 1) {
    const response = await apiClient.post(`/wishlist/items/${productId}/move-to-cart`, {
      sku,
      quantity
    });
    return response.data;
  },

  async mergeWishlist(guestId) {
    const response = await apiClient.post('/wishlist/merge', { guestId });
    return response.data;
  },

  // Coupon Verification Endpoint
  async checkCoupon(code) {
    const response = await apiClient.get(`/coupons/check/${encodeURIComponent(code)}`);
    return response.data;
  }
};

export default shoppingService;
