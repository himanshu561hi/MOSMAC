import { Router } from 'express';
import {
  getWishlist,
  addItem,
  removeItem,
  moveToCart,
  mergeWishlist
} from '../controllers/wishlistController.js';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  addToWishlistSchema,
  moveToCartSchema,
  mergeCartSchema
} from '../validators/cartValidators.js';

export const wishlistRoutes = Router();

// Public / Guest / Customer Wishlist Routes
wishlistRoutes.get('/', optionalAuthenticate, getWishlist);
wishlistRoutes.post('/items', optionalAuthenticate, validate(addToWishlistSchema), addItem);
wishlistRoutes.delete('/items/:productId', optionalAuthenticate, removeItem);
wishlistRoutes.post('/items/:productId/move-to-cart', optionalAuthenticate, validate(moveToCartSchema), moveToCart);

// Authenticated Merge Endpoint
wishlistRoutes.post('/merge', authenticate, validate(mergeCartSchema), mergeWishlist);

export default wishlistRoutes;
