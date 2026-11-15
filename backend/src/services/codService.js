import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

// In-memory configurable store for COD settings (can be moved to DB settings in Phase 8)
let codConfig = {
  enabled: true,
  minOrderAmountPaise: 20000,   // ₹200.00
  maxOrderAmountPaise: 1000000, // ₹10,000.00 (Configurable, not permanently hardcoded)
  restrictedPincodes: [],       // Blacklisted remote non-serviceable PIN codes
  restrictedCategories: []
};

export const codService = {
  /**
   * Retrieves current COD business rules
   */
  getConfig() {
    return { ...codConfig };
  },

  /**
   * Updates COD configuration (Admin operations)
   */
  updateConfig(newConfig) {
    codConfig = {
      ...codConfig,
      ...newConfig
    };
    return { ...codConfig };
  },

  /**
   * Validates whether an order is eligible for Cash on Delivery (COD)
   * 
   * @param {Object} params
   * @param {number} params.orderAmount - Payable grand total in integer paise
   * @param {string} params.postalCode - 6-digit Indian PIN code
   * @param {Array} [params.items] - Cart items
   * @returns {{ eligible: boolean, reason?: string }}
   */
  validateEligibility({ orderAmount, postalCode, items = [] }) {
    if (!codConfig.enabled) {
      return {
        eligible: false,
        reason: 'Cash on Delivery is currently disabled by store administration.'
      };
    }

    if (!postalCode || !/^[1-9][0-9]{5}$/.test(postalCode.trim())) {
      return {
        eligible: false,
        reason: 'A valid 6-digit Indian delivery PIN code is required for COD verification.'
      };
    }

    const cleanPincode = postalCode.trim();
    if (codConfig.restrictedPincodes.includes(cleanPincode)) {
      return {
        eligible: false,
        reason: `Cash on Delivery is not serviceable at delivery PIN code ${cleanPincode}.`
      };
    }

    if (orderAmount < codConfig.minOrderAmountPaise) {
      return {
        eligible: false,
        reason: `Cash on Delivery is only available for orders above ₹${codConfig.minOrderAmountPaise / 100}.`
      };
    }

    if (orderAmount > codConfig.maxOrderAmountPaise) {
      return {
        eligible: false,
        reason: `Cash on Delivery is not available for orders exceeding ₹${codConfig.maxOrderAmountPaise / 100}. Please choose online payment.`
      };
    }

    return {
      eligible: true,
      reason: null
    };
  }
};

export default codService;
