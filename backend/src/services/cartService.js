import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import '../models/Category.js';
import '../models/Brand.js';
import { ApiError } from '../utils/ApiError.js';
import { validateCouponEligibility } from './couponService.js';

const FREE_SHIPPING_THRESHOLD_PAISE = 99900; // ₹999.00
const STANDARD_SHIPPING_FEE_PAISE = 4900;    // ₹49.00
const MAX_ITEM_QUANTITY = 10;

/**
 * Finds or initializes an active Cart for either an authenticated user or a guest session
 */
export async function getOrCreateCart({ userId = null, guestId = null }) {
  if (!userId && !guestId) {
    throw ApiError.badRequest('Either userId or guestId must be provided to access a cart');
  }

  const query = userId ? { userId } : { guestId };
  let cart = await Cart.findOne(query);

  if (!cart) {
    cart = await Cart.create({
      ...(userId ? { userId } : { guestId }),
      items: [],
      appliedCoupon: null
    });
  }

  return cart;
}

/**
 * Validates cart items against current live product and variant data.
 * Computes subtotal, discounts, shipping, and grand total strictly in integer paise.
 * Detects price changes, stock limitations, and invalid items without permanent inventory locking.
 */
export async function populateAndValidateCart(cart, { userId = null } = {}) {
  const currentUserId = userId || cart.userId || null;
  const rawItems = cart.items || [];
  const populatedItems = [];
  const warnings = [];

  let subtotal = 0;
  let totalItemCount = 0;

  if (rawItems.length > 0) {
    const productIds = rawItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } })
      .populate('categoryId', 'name slug')
      .populate('brandId', 'name slug');

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    for (const item of rawItems) {
      const product = productMap.get(item.productId.toString());

      // 1. Check if product exists and is published
      if (!product || product.status !== 'published') {
        warnings.push({
          sku: item.sku,
          type: 'PRODUCT_UNAVAILABLE',
          message: `Product '${product?.title || item.sku}' is no longer available and was excluded from calculations`
        });
        populatedItems.push({
          _id: item._id,
          productId: item.productId,
          sku: item.sku,
          title: product?.title || 'Unavailable Product',
          slug: product?.slug || '',
          imageUrl: '',
          quantity: item.quantity,
          unitPrice: item.addedPrice,
          addedPrice: item.addedPrice,
          mrp: item.addedPrice,
          itemTotal: 0,
          isAvailable: false,
          reason: 'Product is unpublished or archived'
        });
        continue;
      }

      // 2. Check if variant exists and is active
      const variant = (product.variants || []).find((v) => v.sku === item.sku && v.isActive);
      if (!variant) {
        warnings.push({
          sku: item.sku,
          type: 'VARIANT_UNAVAILABLE',
          message: `Variant '${item.sku}' for product '${product.title}' is no longer active`
        });
        populatedItems.push({
          _id: item._id,
          productId: product._id,
          sku: item.sku,
          title: product.title,
          slug: product.slug,
          variantTitle: item.sku,
          imageUrl: product.images?.[0]?.url || '',
          quantity: item.quantity,
          unitPrice: item.addedPrice,
          addedPrice: item.addedPrice,
          mrp: item.addedPrice,
          itemTotal: 0,
          isAvailable: false,
          reason: 'Variant is inactive or discontinued'
        });
        continue;
      }

      // 3. Price change detection
      const livePrice = variant.price;
      const liveMrp = variant.mrp;
      let priceChanged = false;

      if (livePrice !== item.addedPrice) {
        priceChanged = true;
        warnings.push({
          sku: item.sku,
          type: 'PRICE_CHANGED',
          message: `Price for '${product.title} (${variant.title})' changed from ₹${(item.addedPrice / 100).toFixed(2)} to ₹${(livePrice / 100).toFixed(2)}`,
          oldPrice: item.addedPrice,
          newPrice: livePrice
        });
      }

      // 4. Stock availability check
      const stockAvailable = variant.stockQuantity || 0;
      let effectiveQuantity = item.quantity;
      let stockWarning = null;

      if (stockAvailable <= 0) {
        warnings.push({
          sku: item.sku,
          type: 'OUT_OF_STOCK',
          message: `'${product.title} (${variant.title})' is currently out of stock`
        });
        populatedItems.push({
          _id: item._id,
          productId: product._id,
          sku: item.sku,
          title: product.title,
          slug: product.slug,
          variantTitle: variant.title,
          imageUrl: product.images?.[0]?.url || '',
          quantity: item.quantity,
          unitPrice: livePrice,
          addedPrice: item.addedPrice,
          mrp: liveMrp,
          itemTotal: 0,
          isAvailable: false,
          isOutOfStock: true,
          stockAvailable: 0,
          reason: 'Out of stock'
        });
        continue;
      } else if (effectiveQuantity > stockAvailable) {
        effectiveQuantity = stockAvailable;
        stockWarning = {
          sku: item.sku,
          type: 'STOCK_LIMITED',
          message: `Quantity for '${product.title} (${variant.title})' was adjusted from ${item.quantity} to ${stockAvailable} based on available stock`
        };
        warnings.push(stockWarning);
      }

      const itemTotal = livePrice * effectiveQuantity;
      subtotal += itemTotal;
      totalItemCount += effectiveQuantity;

      const primaryImg = product.images?.find((i) => i.isPrimary)?.url || product.images?.[0]?.url || '';

      populatedItems.push({
        _id: item._id,
        productId: product._id,
        categoryId: product.categoryId,
        brandId: product.brandId,
        sku: item.sku,
        title: product.title,
        slug: product.slug,
        variantTitle: variant.title,
        variantAttributes: variant.attributes || {},
        imageUrl: primaryImg,
        quantity: effectiveQuantity,
        unitPrice: livePrice,
        addedPrice: item.addedPrice,
        mrp: liveMrp,
        discountPercent: liveMrp > livePrice ? Math.round(((liveMrp - livePrice) / liveMrp) * 100) : 0,
        itemTotal,
        isAvailable: true,
        stockAvailable,
        priceChanged
      });
    }
  }

  // 5. Re-evaluate Applied Coupon
  let appliedCoupon = null;
  let discountTotal = 0;

  if (cart.appliedCoupon && cart.appliedCoupon.code && subtotal > 0) {
    try {
      const couponEval = await validateCouponEligibility({
        code: cart.appliedCoupon.code,
        subtotalPaise: subtotal,
        userId: currentUserId,
        cartItems: populatedItems.filter((i) => i.isAvailable)
      });

      discountTotal = couponEval.discountAmount;
      appliedCoupon = {
        code: couponEval.code,
        discountType: couponEval.discountType,
        discountValue: couponEval.discountValue,
        discountAmount: discountTotal
      };

      // Update stored discount amount if changed
      cart.appliedCoupon.discountAmount = discountTotal;
    } catch (err) {
      warnings.push({
        type: 'COUPON_REMOVED',
        message: `Applied coupon '${cart.appliedCoupon.code}' was removed: ${err.message}`
      });
      cart.appliedCoupon = null;
      appliedCoupon = null;
      discountTotal = 0;
    }
  } else if (subtotal === 0 && cart.appliedCoupon) {
    cart.appliedCoupon = null;
    appliedCoupon = null;
    discountTotal = 0;
  }

  // 6. Calculate Estimated Shipping
  let shippingFee = 0;
  let freeShippingThreshold = FREE_SHIPPING_THRESHOLD_PAISE;
  let amountNeededForFreeShipping = 0;

  if (subtotal > 0) {
    if (subtotal >= FREE_SHIPPING_THRESHOLD_PAISE) {
      shippingFee = 0;
    } else {
      shippingFee = STANDARD_SHIPPING_FEE_PAISE;
      amountNeededForFreeShipping = FREE_SHIPPING_THRESHOLD_PAISE - subtotal;
    }
  }

  // 7. Calculate Grand Total
  const grandTotal = Math.max(0, subtotal - discountTotal + shippingFee);

  return {
    _id: cart._id,
    userId: cart.userId,
    guestId: cart.guestId,
    items: populatedItems,
    itemCount: totalItemCount,
    subtotal,
    appliedCoupon,
    discountTotal,
    shippingFee,
    freeShippingThreshold,
    amountNeededForFreeShipping,
    grandTotal,
    warnings,
    updatedAt: cart.updatedAt
  };
}

