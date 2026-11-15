import { Coupon } from '../models/Coupon.js';
import { validateCouponEligibility } from '../services/couponService.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export async function validateCoupon(req, res, next) {
  try {
    const { code, subtotal } = req.body;
    const userId = req.user?._id || null;

    const result = await validateCouponEligibility({
      code,
      subtotalPaise: parseInt(subtotal, 10) || 0,
      userId,
      cartItems: []
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Coupon is valid and eligible', result);
  } catch (error) {
    next(error);
  }
}

export async function getAdminCoupons(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      query.code = new RegExp(req.query.search.trim(), 'i');
    }
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    const [coupons, total] = await Promise.all([
      Coupon.find(query)
        .populate('applicableCategories', 'name slug')
        .populate('applicableProducts', 'title slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Coupon.countDocuments(query)
    ]);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Coupons retrieved successfully',
      { coupons },
      { page, limit, total, totalPages: Math.ceil(total / limit) }
    );
  } catch (error) {
    next(error);
  }
}

export async function createCoupon(req, res, next) {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      startDate,
      endDate,
      usageLimitPerUser,
      totalUsageLimit,
      applicableCategories,
      applicableProducts,
      firstOrderOnly,
      isActive
    } = req.body;

    const cleanCode = code.trim().toUpperCase();
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      throw ApiError.conflict(`Coupon with code '${cleanCode}' already exists`);
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      description: description || '',
      discountType,
      discountValue,
      maxDiscountAmount: maxDiscountAmount || null,
      minOrderAmount: minOrderAmount || 0,
      startDate: startDate || new Date(),
      endDate,
      usageLimitPerUser: usageLimitPerUser || 1,
      totalUsageLimit: totalUsageLimit || null,
      applicableCategories: applicableCategories || [],
      applicableProducts: applicableProducts || [],
      firstOrderOnly: Boolean(firstOrderOnly),
      isActive: isActive !== undefined ? isActive : true
    });

    return sendSuccess(res, HTTP_STATUS.CREATED, 'Coupon created successfully', { coupon });
  } catch (error) {
    next(error);
  }
}

export async function updateCoupon(req, res, next) {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }

    const {
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      startDate,
      endDate,
      usageLimitPerUser,
      totalUsageLimit,
      applicableCategories,
      applicableProducts,
      firstOrderOnly,
      isActive
    } = req.body;

    if (description !== undefined) coupon.description = description;
    if (discountType) coupon.discountType = discountType;
    if (discountValue) coupon.discountValue = discountValue;
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount;
    if (minOrderAmount !== undefined) coupon.minOrderAmount = minOrderAmount;
    if (startDate) coupon.startDate = startDate;
    if (endDate) coupon.endDate = endDate;
    if (usageLimitPerUser) coupon.usageLimitPerUser = usageLimitPerUser;
    if (totalUsageLimit !== undefined) coupon.totalUsageLimit = totalUsageLimit;
    if (applicableCategories) coupon.applicableCategories = applicableCategories;
    if (applicableProducts) coupon.applicableProducts = applicableProducts;
    if (firstOrderOnly !== undefined) coupon.firstOrderOnly = firstOrderOnly;
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();

    return sendSuccess(res, HTTP_STATUS.OK, 'Coupon updated successfully', { coupon });
  } catch (error) {
    next(error);
  }
}

export async function deleteCoupon(req, res, next) {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }

    coupon.isActive = false;
    await coupon.save();

    return sendSuccess(res, HTTP_STATUS.OK, 'Coupon deactivated successfully');
  } catch (error) {
    next(error);
  }
}

export default {
  validateCoupon,
  getAdminCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
};
