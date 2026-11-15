import { Product } from '../models/Product.js';
import { couponService } from './couponService.js';
import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

export const FREE_SHIPPING_THRESHOLD_PAISE = 99900; // ₹999.00
export const STANDARD_SHIPPING_FEE_PAISE = 4900;    // ₹49.00
export const QUOTE_VALIDITY_MS = 15 * 60 * 1000;    // 15 minutes

export const checkoutQuoteService = {
  /**
   * Generates a 100% authoritative checkout quote recalculating all pricing
   * from live MongoDB catalogue and variant records.
   * 
   * @param {Object} params
   * @param {Array<{ productId: string, sku: string, quantity: number }>} params.items
   * @param {string} [params.couponCode]
   * @param {string} [params.postalCode]
   * @param {string} [params.userId]
   * @returns {Promise<Object>} Authoritative quote
   */
  async generateQuote({ items = [], couponCode = '', postalCode = '', userId = null }) {
    if (!items || items.length === 0) {
      throw ApiError.badRequest('Checkout items list cannot be empty', ERROR_CODES.VALIDATION_ERROR);
    }

    const warnings = [];
    const quotedItems = [];
    let subtotal = 0;

    for (const item of items) {
      if (!item.productId || !item.sku) {
        throw ApiError.badRequest('Each item must provide a valid productId and sku', ERROR_CODES.VALIDATION_ERROR);
      }

      const cleanSku = item.sku.trim().toUpperCase();
      const cleanQty = Math.max(1, Math.min(10, parseInt(item.quantity, 10) || 1));

      const product = await Product.findOne({
        _id: item.productId,
        status: 'published'
      }).lean();

      if (!product) {
        throw ApiError.badRequest(
          `Product for SKU '${cleanSku}' is not available or has been unpublished`,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const variant = product.variants?.find((v) => v.sku === cleanSku && v.isActive !== false);
      if (!variant) {
        throw ApiError.badRequest(
          `Variant '${cleanSku}' for '${product.title}' is currently unavailable`,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Check stock
      const availableStock = Math.max(0, (variant.stockQuantity || 0) - (variant.reservedQuantity || 0));
      if (availableStock <= 0) {
        throw ApiError.badRequest(
          `Item '${product.title}' (${variant.title || cleanSku}) is completely out of stock`,
          ERROR_CODES.INSUFFICIENT_STOCK
        );
      }

      let finalQty = cleanQty;
      if (cleanQty > availableStock) {
        finalQty = availableStock;
        warnings.push(`Only ${availableStock} units of '${product.title}' (${cleanSku}) are available. Quantity adjusted.`);
      }

      const unitPrice = variant.price; // in integer paise
      const mrp = variant.mrp || unitPrice;
      const itemTotal = unitPrice * finalQty;

      subtotal += itemTotal;

      const primaryImg = product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url || '';

      quotedItems.push({
        productId: product._id,
        sku: cleanSku,
        title: product.title,
        variantTitle: variant.title || '',
        imageUrl: primaryImg,
        quantity: finalQty,
        unitPrice,
        mrp,
        itemTotal,
        categoryId: product.categoryId
      });
    }

    // Shipping fee calculation: free if subtotal >= ₹999.00
    const freeShippingEligible = subtotal >= FREE_SHIPPING_THRESHOLD_PAISE;
    const shippingFee = freeShippingEligible ? 0 : STANDARD_SHIPPING_FEE_PAISE;

    // Coupon discount evaluation
    let appliedCoupon = null;
    let discountAmount = 0;

    if (couponCode && couponCode.trim()) {
      try {
        const couponResult = await couponService.validateCouponEligibility({
          code: couponCode.trim().toUpperCase(),
          cartSubtotal: subtotal,
          cartItems: quotedItems,
          userId
        });

        appliedCoupon = {
          code: couponResult.coupon.code,
          discountType: couponResult.coupon.discountType,
          discountValue: couponResult.coupon.discountValue,
          discountAmount: couponResult.discountAmount
        };
        discountAmount = couponResult.discountAmount;
      } catch (err) {
        warnings.push(`Promo code '${couponCode.trim().toUpperCase()}' could not be applied: ${err.message}`);
      }
    }

    // GST Tax calculation: standard 18% inclusive tax breakdown for transparency
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);
    // Calculated as: Tax = Total - (Total / 1.18)
    const taxTotal = Math.round(taxableSubtotal - (taxableSubtotal / 1.18));

    // Grand total
    const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

    const expiresAt = new Date(Date.now() + QUOTE_VALIDITY_MS);

    return {
      items: quotedItems,
      itemCount: quotedItems.reduce((sum, item) => sum + item.quantity, 0),
      distinctItemCount: quotedItems.length,
      pricing: {
        subtotal,
        discountTotal: discountAmount,
        shippingFee,
        taxTotal,
        grandTotal
      },
      appliedCoupon,
      shippingPolicy: {
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD_PAISE,
        freeShippingEligible,
        amountNeededForFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD_PAISE - subtotal),
        shippingFee
      },
      postalCode: postalCode || null,
      warnings,
      expiresAt
    };
  }
};

export default checkoutQuoteService;
