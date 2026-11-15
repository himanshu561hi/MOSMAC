import { addressService } from '../services/addressService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { addressSchema } from '../validators/orderValidators.js';

export const addressController = {
  async getAddresses(req, res, next) {
    try {
      const addresses = await addressService.getAddresses(req.user._id);
      return sendSuccess(res, 200, 'Saved addresses fetched successfully', addresses);
    } catch (err) {
      next(err);
    }
  },

  async getAddressById(req, res, next) {
    try {
      const address = await addressService.getAddressById(req.user._id, req.params.id);
      return sendSuccess(res, 200, 'Address fetched successfully', address);
    } catch (err) {
      next(err);
    }
  },

  async createAddress(req, res, next) {
    try {
      const validated = addressSchema.parse(req.body);
      const address = await addressService.createAddress(req.user._id, validated);
      return sendSuccess(res, 201, 'Address added successfully', address);
    } catch (err) {
      next(err);
    }
  },

  async updateAddress(req, res, next) {
    try {
      const validated = addressSchema.partial().parse(req.body);
      const address = await addressService.updateAddress(req.user._id, req.params.id, validated);
      return sendSuccess(res, 200, 'Address updated successfully', address);
    } catch (err) {
      next(err);
    }
  },

  async deleteAddress(req, res, next) {
    try {
      const result = await addressService.deleteAddress(req.user._id, req.params.id);
      return sendSuccess(res, 200, result.message, null);
    } catch (err) {
      next(err);
    }
  },

  async setDefaultAddress(req, res, next) {
    try {
      const type = req.query.type === 'billing' ? 'billing' : 'shipping';
      const address = await addressService.setDefaultAddress(req.user._id, req.params.id, type);
      return sendSuccess(res, 200, `Default ${type} address updated`, address);
    } catch (err) {
      next(err);
    }
  }
};

export default addressController;