/**
 * Adds an item to the user or guest cart
 */
export async function addItemToCart({ userId = null, guestId = null, productId, sku, quantity = 1 }) {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 1 || qty > MAX_ITEM_QUANTITY) {
    throw ApiError.badRequest(`Quantity must be between 1 and ${MAX_ITEM_QUANTITY}`);
  }

  const cleanSku = (sku || '').trim().toUpperCase();
  if (!cleanSku) {
    throw ApiError.badRequest('SKU is required');
  }

  const product = await Product.findById(productId);
  if (!product || product.status !== 'published') {
    throw ApiError.badRequest('Selected product is currently unavailable');
  }

  const variant = (product.variants || []).find((v) => v.sku === cleanSku && v.isActive);
  if (!variant) {
    throw ApiError.badRequest(`Product variant with SKU '${cleanSku}' was not found`);
  }

  if (variant.stockQuantity <= 0) {
    throw ApiError.badRequest(`Variant '${variant.title}' is currently out of stock`);
  }

  const cart = await getOrCreateCart({ userId, guestId });
  const existingItemIndex = cart.items.findIndex((item) => item.sku === cleanSku);

  if (existingItemIndex > -1) {
    const existing = cart.items[existingItemIndex];
    const newQty = existing.quantity + qty;

    if (newQty > MAX_ITEM_QUANTITY) {
      throw ApiError.badRequest(`Cannot add more than ${MAX_ITEM_QUANTITY} units of the same item`);
    }
    if (newQty > variant.stockQuantity) {
      throw ApiError.badRequest(`Only ${variant.stockQuantity} units available in stock`);
    }

    cart.items[existingItemIndex].quantity = newQty;
    cart.items[existingItemIndex].addedPrice = variant.price; // Update price snapshot
  } else {
    if (qty > variant.stockQuantity) {
      throw ApiError.badRequest(`Only ${variant.stockQuantity} units available in stock`);
    }

    cart.items.push({
      productId: product._id,
      sku: cleanSku,
      quantity: qty,
      addedPrice: variant.price
    });
  }

  await cart.save();
  return populateAndValidateCart(cart, { userId });
}

