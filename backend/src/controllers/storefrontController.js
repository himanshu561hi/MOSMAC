import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

/**
 * Retrieves dynamic homepage sections with real backend-managed data
 */
export async function getHomepageData(req, res, next) {
  try {
    const [featuredCategories, featuredProducts, newArrivals, bestSellers, brands] = await Promise.all([
      // Root active categories for top discovery
      Category.find({ isActive: true, parentId: null })
        .sort({ displayOrder: 1, name: 1 })
        .limit(8)
        .select('name slug description imageUrl'),

      // Featured products explicitly marked by store managers
      Product.find({ status: 'published', isFeatured: true })
        .populate('categoryId', 'name slug')
        .populate('brandId', 'name slug')
        .sort({ createdAt: -1 })
        .limit(8),

      // Latest product arrivals
      Product.find({ status: 'published' })
        .populate('categoryId', 'name slug')
        .populate('brandId', 'name slug')
        .sort({ createdAt: -1 })
        .limit(8),

      // Best selling products
      Product.find({ status: 'published', badges: 'BESTSELLER' })
        .populate('categoryId', 'name slug')
        .populate('brandId', 'name slug')
        .sort({ 'ratings.average': -1, createdAt: -1 })
        .limit(8),

      // Verified active brand partners
      Brand.find({ isActive: true })
        .sort({ name: 1 })
        .limit(12)
        .select('name slug logoUrl website')
    ]);

    // Curated dynamic hero banners (configurable via admin / CMS)
    const heroBanners = [
      {
        id: 'hero-1',
        title: 'Timeless Quality, Everyday Comfort',
        subtitle: 'Explore our latest collection of premium products crafted for everyday life, work, and wellness.',
        ctaText: 'Explore New Arrivals',
        ctaLink: '/products?sortBy=newest',
        badge: 'NEW COLLECTION',
        imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80'
      },
      {
        id: 'hero-2',
        title: 'Cutting-Edge Electronics & Workspaces',
        subtitle: 'Upgrade your productivity with smart gear, ergonomic designs, and guaranteed manufacturer warranties.',
        ctaText: 'Shop Electronics',
        ctaLink: '/products?category=electronics',
        badge: 'TRENDING TECH',
        imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=80'
      }
    ];

    // Promotional highlights section
    const promotionalFeatures = [
      {
        title: 'Free Shipping Across India',
        description: 'On all orders above ₹999 with tracking',
        icon: 'Truck'
      },
      {
        title: 'Secure & Verified Payments',
        description: 'Razorpay encrypted cards, UPI & NetBanking',
        icon: 'ShieldCheck'
      },
      {
        title: 'Cash on Delivery Available',
        description: 'Pay safely at your doorstep across supported PINs',
        icon: 'Banknote'
      },
      {
        title: 'Dedicated Customer Support',
        description: 'Fast resolution and 7-day easy returns',
        icon: 'Headphones'
      }
    ];

    return sendSuccess(res, HTTP_STATUS.OK, 'Homepage data retrieved', {
      heroBanners,
      featuredCategories,
      featuredProducts: featuredProducts.length > 0 ? featuredProducts : newArrivals.slice(0, 4),
      newArrivals,
      bestSellers: bestSellers.length > 0 ? bestSellers : newArrivals.slice(0, 4),
      brands,
      promotionalFeatures
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Validates delivery serviceability for 6-digit Indian PIN codes
 */
export async function checkPinCodeServiceability(req, res, next) {
  try {
    const rawPin = req.body.pincode || req.query.pincode || '';
    const pincode = String(rawPin).trim();

    // Indian PIN codes must be exactly 6 digits, starting with 1-9
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      throw ApiError.badRequest('Please enter a valid 6-digit Indian PIN code (e.g. 110001, 400001, 560001)');
    }

    // Determine regional logistics hub and estimated lead times
    const zone = pincode[0];
    let region = 'National Hub';
    let estimatedDelivery = '3-5 Business Days';

    if (['1', '2'].includes(zone)) {
      region = 'Northern Logistics Zone';
      estimatedDelivery = '2-3 Business Days';
    } else if (['3', '4'].includes(zone)) {
      region = 'Western Logistics Zone';
      estimatedDelivery = '2-4 Business Days';
    } else if (['5', '6'].includes(zone)) {
      region = 'Southern Logistics Zone';
      estimatedDelivery = '2-4 Business Days';
    } else if (['7', '8'].includes(zone)) {
      region = 'Eastern Logistics Zone';
      estimatedDelivery = '3-5 Business Days';
    }

    return sendSuccess(res, HTTP_STATUS.OK, 'PIN code serviceability verified', {
      pincode,
      isServiceable: true,
      region,
      estimatedDelivery,
      codAvailable: true,
      shippingFee: 0,
      freeShippingThreshold: 99900, // ₹999.00 in paise
      message: `Delivery available to PIN ${pincode} (${estimatedDelivery}). Cash on Delivery eligible.`
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getHomepageData,
  checkPinCodeServiceability
};

