import { Coupon } from '../models/Coupon.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Validates a coupon code against current cart items, subtotal, and customer identity.
 * Calculates discount strictly in integer paise.
 *
 * @param {Object} params
 * @param {string} params.code - Coupon code to validate
 * @param {number} params.subtotalPaise - Current cart subtotal in paise
 * @param {string|null} params.userId - Authenticated user ID (if any)
 * @param {Array} params.cartItems - Populated cart items [{ productId, sku, quantity, price, categoryId }]
 * @returns {Promise<Object>} Calculated discount details and coupon model
 */
export async function validateCouponEligibility({ code, subtotalPaise, userId = null, cartItems = [] }) {
  if (!code || typeof code !== 'string') {
    throw ApiError.badRequest('Please provide a valid coupon code');
  }

  const cleanCode = code.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: cleanCode });

  if (!coupon || !coupon.isActive) {
    throw ApiError.notFound(`Coupon code '${cleanCode}' is invalid or no longer active`);
  }

  const now = new Date();

  // Validate start date and expiration date
  if (coupon.startDate && coupon.startDate > now) {
    throw ApiError.badRequest(`Coupon code '${cleanCode}' is not yet active`);
  }

  if (coupon.endDate && coupon.endDate < now) {
    throw ApiError.badRequest(`Coupon code '${cleanCode}' expired on ${coupon.endDate.toLocaleDateString('en-IN')}`);
  }

  // Validate global total usage limit
  if (coupon.totalUsageLimit !== null && coupon.totalUsageLimit !== undefined) {
    if (coupon.usedCount >= coupon.totalUsageLimit) {
      throw ApiError.badRequest(`Coupon code '${cleanCode}' has reached its maximum global usage limit`);
    }
  }

  // Validate per-customer usage limit if user is authenticated
  if (userId) {
    const userRedemptionCount = (coupon.usedBy || []).filter(
      (r) => r.userId && r.userId.toString() === userId.toString()
    ).length;

    if (userRedemptionCount >= coupon.usageLimitPerUser) {
      throw ApiError.badRequest(`You have already redeemed coupon '${cleanCode}' the maximum allowed number of times (${coupon.usageLimitPerUser})`);
    }
  }

  // Determine eligible subtotal based on category / product restrictions
  let eligibleSubtotal = subtotalPaise;

  const hasCategoryRestrictions = coupon.applicableCategories && coupon.applicableCategories.length > 0;
  const hasProductRestrictions = coupon.applicableProducts && coupon.applicableProducts.length > 0;

  if (hasCategoryRestrictions || hasProductRestrictions) {
    const categoryIdSet = new Set(coupon.applicableCategories.map((c) => c.toString()));
    const productIdSet = new Set(coupon.applicableProducts.map((p) => p.toString()));

    let restrictedSubtotal = 0;

    for (const item of cartItems) {
      const prodIdStr = (item.productId?._id || item.productId || '').toString();
      const catIdStr = (item.categoryId?._id || item.categoryId || item.productId?.categoryId || '').toString();

      const matchesProduct = hasProductRestrictions ? productIdSet.has(prodIdStr) : true;
      const matchesCategory = hasCategoryRestrictions ? categoryIdSet.has(catIdStr) : true;

      if ((hasProductRestrictions && matchesProduct) || (hasCategoryRestrictions && matchesCategory)) {
        restrictedSubtotal += (item.price || item.addedPrice || 0) * (item.quantity || 1);
      }
    }

    if (restrictedSubtotal <= 0) {
      throw ApiError.badRequest(`Coupon '${cleanCode}' is not applicable to any items currently in your cart`);
    }

    eligibleSubtotal = restrictedSubtotal;
  }

  // Validate minimum order amount
  if (coupon.minOrderAmount && subtotalPaise < coupon.minOrderAmount) {
    const minRupees = (coupon.minOrderAmount / 100).toFixed(0);
    throw ApiError.badRequest(`Minimum cart value of ₹${minRupees} required to apply coupon '${cleanCode}'`);
  }

  // Calculate discount in integer paise
  let discountAmount = 0;

  if (coupon.discountType === 'percentage') {
    const rawDiscount = Math.round((eligibleSubtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
      discountAmount = Math.min(rawDiscount, coupon.maxDiscountAmount);
    } else {
      discountAmount = rawDiscount;
    }
  } else if (coupon.discountType === 'fixed') {
    discountAmount = Math.min(coupon.discountValue, eligibleSubtotal);
  }

  // Sanity check: discount cannot exceed total cart subtotal
  discountAmount = Math.min(discountAmount, subtotalPaise);
  discountAmount = Math.max(0, discountAmount);

  return {
    coupon,
    code: cleanCode,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
    maxDiscountAmount: coupon.maxDiscountAmount,
    minOrderAmount: coupon.minOrderAmount
  };
}

export const couponService = {
  validateCouponEligibility
};

export default couponService;
