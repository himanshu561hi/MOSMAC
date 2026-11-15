import { Router } from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { reviewLimiter } from '../middlewares/rateLimiter.js';
import { ROLES } from '../constants/roles.js';
import { submitReviewSchema, moderateReviewSchema } from '../validators/cmsValidators.js';

// Product Review Routes (mounted on /api/v1/products/:id/reviews or /api/v1/reviews)
export const productReviewRouter = Router({ mergeParams: true });

productReviewRouter.get('/', reviewController.getProductReviews);
productReviewRouter.get('/eligibility', authenticate, reviewController.checkEligibility);
productReviewRouter.post('/', reviewLimiter, authenticate, validate(submitReviewSchema), reviewController.submitReview);

// Admin Review Moderation Router (mounted on /api/v1/admin/reviews)
export const adminReviewRouter = Router();

adminReviewRouter.use(authenticate);
adminReviewRouter.use(
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.ORDER_MANAGER, ROLES.SUPPORT_STAFF)
);

adminReviewRouter.get('/', reviewController.listAdminReviews);
adminReviewRouter.patch('/:id/status', validate(moderateReviewSchema), reviewController.moderateReview);
adminReviewRouter.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  reviewController.deleteReview
);

export default {
  productReviewRouter,
  adminReviewRouter
};
