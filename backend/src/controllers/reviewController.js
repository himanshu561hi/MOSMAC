import { reviewService } from '../services/reviewService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export async function checkEligibility(req, res, next) {
  try {
    const { id } = req.params;
    const { sku } = req.query;
    const result = await reviewService.checkReviewEligibility(req.user._id, id, sku);
    return sendSuccess(res, HTTP_STATUS.OK, 'Review eligibility evaluated', result);
  } catch (error) {
    next(error);
  }
}

export async function submitReview(req, res, next) {
  try {
    const { id } = req.params;
    const customerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Verified Customer';
    const review = await reviewService.submitReview(req.user._id, customerName, {
      productId: id,
      ...req.body
    });
    return sendSuccess(
      res,
      HTTP_STATUS.CREATED,
      'Thank you! Your verified review has been submitted for moderation and will appear publicly upon approval.',
      { review }
    );
  } catch (error) {
    next(error);
  }
}

export async function getProductReviews(req, res, next) {
  try {
    const { id } = req.params;
    const { page, limit, sortBy } = req.query;
    const result = await reviewService.getProductReviews(id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      sortBy
    });
    return sendSuccess(res, HTTP_STATUS.OK, 'Product reviews retrieved', result);
  } catch (error) {
    next(error);
  }
}

export async function listAdminReviews(req, res, next) {
  try {
    const { page, limit, status, rating, search } = req.query;
    const result = await reviewService.listAdminReviews({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      rating,
      search
    });
    return sendSuccess(res, HTTP_STATUS.OK, 'Review moderation queue retrieved', result);
  } catch (error) {
    next(error);
  }
}

export async function moderateReview(req, res, next) {
  try {
    const { id } = req.params;
    const { status, moderationNote } = req.body;

    let review;
    if (status === 'approved') {
      review = await reviewService.approveReview(id, req.user);
    } else {
      review = await reviewService.rejectReview(id, moderationNote, req.user);
    }

    return sendSuccess(res, HTTP_STATUS.OK, `Review ${status} successfully`, { review });
  } catch (error) {
    next(error);
  }
}

export async function deleteReview(req, res, next) {
  try {
    const { id } = req.params;
    const result = await reviewService.deleteReview(id, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, 'Review deleted successfully', result);
  } catch (error) {
    next(error);
  }
}

export default {
  checkEligibility,
  submitReview,
  getProductReviews,
  listAdminReviews,
  moderateReview,
  deleteReview
};
