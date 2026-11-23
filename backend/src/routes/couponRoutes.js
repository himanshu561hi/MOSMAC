import { Router } from 'express';
import {
  getPublicActiveCoupons,
  validateCoupon,
  getAdminCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
} from '../controllers/couponController.js';
import { authenticate, authorize, optionalAuthenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  applyCouponSchema,
  createCouponSchema
} from '../validators/cartValidators.js';
import { ROLES } from '../constants/roles.js';

export const couponRoutes = Router();

// Public Active Coupons (for storefront banners & offers ticker)
couponRoutes.get('/active', getPublicActiveCoupons);

// Public Coupon Check
couponRoutes.post('/validate', optionalAuthenticate, validate(applyCouponSchema), validateCoupon);

// Admin Coupon Management
couponRoutes.get(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  getAdminCoupons
);

couponRoutes.post(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(createCouponSchema),
  createCoupon
);

couponRoutes.put(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  updateCoupon
);

couponRoutes.delete(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  deleteCoupon
);

export default couponRoutes;