/**
 * Updates quantity of an item in the cart
 */
export async function updateCartItemQuantity({ userId = null, guestId = null, sku, quantity }) {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 0 || qty > MAX_ITEM_QUANTITY) {
    throw ApiError.badRequest(`Quantity must be between 0 and ${MAX_ITEM_QUANTITY}`);
  }

  const cleanSku = (sku || '').trim().toUpperCase();
  const cart = await getOrCreateCart({ userId, guestId });

  if (qty === 0) {
    cart.items = cart.items.filter((item) => item.sku !== cleanSku);
  } else {
    const itemIndex = cart.items.findIndex((item) => item.sku === cleanSku);
    if (itemIndex === -1) {
      throw ApiError.notFound(`SKU '${cleanSku}' not found in your cart`);
    }

    // Validate variant stock
    const product = await Product.findById(cart.items[itemIndex].productId);
    const variant = product?.variants?.find((v) => v.sku === cleanSku);

    if (variant && qty > variant.stockQuantity) {
      throw ApiError.badRequest(`Cannot exceed available stock of ${variant.stockQuantity} units`);
    }

    cart.items[itemIndex].quantity = qty;
  }

  await cart.save();
  return populateAndValidateCart(cart, { userId });
}

/**
 * Removes an item from the cart
 */
