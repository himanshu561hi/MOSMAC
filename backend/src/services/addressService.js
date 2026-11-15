import { Address } from '../models/Address.js';
import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

export const addressService = {
  /**
   * List all addresses for a customer
   */
  async getAddresses(userId) {
    return Address.find({ userId }).sort({ isDefaultShipping: -1, createdAt: -1 });
  },

  /**
   * Get a single address with IDOR verification
   */
  async getAddressById(userId, addressId) {
    const address = await Address.findById(addressId);
    if (!address) {
      throw ApiError.notFound('Address not found', ERROR_CODES.RESOURCE_NOT_FOUND);
    }
    if (address.userId && address.userId.toString() !== userId.toString()) {
      throw ApiError.forbidden('You do not have permission to access this address', ERROR_CODES.FORBIDDEN);
    }
    return address;
  },

  /**
   * Create a new address for a user
   */
  async createAddress(userId, addressData) {
    // If it's the user's first address, default it to default shipping & billing
    const existingCount = await Address.countDocuments({ userId });
    const isFirst = existingCount === 0;

    const address = await Address.create({
      ...addressData,
      userId,
      isDefaultShipping: addressData.isDefaultShipping ?? isFirst,
      isDefaultBilling: addressData.isDefaultBilling ?? isFirst
    });

    return address;
  },

  /**
   * Update an existing address with ownership check
   */
  async updateAddress(userId, addressId, updateData) {
    const address = await this.getAddressById(userId, addressId);

    Object.assign(address, updateData);
    await address.save();
    return address;
  },

  /**
   * Delete an address with ownership check
   */
  async deleteAddress(userId, addressId) {
    const address = await this.getAddressById(userId, addressId);
    await Address.deleteOne({ _id: address._id });
    return { success: true, message: 'Address deleted successfully' };
  },

  /**
   * Set address as default shipping or billing
   */
  async setDefaultAddress(userId, addressId, type = 'shipping') {
    const address = await this.getAddressById(userId, addressId);

    if (type === 'shipping') {
      address.isDefaultShipping = true;
    } else if (type === 'billing') {
      address.isDefaultBilling = true;
    }

    await address.save();
    return address;
  }
};

export default addressService;
