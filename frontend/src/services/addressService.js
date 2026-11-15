import { apiClient } from './apiClient';

export const addressService = {
  async getAddresses() {
    const response = await apiClient.get('/account/addresses');
    return response.data;
  },

  async createAddress(addressData) {
    const response = await apiClient.post('/account/addresses', addressData);
    return response.data;
  },

  async updateAddress(id, addressData) {
    const response = await apiClient.put(`/account/addresses/${id}`, addressData);
    return response.data;
  },

  async deleteAddress(id) {
    const response = await apiClient.delete(`/account/addresses/${id}`);
    return response.data;
  },

  async setDefault(id, { isDefaultShipping, isDefaultBilling }) {
    const response = await apiClient.patch(`/account/addresses/${id}/default`, {
      isDefaultShipping,
      isDefaultBilling
    });
    return response.data;
  }
};

export default addressService;
