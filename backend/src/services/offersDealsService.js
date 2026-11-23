import { OffersDealsConfig } from '../models/OffersDealsConfig.js';
import { Product } from '../models/Product.js';
import { Coupon } from '../models/Coupon.js';
import { homepageSectionService } from './homepageSectionService.js';
import { auditService } from './auditService.js';

export const offersDealsService = {
  /**
   * Retrieves or initializes default Offers & Deals configuration
   */
  async getConfig() {
    let config = await OffersDealsConfig.findOne({ key: 'default' }).lean();
    if (!config) {
      config = await OffersDealsConfig.create({ key: 'default' });
      config = config.toObject();
    }
    return config;
  },

  /**
   * Updates Offers & Deals settings from Admin Panel
   */
  async updateConfig(data, staffUser) {
    let config = await OffersDealsConfig.findOne({ key: 'default' });
    if (!config) {
      config = new OffersDealsConfig({ key: 'default' });
    }

    if (data.sectionsVisibility) {
      config.sectionsVisibility = {
        ...config.sectionsVisibility.toObject(),
        ...data.sectionsVisibility
      };
    }

    if (data.dealsOfTheDay) {
      config.dealsOfTheDay = {
        ...config.dealsOfTheDay.toObject(),
        ...data.dealsOfTheDay
      };
    }

    if (data.offersInFocus) {
      if (data.offersInFocus.title !== undefined) {
        config.offersInFocus.title = data.offersInFocus.title;
      }
      if (data.offersInFocus.subtitle !== undefined) {
        config.offersInFocus.subtitle = data.offersInFocus.subtitle;
      }
      if (Array.isArray(data.offersInFocus.cards)) {
        config.offersInFocus.cards = data.offersInFocus.cards;
      }
    }

    if (data.mosmacSelectSpotlight) {
      config.mosmacSelectSpotlight = {
        ...config.mosmacSelectSpotlight.toObject(),
        ...data.mosmacSelectSpotlight
      };
    }

    await config.save();

    if (staffUser) {
      await auditService.log({
        actorId: staffUser._id,
        actorRole: staffUser.role,
        actorEmail: staffUser.email,
        action: 'OFFERS_DEALS_CONFIG_UPDATED',
        resourceType: 'OffersDealsConfig',
        resourceId: config._id,
        notes: 'Updated Offers & Deals page visibility and focus card configurations'
      });
    }

    return config;
  },

  /**
   * Returns aggregated data for the public Offers & Deals storefront page
   */
  async getStorefrontData() {
    const config = await this.getConfig();

    const [allSections, activeCoupons] = await Promise.all([
      homepageSectionService.getPublicStorefrontSections(),
      Coupon.find({
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      })
        .select('code description discountType discountValue maxDiscountAmount minOrderAmount')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    // Extract section products
    const offersDealsSection = allSections.find((s) => s.slug === 'offers_deals');
    const mosmacSelectSection = allSections.find((s) => s.slug === 'mosmac_select');

    let offersProducts = offersDealsSection?.products || [];
    let mosmacSelectProducts = mosmacSelectSection?.products || [];

    // Fallback if section assignments are empty
    if (offersProducts.length === 0) {
      const fallbackProducts = await Product.find({ status: 'published' })
        .populate('categoryId', 'name slug')
        .populate('brandId', 'name slug')
        .sort({ discountPercentage: -1, createdAt: -1 })
        .limit(16)
        .lean();

      offersProducts = fallbackProducts.map((p) => {
        const defaultVariant = p.variants?.[0] || {};
        const primaryImage =
          p.images?.find((img) => img.isPrimary)?.url ||
          p.images?.[0]?.url ||
          (typeof p.images?.[0] === 'string' ? p.images[0] : '') ||
          p.imageUrl ||
          '';
        const price = p.basePrice ? p.basePrice / 100 : defaultVariant.price ? defaultVariant.price / 100 : 0;
        const mrp = p.baseMrp ? p.baseMrp / 100 : defaultVariant.mrp ? defaultVariant.mrp / 100 : price;
        const discountPercentage = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
        return {
          _id: p._id,
          title: p.title,
          slug: p.slug,
          basePrice: p.basePrice,
          baseMrp: p.baseMrp || p.basePrice,
          variants: p.variants || [],
          price,
          mrp,
          discountPercentage,
          ratings: p.ratings,
          images: Array.isArray(p.images) && p.images.length > 0
            ? p.images
            : (primaryImage ? [{ url: primaryImage, isPrimary: true }] : []),
          imageUrl: primaryImage,
          category: p.categoryId,
          brand: p.brandId
        };
      });
    }

    // Fallback for MOSMAC Select spotlight if section has no products yet
    if (mosmacSelectProducts.length === 0) {
      const selectFallback = await Product.find({ status: 'published', isFeatured: true })
        .populate('categoryId', 'name slug')
        .populate('brandId', 'name slug')
        .limit(8)
        .lean();
      if (selectFallback.length > 0) {
        mosmacSelectProducts = selectFallback.map((p) => {
          const defaultVariant = p.variants?.[0] || {};
          const primaryImage =
            p.images?.find((img) => img.isPrimary)?.url ||
            p.images?.[0]?.url ||
            (typeof p.images?.[0] === 'string' ? p.images[0] : '') ||
            p.imageUrl ||
            '';
          const price = p.basePrice ? p.basePrice / 100 : defaultVariant.price ? defaultVariant.price / 100 : 0;
          const mrp = p.baseMrp ? p.baseMrp / 100 : defaultVariant.mrp ? defaultVariant.mrp / 100 : price;
          const discountPercentage = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
          return {
            _id: p._id,
            title: p.title,
            slug: p.slug,
            basePrice: p.basePrice,
            baseMrp: p.baseMrp || p.basePrice,
            variants: p.variants || [],
            price,
            mrp,
            discountPercentage,
            ratings: p.ratings,
            images: Array.isArray(p.images) && p.images.length > 0
              ? p.images
              : (primaryImage ? [{ url: primaryImage, isPrimary: true }] : []),
            imageUrl: primaryImage,
            category: p.categoryId,
            brand: p.brandId
          };
        });
      }
    }

    // High discount products for Deals of the Day
    const dealsOfTheDay = offersProducts.slice(0, 6);

    const formattedCoupons = (activeCoupons || []).map((c) => {
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

    return {
      config,
      dealsOfTheDay,
      offersProducts,
      mosmacSelectProducts,
      coupons: formattedCoupons
    };
  }
};

export default offersDealsService;
