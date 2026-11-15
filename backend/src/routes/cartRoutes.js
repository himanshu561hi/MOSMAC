import { Router } from 'express';
import {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  mergeCart
} from '../controllers/cartController.js';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  addToCartSchema,
  updateQuantitySchema,
  applyCouponSchema,
  mergeCartSchema
} from '../validators/cartValidators.js';

export const cartRoutes = Router();

// Public / Guest / Customer Cart Routes
cartRoutes.get('/', optionalAuthenticate, getCart);
cartRoutes.post('/items', optionalAuthenticate, validate(addToCartSchema), addItem);
cartRoutes.patch('/items/:sku', optionalAuthenticate, validate(updateQuantitySchema), updateItemQuantity);
cartRoutes.delete('/items/:sku', optionalAuthenticate, removeItem);
cartRoutes.delete('/', optionalAuthenticate, clearCart);
cartRoutes.post('/coupon', optionalAuthenticate, validate(applyCouponSchema), applyCoupon);
cartRoutes.delete('/coupon', optionalAuthenticate, removeCoupon);

// Authenticated Merge Endpoint
cartRoutes.post('/merge', authenticate, validate(mergeCartSchema), mergeCart);

export default cartRoutes;
