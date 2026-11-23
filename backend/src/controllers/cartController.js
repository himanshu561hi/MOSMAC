import crypto from 'crypto';
import cartService from '../services/cartService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export function resolveSessionIds(req, res) {
  const userId = req.user?._id || null;
  let guestId = null;

  if (!userId) {
    guestId =
      req.headers['x-guest-id'] ||
      req.cookies?.guest_id ||
      req.query.guestId ||
      null;

    if (!guestId) {
      guestId = `gst_${crypto.randomUUID().replace(/-/g, '')}`;
      res.setHeader('x-guest-id', guestId);
      res.cookie('guest_id', guestId, {
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
    } else {
      res.setHeader('x-guest-id', guestId);
    }
  }

  return { userId, guestId };
}

export async function getCart(req, res, next) {
  try {
    const { userId, guestId } = resolveSessionIds(req, res);
    const cart = await cartService.getOrCreateCart({ userId, guestId });
    const validatedCart = await cartService.populateAndValidateCart(cart, { userId });

    return sendSuccess(res, HTTP_STATUS.OK, 'Cart retrieved successfully', { cart: validatedCart });
  } catch (error) {
    next(error);
  }
}

export async function addItem(req, res, next) {
  try {
    const { userId, guestId } = resolveSessionIds(req, res);
    const { productId, sku, quantity } = req.body;

    const validatedCart = await cartService.addItemToCart({
      userId,
      guestId,
      productId,
      sku,
      quantity
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Item added to cart', { cart: validatedCart });
  } catch (error) {
    next(error);
  }
}

export async function updateItemQuantity(req, res, next) {
  try {
    const { userId, guestId } = resolveSessionIds(req, res);
    const { sku } = req.params;
    const { quantity } = req.body;

    const validatedCart = await cartService.updateCartItemQuantity({
      userId,
      guestId,
      sku,
      quantity
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Cart quantity updated', { cart: validatedCart });
  } catch (error) {
    next(error);
  }
}

export async function removeItem(req, res, next) {
  try {
    const { userId, guestId } = resolveSessionIds(req, res);
    const { sku } = req.params;

    const validatedCart = await cartService.removeItemFromCart({
      userId,
      guestId,
      sku
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Item removed from cart', { cart: validatedCart });
  } catch (error) {
    next(error);
  }
}

export async function clearCart(req, res, next) {
  try {
    const { userId, guestId } = resolveSessionIds(req, res);
    const validatedCart = await cartService.clearCart({ userId, guestId });

    return sendSuccess(res, HTTP_STATUS.OK, 'Cart cleared', { cart: validatedCart });
  } catch (error) {
    next(error);
  }
}

export async function applyCoupon(req, res, next) {
  try {
    const { userId, guestId } = resolveSessionIds(req, res);
    const { code } = req.body;

    const validatedCart = await cartService.applyCartCoupon({
      userId,
      guestId,
      code
    });

    return sendSuccess(res, HTTP_STATUS.OK, `Coupon '${code.toUpperCase()}' applied successfully`, {
      cart: validatedCart
    });
  } catch (error) {
    next(error);
  }
}

export async function removeCoupon(req, res, next) {
  try {
    const { userId, guestId } = resolveSessionIds(req, res);
    const validatedCart = await cartService.removeCartCoupon({ userId, guestId });

    return sendSuccess(res, HTTP_STATUS.OK, 'Coupon removed from cart', { cart: validatedCart });
  } catch (error) {
    next(error);
  }
}

export async function mergeCart(req, res, next) {
  try {
    const userId = req.user._id;
    const guestId = req.body?.guestId || req.headers['x-guest-id'] || req.cookies?.guest_id || null;

    if (!guestId) {
      const userCart = await cartService.getOrCreateCart({ userId });
      const validatedCart = await cartService.populateAndValidateCart(userCart, { userId });
      return sendSuccess(res, HTTP_STATUS.OK, 'Cart retrieved successfully', { cart: validatedCart });
    }

    const mergedCart = await cartService.mergeGuestCart({ userId, guestId });

    return sendSuccess(res, HTTP_STATUS.OK, 'Guest cart merged successfully', { cart: mergedCart });
  } catch (error) {
    next(error);
  }
}

export default {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  mergeCart
};
