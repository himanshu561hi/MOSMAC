import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { auditService } from './auditService.js';

export const reviewService = {
  /**
   * Strictly evaluates whether an authenticated customer is eligible to review a product variant.
   * Customer must have a delivered, non-refunded order containing the matching SKU, and no prior review.
   */
  async checkReviewEligibility(customerId, productId, sku) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw ApiError.badRequest('Invalid product ID');
    }

    // 1. Check if customer already submitted a review for this product (1 review per product per customer)
    const existingReview = await Review.findOne({
      userId: customerId,
      productId: new mongoose.Types.ObjectId(productId)
    });

    if (existingReview) {
      return {
        eligible: false,
        isEligible: false,
        reason: 'ALREADY_REVIEWED',
        message: 'You have already submitted a review for this product.',
        reviewId: existingReview._id,
        status: existingReview.status
      };
    }

    // 2. Query delivered orders containing the target SKU
    const orderQuery = {
      userId: new mongoose.Types.ObjectId(customerId),
      orderStatus: 'delivered',
      paymentStatus: { $nin: ['failed', 'refunded'] },
      'items.productId': new mongoose.Types.ObjectId(productId)
    };

    if (sku) {
      orderQuery['items.sku'] = sku.trim().toUpperCase();
    }

    const eligibleOrder = await Order.findOne(orderQuery).sort({ createdAt: -1 }).lean();

    if (!eligibleOrder) {
      return {
        eligible: false,
        isEligible: false,
        reason: 'VERIFIED_PURCHASE_REQUIRED',
        message: 'Only verified purchasers with a delivered order can submit a product review.'
      };
    }

    return {
      eligible: true,
      isEligible: true,
      orderId: eligibleOrder._id,
      orderNumber: eligibleOrder.orderNumber
    };
  },

  /**
   * Submits a customer review with authoritative verified purchase evaluation
   */
  async submitReview(customerId, customerName, { productId, sku, rating, title, comment, images = [] }) {
    const eligibility = await this.checkReviewEligibility(customerId, productId, sku);

    if (!eligibility.eligible) {
      throw ApiError.forbidden(eligibility.message || eligibility.reason || 'Not eligible to review this product');
    }

    const review = await Review.create({
      productId,
      sku: sku.trim().toUpperCase(),
      orderId: eligibility.orderId,
      orderNumber: eligibility.orderNumber,
      userId: customerId,
      customerName: customerName || 'Verified Buyer',
      rating,
      title: title.trim(),
      comment: comment.trim(),
      images,
      status: 'pending', // Requires admin moderation
      verifiedPurchase: true
    });

    return review;
  },

  /**
   * Retrieves approved public reviews for a product with rating statistics and star breakdown
   */
  async getProductReviews(productId, { page = 1, limit = 10, sortBy = 'newest' } = {}) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw ApiError.badRequest('Invalid product ID');
    }

    const pId = new mongoose.Types.ObjectId(productId);
    const skip = (page - 1) * limit;

    let sortOption = { createdAt: -1 };
    if (sortBy === 'highest_rating') sortOption = { rating: -1, createdAt: -1 };
    if (sortBy === 'lowest_rating') sortOption = { rating: 1, createdAt: -1 };

    const [reviews, totalApproved, ratingStats] = await Promise.all([
      Review.find({ productId: pId, status: 'approved' })
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .select('-moderationNote -moderatedBy')
        .lean(),
      Review.countDocuments({ productId: pId, status: 'approved' }),
      Review.aggregate([
        { $match: { productId: pId, status: 'approved' } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Format rating distribution (1 to 5 stars)
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalScore = 0;

    ratingStats.forEach((r) => {
      distribution[r._id] = r.count;
      totalScore += r._id * r.count;
    });

    const averageRating = totalApproved > 0 ? Math.round((totalScore / totalApproved) * 10) / 10 : 0;

    return {
      reviews,
      totalReviews: totalApproved,
      averageRating,
      starDistribution: distribution,
      summary: {
        totalReviews: totalApproved,
        averageRating,
        distribution,
        starDistribution: distribution
      },
      pagination: {
        page,
        limit,
        total: totalApproved,
        pages: Math.ceil(totalApproved / limit)
      }
    };
  },

  /**
   * Paginated review list for administrative moderation queue
   */
  async listAdminReviews({ page = 1, limit = 20, status, rating, search } = {}) {
    const query = {};
    if (status) query.status = status;
    if (rating) query.rating = parseInt(rating, 10);
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ customerName: searchRegex }, { title: searchRegex }, { comment: searchRegex }, { orderNumber: searchRegex }];
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('productId', 'title slug images')
        .populate('userId', 'email firstName lastName')
        .populate('moderatedBy', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(query)
    ]);

    return {
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  /**
   * Approves a customer review and recalculates product rating metrics
   */
  async approveReview(reviewId, staffUser) {
    const review = await Review.findById(reviewId);
    if (!review) throw ApiError.notFound('Review not found');

    review.status = 'approved';
    review.moderatedBy = staffUser._id;
    review.moderatedAt = new Date();
    await review.save();

    await this.recalculateProductRating(review.productId);

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'REVIEW_APPROVED',
      resourceType: 'Review',
      resourceId: review._id,
      notes: `Approved review with rating ${review.rating}★ for order ${review.orderNumber}`
    });

    return review;
  },

  /**
   * Rejects an inappropriate or non-compliant review
   */
  async rejectReview(reviewId, moderationNote, staffUser) {
    const review = await Review.findById(reviewId);
    if (!review) throw ApiError.notFound('Review not found');

    const previousStatus = review.status;
    review.status = 'rejected';
    review.moderationNote = moderationNote || 'Does not comply with review guidelines';
    review.moderatedBy = staffUser._id;
    review.moderatedAt = new Date();
    await review.save();

    // Recalculate if it was previously approved
    if (previousStatus === 'approved') {
      await this.recalculateProductRating(review.productId);
    }

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'REVIEW_REJECTED',
      resourceType: 'Review',
      resourceId: review._id,
      notes: `Rejected review. Reason: ${review.moderationNote}`
    });

    return review;
  },

  /**
   * Permanently deletes a review and synchronizes product aggregate ratings
   */
  async deleteReview(reviewId, staffUser) {
    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) throw ApiError.notFound('Review not found');

    if (review.status === 'approved') {
      await this.recalculateProductRating(review.productId);
    }

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'REVIEW_DELETED',
      resourceType: 'Review',
      resourceId: reviewId,
      notes: `Deleted review from ${review.customerName} on product ${review.productId}`
    });

    return { success: true, message: 'Review deleted successfully' };
  },

  /**
   * Atomically recalculates the average rating and count on the Product model
   */
  async recalculateProductRating(productId) {
    const pId = new mongoose.Types.ObjectId(productId);

    const stats = await Review.aggregate([
      { $match: { productId: pId, status: 'approved' } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          average: { $avg: '$rating' }
        }
      }
    ]);

    const count = stats[0]?.count || 0;
    const average = stats[0]?.average ? Math.round(stats[0].average * 10) / 10 : 0;

    await Product.findByIdAndUpdate(pId, {
      $set: {
        'ratings.average': average,
        'ratings.count': count
      }
    });

    return { average, count };
  }
};

export default reviewService;
