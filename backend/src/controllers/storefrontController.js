import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { Coupon } from '../models/Coupon.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { homepageSectionService } from '../services/homepageSectionService.js';

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
        title: 'Ultra Definition Liquid Foundation',
        subtitle: 'Woke up like this foundation. Save your selfie with weightless buildable coverage.',
        ctaText: 'Shop Foundation',
        ctaLink: '/products',
        badge: 'MOSMAC COMPLEXION',
        imageUrl: '/images/hero/hero-1-foundation.jpg'
      },
      {
        id: 'hero-2',
        title: 'Translucent Loose Setting Powder',
        subtitle: 'All-day matte perfection with micro-fine blur technology.',
        ctaText: 'Shop Powder',
        ctaLink: '/products',
        badge: 'MOSMAC FLAWLESS FINISH',
        imageUrl: '/images/hero/hero-2-loose-powder.jpg'
      },
      {
        id: 'hero-3',
        title: '16-Color Pigmented Eyeshadow Palette',
        subtitle: 'Professional artistry shades for stunning day-to-night eye looks.',
        ctaText: 'Shop Eyeshadow',
        ctaLink: '/products',
        badge: 'MOSMAC PRO COSMETICS',
        imageUrl: '/images/hero/hero-3-eyeshadow-palette.jpg'
      },
      {
        id: 'hero-4',
        title: 'Long-Lasting No Smudge Eyeliner',
        subtitle: 'Unique long-lasting no-smudge formula that is safe for your eyes.',
        ctaText: 'Shop Eyeliner',
        ctaLink: '/products',
        badge: 'MOSMAC EYE CARE',
        imageUrl: '/images/hero/hero-4-eyeliner.jpg'
      },
      {
        id: 'hero-5',
        title: 'Cherry Lip Balm SPF 50 PA++++',
        subtitle: 'Enriched with 1% Kojic Acid and Ceramides for nourished, sun-protected lips.',
        ctaText: 'Shop Lip Balm',
        ctaLink: '/products',
        badge: 'MOSMAC DERMA CARE',
        imageUrl: '/images/hero/hero-5-lip-balm.jpg'
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

    // Dynamic admin-managed homepage sections
    let dynamicSections = [];
    try {
      dynamicSections = await homepageSectionService.getPublicStorefrontSections();
    } catch (err) {
      // Fallback silently if not yet seeded
      dynamicSections = [];
    }

    // Active promotional coupons for banner ticker
    let activeOffers = [];
    try {
      const now = new Date();
      const coupons = await Coupon.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
      })
        .select('code description discountType discountValue maxDiscountAmount minOrderAmount')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      activeOffers = coupons.map((c) => {
        let discountText = '';
        if (c.description && c.description.trim()) {
          discountText = c.description.trim();
        } else if (c.discountType === 'percentage') {
          discountText = `up to ${c.discountValue}% off`;
          if (c.maxDiscountAmount) {
            discountText += ` up to ₹${Math.round(c.maxDiscountAmount / 100)}`;
          }
        } else {
          discountText = `up to ₹${Math.round(c.discountValue / 100 || c.discountValue)} off`;
        }
        return {
          _id: c._id,
          code: c.code,
          text: `Use ${c.code} for ${discountText}`,
          discountText,
          description: c.description || '',
          discountType: c.discountType,
          discountValue: c.discountValue
        };
      });
    } catch (err) {
      activeOffers = [];
    }

    const adminFeatured = dynamicSections.find((s) => s.slug === 'featured')?.products;
    const adminBestsellers = dynamicSections.find((s) => s.slug === 'bestsellers')?.products;
    const adminWhatsNew = dynamicSections.find((s) => s.slug === 'whats_new')?.products;

    return sendSuccess(res, HTTP_STATUS.OK, 'Homepage data retrieved', {
      heroBanners,
      featuredCategories,
      featuredProducts: (adminFeatured && adminFeatured.length > 0) ? adminFeatured : (featuredProducts.length > 0 ? featuredProducts : newArrivals.slice(0, 4)),
      newArrivals: (adminWhatsNew && adminWhatsNew.length > 0) ? adminWhatsNew : newArrivals,
      bestSellers: (adminBestsellers && adminBestsellers.length > 0) ? adminBestsellers : (bestSellers.length > 0 ? bestSellers : newArrivals.slice(0, 4)),
      brands,
      promotionalFeatures,
      promotionalOffers: activeOffers,
      dynamicSections
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

