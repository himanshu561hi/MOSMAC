import { resolveSessionIds } from './cartController.js';
import wishlistService from '../services/wishlistService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export async function getWishlist(req, res, next) {
  try {
    const { userId, guestId } = resolveSessionIds(req, res);
    const wishlist = await wishlistService.getPopulatedWishlist({ userId, guestId });

    return sendSuccess(res, HTTP_STATUS.OK, 'Wishlist retrieved successfully', { wishlist });
  } catch (error) {
    next(error);
  }
}

export async function addItem(req, res, next) {
  try {
    const { userId, guestId } = resolveSessionIds(req, res);
    const { productId, sku } = req.body;

    const wishlist = await wishlistService.addToWishlist({
      userId,
      guestId,
      productId,
      sku: sku || ''
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Item added to wishlist', { wishlist });
  } catch (error) {
    next(error);
  }
}

export async function removeItem(req, res, next) {
  try {
    const { userId, guestId } = resolveSessionIds(req, res);
    const { productId } = req.params;

    const wishlist = await wishlistService.removeFromWishlist({
      userId,
      guestId,
      productId
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Item removed from wishlist', { wishlist });
  } catch (error) {
    next(error);
  }
}

export async function moveToCart(req, res, next) {
  try {
    const { userId, guestId } = resolveSessionIds(req, res);
    const { productId } = req.params;
    const { sku, quantity } = req.body;

    const result = await wishlistService.moveItemToCart({
      userId,
      guestId,
      productId,
      sku,
      quantity: quantity || 1
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Item moved from wishlist to cart', result);
  } catch (error) {
    next(error);
  }
}

export async function mergeWishlist(req, res, next) {
  try {
    const userId = req.user._id;
    const guestId = req.body?.guestId || req.headers['x-guest-id'] || req.cookies?.guest_id || null;

    if (!guestId) {
      const wishlist = await wishlistService.getPopulatedWishlist({ userId });
      return sendSuccess(res, HTTP_STATUS.OK, 'Wishlist retrieved successfully', { wishlist });
    }

    const wishlist = await wishlistService.mergeGuestWishlist({ userId, guestId });

    return sendSuccess(res, HTTP_STATUS.OK, 'Guest wishlist merged successfully', { wishlist });
  } catch (error) {
    next(error);
  }
}

export default {
  getWishlist,
  addItem,
  removeItem,
  moveToCart,
  mergeWishlist
};
