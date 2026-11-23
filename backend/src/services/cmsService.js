import { Banner } from '../models/Banner.js';
import { HomepageSection } from '../models/HomepageSection.js';
import { HomepageSectionProduct } from '../models/HomepageSectionProduct.js';
import { ContentPage } from '../models/ContentPage.js';
import { FAQ } from '../models/FAQ.js';
import { StoreSettings } from '../models/StoreSettings.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { ApiError } from '../utils/ApiError.js';
import { sanitizeHtml } from '../utils/sanitizeHtml.js';
import { auditService } from './auditService.js';

export const cmsService = {
  // ==========================================
  // 1. HERO & PROMOTIONAL BANNERS
  // ==========================================

  async listAdminBanners({ page = 1, limit = 20, bannerType, isActive } = {}) {
    const query = {};
    if (bannerType) query.bannerType = bannerType;
    if (typeof isActive === 'boolean') query.isActive = isActive;

    const skip = (page - 1) * limit;
    const [banners, total] = await Promise.all([
      Banner.find(query).sort({ displayOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Banner.countDocuments(query)
    ]);

    return {
      banners,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  async listPublicBanners(bannerType = 'hero') {
    const now = new Date();
    return Banner.find({
      bannerType,
      isActive: true,
      $and: [
        { $or: [{ startDate: { $lte: now } }, { startDate: null }] },
        { $or: [{ endDate: { $gte: now } }, { endDate: null }] }
      ]
    })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();
  },

  async createBanner(data, staffUser) {
    const banner = await Banner.create(data);

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'BANNER_CREATED',
      resourceType: 'Banner',
      resourceId: banner._id,
      notes: `Created ${banner.bannerType} banner: "${banner.title}"`
    });

    return banner;
  },

  async updateBanner(id, data, staffUser) {
    const banner = await Banner.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!banner) throw ApiError.notFound('Banner not found');

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'BANNER_UPDATED',
      resourceType: 'Banner',
      resourceId: banner._id,
      notes: `Updated banner: "${banner.title}"`
    });

    return banner;
  },

  async deleteBanner(id, staffUser) {
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) throw ApiError.notFound('Banner not found');

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'BANNER_DELETED',
      resourceType: 'Banner',
      resourceId: id,
      notes: `Deleted banner: "${banner.title}"`
    });

    return { success: true, message: 'Banner deleted successfully' };
  },

  // ==========================================
  // 2. HOMEPAGE BUILDER
  // ==========================================

  async listAdminSections() {
    return HomepageSection.find({})
      .populate('config.categoryIds', 'name slug imageUrl')
      .populate('config.productIds', 'title slug images basePrice baseMrp ratings')
      .populate('config.bannerIds', 'title desktopImageUrl ctaLabel ctaDestination')
      .sort({ displayOrder: 1 })
      .lean();
  },

  async getDynamicHomepageSections() {
    const sections = await HomepageSection.find({ isActive: true })
      .populate('config.categoryIds', 'name slug imageUrl')
      .populate({
        path: 'config.productIds',
        match: { status: 'published' },
        select: 'title slug images basePrice baseMrp ratings badges isFeatured variants categoryId brandId',
        populate: [
          { path: 'categoryId', select: 'name slug' },
          { path: 'brandId', select: 'name slug' }
        ]
      })
      .populate('config.bannerIds')
      .sort({ displayOrder: 1 })
      .lean();

    // If no custom sections exist yet, provide fallback default layout
    if (sections.length === 0) {
      return this.getDefaultHomepageSections();
    }

    return sections;
  },

  async getDefaultHomepageSections() {
    const [categories, products, brands, heroBanners] = await Promise.all([
      Category.find({ isActive: true, parentId: null }).limit(8).select('name slug description imageUrl').lean(),
      Product.find({ status: 'published' }).limit(8).select('title slug images basePrice baseMrp ratings badges isFeatured').lean(),
      Brand.find({ isActive: true }).limit(12).select('name slug logoUrl').lean(),
      this.listPublicBanners('hero')
    ]);

    return [
      {
        _id: 'default-hero',
        sectionType: 'hero_banner',
        title: 'Timeless Quality, Everyday Comfort',
        subtitle: 'Explore our latest collection of premium products crafted for everyday life.',
        displayOrder: 1,
        isActive: true,
        data: heroBanners.length > 0 ? heroBanners : []
      },
      {
        _id: 'default-cats',
        sectionType: 'category_grid',
        title: 'Explore Popular Categories',
        subtitle: 'Find exactly what you are looking for',
        displayOrder: 2,
        isActive: true,
        data: categories
      },
      {
        _id: 'default-featured',
        sectionType: 'featured_products',
        title: 'Featured Collection',
        subtitle: 'Hand-picked design classics and bestsellers',
        displayOrder: 3,
        isActive: true,
        data: products
      },
      {
        _id: 'default-brands',
        sectionType: 'brand_showcase',
        title: 'Trusted Brand Partners',
        subtitle: 'Official warranty and verified authenticity',
        displayOrder: 4,
        isActive: true,
        data: brands
      }
    ];
  },

  async createSection(data, staffUser) {
    const section = await HomepageSection.create(data);

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'HOMEPAGE_SECTION_CREATED',
      resourceType: 'HomepageSection',
      resourceId: section._id,
      notes: `Created homepage section: ${section.sectionType} ("${section.title}")`
    });

    return section;
  },

  async updateSection(id, data, staffUser) {
    const section = await HomepageSection.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!section) throw ApiError.notFound('Homepage section not found');

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'HOMEPAGE_SECTION_UPDATED',
      resourceType: 'HomepageSection',
      resourceId: section._id,
      notes: `Updated homepage section: ${section.sectionType}`
    });

    return section;
  },

  async reorderSections(sectionsList, staffUser) {
    if (sectionsList && sectionsList.length > 0) {
      const bulkOps = sectionsList.map((item) => ({
        updateOne: {
          filter: { _id: item.id || item._id },
          update: { $set: { displayOrder: item.displayOrder } }
        }
      }));

      await HomepageSection.bulkWrite(bulkOps);
    }

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'HOMEPAGE_SECTIONS_REORDERED',
      resourceType: 'HomepageSection',
      notes: `Reordered ${(sectionsList || []).length} homepage sections`
    });

    const updatedSections = await HomepageSection.find({}).sort({ displayOrder: 1 }).lean();

    return { success: true, message: 'Sections reordered successfully', sections: updatedSections };
  },

  async deleteSection(id, staffUser) {
    const section = await HomepageSection.findByIdAndDelete(id);
    if (!section) throw ApiError.notFound('Homepage section not found');

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'HOMEPAGE_SECTION_DELETED',
      resourceType: 'HomepageSection',
      resourceId: id,
      notes: `Deleted homepage section: ${section.sectionType}`
    });

    return { success: true, message: 'Section removed successfully' };
  },

  // ==========================================
  // 3. CONTENT PAGES & POLICIES
  // ==========================================

  async listAdminPages({ page = 1, limit = 20, status, search } = {}) {
    const query = {};
    if (status) query.status = status;
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { slug: searchRegex }];
    }

    const skip = (page - 1) * limit;
    const [pages, total] = await Promise.all([
      ContentPage.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      ContentPage.countDocuments(query)
    ]);

    return {
      pages,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  async getPublicPageBySlug(slug) {
    const page = await ContentPage.findOne({ slug: slug.toLowerCase().trim(), status: 'published' }).lean();
    if (!page) {
      throw ApiError.notFound('Page not found or is currently in draft status');
    }
    return page;
  },

  async createPage(data, staffUser) {
    const cleanSlug = data.slug.toLowerCase().trim();
    const existing = await ContentPage.findOne({ slug: cleanSlug });
    if (existing) {
      throw ApiError.conflict(`A page with slug "${cleanSlug}" already exists`);
    }

    const cleanHtml = sanitizeHtml(data.content);
    const page = await ContentPage.create({
      ...data,
      slug: cleanSlug,
      content: cleanHtml,
      publishedAt: data.status === 'published' ? new Date() : null,
      revisions: [
        {
          title: data.title,
          content: cleanHtml,
          updatedBy: staffUser._id,
          updatedAt: new Date()
        }
      ]
    });

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'CONTENT_PAGE_CREATED',
      resourceType: 'ContentPage',
      resourceId: page._id,
      notes: `Created page: "${page.title}" (${page.slug})`
    });

    return page;
  },

  async updatePage(id, data, staffUser) {
    const page = await ContentPage.findById(id);
    if (!page) throw ApiError.notFound('Page not found');

    if (data.slug && data.slug.toLowerCase().trim() !== page.slug) {
      const cleanSlug = data.slug.toLowerCase().trim();
      const existing = await ContentPage.findOne({ slug: cleanSlug, _id: { $ne: id } });
      if (existing) throw ApiError.conflict(`Slug "${cleanSlug}" is already in use`);
      page.slug = cleanSlug;
    }

    if (data.title) page.title = data.title;
    // Record revision before mutating
    page.revisions.unshift({
      title: page.title,
      content: page.content,
      changeSummary: data.changeSummary || 'Page updated',
      updatedBy: staffUser._id,
      updatedAt: new Date()
    });
    if (page.revisions.length > 20) {
      page.revisions = page.revisions.slice(0, 20);
    }

    if (data.title) page.title = data.title;
    if (data.seoTitle !== undefined) page.seoTitle = data.seoTitle;
    if (data.seoDescription !== undefined) page.seoDescription = data.seoDescription;
    if (data.featuredImageUrl !== undefined) page.featuredImageUrl = data.featuredImageUrl;

    if (data.status && data.status !== page.status) {
      page.status = data.status;
      if (data.status === 'published' && !page.publishedAt) {
        page.publishedAt = new Date();
      }
    }

    if (data.content) {
      page.content = sanitizeHtml(data.content);
    }

    await page.save();

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'CONTENT_PAGE_UPDATED',
      resourceType: 'ContentPage',
      resourceId: page._id,
      notes: `Updated page: "${page.title}"`
    });

    return page;
  },

  async deletePage(id, staffUser) {
    const page = await ContentPage.findByIdAndDelete(id);
    if (!page) throw ApiError.notFound('Page not found');

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'CONTENT_PAGE_DELETED',
      resourceType: 'ContentPage',
      resourceId: id,
      notes: `Deleted page: "${page.title}" (${page.slug})`
    });

    return { success: true, message: 'Page deleted successfully' };
  },

  // ==========================================
  // 4. FAQ MANAGEMENT
  // ==========================================

  async listAdminFaqs({ category, search } = {}) {
    const query = {};
    if (category) query.category = category;
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ question: searchRegex }, { answer: searchRegex }];
    }

    return FAQ.find(query).sort({ category: 1, displayOrder: 1, createdAt: -1 }).lean();
  },

  async listPublicFaqs() {
    const faqs = await FAQ.find({ isActive: true }).sort({ category: 1, displayOrder: 1 }).lean();

    // Group FAQs by category for accordion UI
    const grouped = {};
    faqs.forEach((faq) => {
      const cat = faq.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(faq);
    });

    return {
      total: faqs.length,
      grouped,
      groupedFaqs: grouped
    };
  },

  async createFaq(data, staffUser) {
    const faq = await FAQ.create(data);

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'FAQ_CREATED',
      resourceType: 'FAQ',
      resourceId: faq._id,
      notes: `Created FAQ in [${faq.category}]: "${faq.question}"`
    });

    return faq;
  },

  async updateFaq(id, data, staffUser) {
    const faq = await FAQ.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!faq) throw ApiError.notFound('FAQ item not found');

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'FAQ_UPDATED',
      resourceType: 'FAQ',
      resourceId: faq._id,
      notes: `Updated FAQ: "${faq.question}"`
    });

    return faq;
  },

  async deleteFaq(id, staffUser) {
    const faq = await FAQ.findByIdAndDelete(id);
    if (!faq) throw ApiError.notFound('FAQ item not found');

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'FAQ_DELETED',
      resourceType: 'FAQ',
      resourceId: id,
      notes: `Deleted FAQ: "${faq.question}"`
    });

    return { success: true, message: 'FAQ deleted successfully' };
  },

  // ==========================================
  // 5. STORE SETTINGS & NAVIGATION
  // ==========================================

  async getStoreSettings() {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = await StoreSettings.create({});
    }
    return settings;
  },

  async getPublicStoreSettings() {
    const settings = await this.getStoreSettings();
    const doc = settings.toJSON ? settings.toJSON() : settings;

    // Filter out internal and private operational config
    return {
      storeName: doc.storeName,
      tagline: doc.tagline,
      logoUrl: doc.logoUrl,
      faviconUrl: doc.faviconUrl,
      contactEmail: doc.contactEmail,
      contactPhone: doc.contactPhone,
      supportHours: doc.supportHours,
      address: doc.address,
      socialLinks: doc.socialLinks,
      currency: doc.currency,
      shipping: doc.shipping,
      shippingPolicy: doc.shipping,
      cod: {
        enabled: doc.cod?.enabled,
        minOrderValue: doc.cod?.minOrderValue,
        maxOrderValue: doc.cod?.maxOrderValue
      },
      codSettings: {
        enabled: doc.cod?.enabled,
        minOrderValue: doc.cod?.minOrderValue,
        maxOrderValue: doc.cod?.maxOrderValue
      },
      seo: doc.seo,
      maintenanceMode: doc.maintenanceMode,
      headerNavigation: doc.headerNavigation,
      footerColumns: doc.footerColumns
    };
  },

  async updateStoreSettings(data, staffUser) {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = await StoreSettings.create(data);
    } else {
      settings = await StoreSettings.findByIdAndUpdate(settings._id, { $set: data }, { new: true, runValidators: true });
    }

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'STORE_SETTINGS_UPDATED',
      resourceType: 'StoreSettings',
      resourceId: settings._id,
      notes: 'Storefront configurations and operational rules updated'
    });

    return settings;
  },

  async getWhatsNewData() {
    const settings = await this.getStoreSettings();
    const config = settings.whatsNewPageConfig || {
      heroBanner: { enabled: true },
      newBrands: { enabled: true },
      justDropped: { enabled: true },
      onlyOnMosmac: { enabled: true },
      trendingNow: { enabled: true }
    };

    const results = {
      config,
      heroBanner: config.heroBanner || null,
      newBrands: [],
      justDropped: [],
      onlyOnMosmac: [],
      trendingNow: [],
      categories: []
    };

    const tasks = [];

    // Categories for filter pills
    tasks.push(
      Category.find({ isActive: true, parentId: null })
        .sort({ displayOrder: 1 })
        .select('name slug')
        .lean()
        .then((cats) => { results.categories = cats; })
    );

    // New Brands
    if (config.newBrands?.enabled !== false) {
      tasks.push(
        Brand.find({ isActive: true })
          .sort({ isNewlyAdded: -1, createdAt: -1 })
          .limit(8)
          .select('name slug logoUrl description isNewlyAdded')
          .lean()
          .then((brands) => { results.newBrands = brands; })
      );
    }

    // Helper to query products based on admin category -> subcategory -> specific products selection
    const resolveSectionProducts = async (sectionConfig, defaultFilter = {}, defaultSort = { createdAt: -1 }, limit = 12) => {
      if (sectionConfig?.productIds && sectionConfig.productIds.length > 0) {
        const prods = await Product.find({
          _id: { $in: sectionConfig.productIds },
          status: 'published'
        })
          .populate('brandId', 'name slug logoUrl')
          .populate('categoryId', 'name slug')
          .lean();
        if (prods.length > 0) return prods;
      }

      const query = { status: 'published', ...defaultFilter };

      if (sectionConfig?.subcategoryId) {
        query.categoryId = sectionConfig.subcategoryId;
      } else if (sectionConfig?.categoryId) {
        const descendantCategories = await Category.find({
          $or: [{ 'ancestors._id': sectionConfig.categoryId }, { parentId: sectionConfig.categoryId }]
        }).select('_id');
        query.categoryId = { $in: [sectionConfig.categoryId, ...descendantCategories.map((c) => c._id)] };
      }

      return Product.find(query)
        .sort(defaultSort)
        .limit(sectionConfig?.limit || limit)
        .populate('brandId', 'name slug logoUrl')
        .populate('categoryId', 'name slug')
        .lean();
    };

    // Just Dropped (latest published products or curated selection)
    if (config.justDropped?.enabled !== false) {
      tasks.push(
        resolveSectionProducts(config.justDropped, {}, { createdAt: -1 }, 12).then((prods) => {
          results.justDropped = prods;
        })
      );
    }

    // Only On MOSMAC (Exclusives or curated selection)
    if (config.onlyOnMosmac?.enabled !== false) {
      tasks.push(
        resolveSectionProducts(
          config.onlyOnMosmac,
          {
            $or: [
              { badges: { $in: ['EXCLUSIVE', 'ONLY ON MOSMAC', 'NEW'] } },
              { isFeatured: true }
            ]
          },
          { ratingsAverage: -1, createdAt: -1 },
          10
        ).then((prods) => {
          results.onlyOnMosmac = prods.length > 0 ? prods : (results.justDropped || []).slice(0, 6);
        })
      );
    }

    // Trending Now (Synced with Admin Homepage Section: 'trending')
    if (config.trendingNow?.enabled !== false) {
      tasks.push(
        (async () => {
          try {
            const trendingSec = await HomepageSection.findOne({ slug: 'trending' });
            if (trendingSec) {
              const assignments = await HomepageSectionProduct.find({ sectionId: trendingSec._id })
                .sort({ displayOrder: 1 })
                .populate({
                  path: 'productId',
                  match: { status: 'published' },
                  populate: [
                    { path: 'brandId', select: 'name slug logoUrl' },
                    { path: 'categoryId', select: 'name slug' }
                  ]
                })
                .lean();

              const assignedProds = assignments.map((a) => a.productId).filter(Boolean);
              if (assignedProds.length > 0) {
                results.trendingNow = assignedProds.slice(0, config.trendingNow?.limit || 8);
                return;
              }
            }
          } catch (e) {
            console.error('Error fetching admin trending section products:', e);
          }

          const fallbackProds = await resolveSectionProducts(config.trendingNow, {}, { 'ratings.average': -1, createdAt: -1 }, 8);
          results.trendingNow = fallbackProds;
        })()
      );
    }

    await Promise.all(tasks);
    return results;
  },

  async getAdminWhatsNewConfig() {
    const settings = await this.getStoreSettings();
    return settings.whatsNewPageConfig;
  },

  async updateAdminWhatsNewConfig(newConfig, staffUser) {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = await StoreSettings.create({ whatsNewPageConfig: newConfig });
    } else {
      settings.whatsNewPageConfig = {
        ...settings.whatsNewPageConfig,
        ...newConfig
      };
      settings.markModified('whatsNewPageConfig');
      await settings.save();
    }

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'WHATS_NEW_PAGE_CONFIG_UPDATED',
      resourceType: 'StoreSettings',
      resourceId: settings._id,
      notes: "What's New page sections & banner configuration updated"
    });

    return settings.whatsNewPageConfig;
  }
};

export default cmsService;