export async function removeItemFromCart({ userId = null, guestId = null, sku }) {
  const cleanSku = (sku || '').trim().toUpperCase();
  const cart = await getOrCreateCart({ userId, guestId });

  cart.items = cart.items.filter((item) => item.sku !== cleanSku);
  await cart.save();

  return populateAndValidateCart(cart, { userId });
}

/**
 * Clears all items and coupons from the cart
 */
export async function clearCart({ userId = null, guestId = null }) {
  const cart = await getOrCreateCart({ userId, guestId });
  cart.items = [];
  cart.appliedCoupon = null;
  await cart.save();

  return populateAndValidateCart(cart, { userId });
}

/**
 * Applies a coupon to the cart
 */
export async function applyCartCoupon({ userId = null, guestId = null, code }) {
  const cart = await getOrCreateCart({ userId, guestId });
  const validated = await populateAndValidateCart(cart, { userId });

  if (validated.items.length === 0 || validated.subtotal <= 0) {
    throw ApiError.badRequest('Your cart is empty. Add items before applying a coupon');
  }

  const couponResult = await validateCouponEligibility({
    code,
    subtotalPaise: validated.subtotal,
    userId,
    cartItems: validated.items.filter((i) => i.isAvailable)
  });

  cart.appliedCoupon = {
    code: couponResult.code,
    discountType: couponResult.discountType,
    discountValue: couponResult.discountValue,
    discountAmount: couponResult.discountAmount
  };

  await cart.save();
  return populateAndValidateCart(cart, { userId });
}

/**
 * Removes the applied coupon from the cart
 */
export async function removeCartCoupon({ userId = null, guestId = null }) {
  const cart = await getOrCreateCart({ userId, guestId });
  cart.appliedCoupon = null;
  await cart.save();

  return populateAndValidateCart(cart, { userId });
}

/**
 * Merges a guest cart into an authenticated user's cart upon login/registration.
 * Combines quantities, resolves limits, and purges the guest cart idempotently.
 */
export async function mergeGuestCart({ userId, guestId }) {
  if (!userId || !guestId) {
    return null;
  }

  const guestCart = await Cart.findOne({ guestId });
  if (!guestCart || guestCart.items.length === 0) {
    // Nothing to merge
    if (guestCart) await Cart.deleteOne({ _id: guestCart._id });
    const userCart = await getOrCreateCart({ userId });
    return populateAndValidateCart(userCart, { userId });
  }

  const userCart = await getOrCreateCart({ userId });

  // Merge items
  for (const guestItem of guestCart.items) {
    const existingIndex = userCart.items.findIndex((item) => item.sku === guestItem.sku);

    if (existingIndex > -1) {
      const combined = userCart.items[existingIndex].quantity + guestItem.quantity;
      userCart.items[existingIndex].quantity = Math.min(combined, MAX_ITEM_QUANTITY);
    } else {
      userCart.items.push({
        productId: guestItem.productId,
        sku: guestItem.sku,
        quantity: Math.min(guestItem.quantity, MAX_ITEM_QUANTITY),
        addedPrice: guestItem.addedPrice
      });
    }
  }

  // Transfer applied coupon if user cart had none
  if (!userCart.appliedCoupon && guestCart.appliedCoupon) {
    userCart.appliedCoupon = guestCart.appliedCoupon;
  }

  await userCart.save();

  // Purge the guest cart idempotently
  await Cart.deleteOne({ _id: guestCart._id });

  return populateAndValidateCart(userCart, { userId });
}

export default {
  getOrCreateCart,
  populateAndValidateCart,
  addItemToCart,
  updateCartItemQuantity,
  removeItemFromCart,
  clearCart,
  applyCartCoupon,
  removeCartCoupon,
  mergeGuestCart
};
