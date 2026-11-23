import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { HomepageSection } from '../models/HomepageSection.js';
import { HomepageSectionProduct } from '../models/HomepageSectionProduct.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { ApiError } from '../utils/ApiError.js';
import { auditService } from './auditService.js';

export const DEFAULT_HOMEPAGE_SECTIONS = [
  {
    name: 'Trending Products',
    slug: 'trending',
    description: 'Products currently trending across the store with high consumer interest.',
    heading: 'Trending Right Now',
    subtitle: 'Handpicked beauty essentials trending across India this week',
    type: 'product_grid',
    isDefault: true,
    isActive: true,
    maxProducts: 8,
    displayPosition: 1,
    showViewAll: true,
    viewAllLink: '/products?trending=true'
  },
  {
    name: 'Bestsellers',
    slug: 'bestsellers',
    description: 'All-time bestselling cosmetic products loved by repeat customers.',
    heading: 'Bestselling Icons',
    subtitle: 'Our most-purchased, highly reviewed formulas that never disappoint',
    type: 'product_grid',
    isDefault: true,
    isActive: true,
    maxProducts: 8,
    displayPosition: 2,
    showViewAll: true,
    viewAllLink: '/products?bestseller=true'
  },
  {
    name: 'Most Loved',
    slug: 'most_loved',
    description: 'Top customer-rated items with glowing reviews and recommendations.',
    heading: 'Most Loved & Top Rated',
    subtitle: 'Customer favorites backed by genuine, verified 5-star reviews',
    type: 'product_grid',
    isDefault: true,
    isActive: true,
    maxProducts: 8,
    displayPosition: 3,
    showViewAll: true,
    viewAllLink: '/products?sort=rating'
  },
  {
    name: 'Featured Products',
    slug: 'featured',
    description: 'Handpicked flagship formulas and spotlight beauty launches.',
    heading: 'Featured Collection',
    subtitle: 'Handcrafted formulas, dermatologically tested and certified genuine',
    type: 'product_grid',
    isDefault: true,
    isActive: true,
    maxProducts: 8,
    displayPosition: 4,
    showViewAll: true,
    viewAllLink: '/products?featured=true'
  },
  {
    name: "What's New",
    slug: 'whats_new',
    description: 'Fresh product drops and latest makeup and skincare arrivals.',
    heading: "What's New & Fresh Drops",
    subtitle: 'Explore newly launched cosmetics, skincare, and seasonal shades',
    type: 'product_grid',
    isDefault: true,
    isActive: true,
    maxProducts: 8,
    displayPosition: 5,
    showViewAll: true,
    viewAllLink: '/whats-new'
  },
  {
    name: 'Offers & Deals',
    slug: 'offers_deals',
    description: 'Curated promotional offers, discounted essentials, and limited-time deals.',
    heading: 'Offers & Exclusive Deals',
    subtitle: 'Premium beauty and cosmetic essentials at special discounted prices',
    type: 'product_grid',
    isDefault: true,
    isActive: true,
    maxProducts: 12,
    displayPosition: 6,
    showViewAll: true,
    viewAllLink: '/products?section=offers_deals'
  },
  {
    name: 'MOSMAC Select',
    slug: 'mosmac_select',
    description: 'Exclusive MOSMAC premium picks, signature collections, and editor favorites.',
    heading: 'MOSMAC Select',
    subtitle: 'Handpicked signature selections and certified luxury cosmetic picks',
    type: 'product_grid',
    isDefault: true,
    isActive: true,
    maxProducts: 12,
    displayPosition: 7,
    showViewAll: true,
    viewAllLink: '/products?section=mosmac_select'
  }
];

export const homepageSectionService = {
  /**
   * Automatically initializes the default sections if they do not exist
   * and seeds initial published products so the storefront has live data immediately.
   */
  async ensureDefaultSections() {
    const defaultSlugs = DEFAULT_HOMEPAGE_SECTIONS.map((s) => s.slug);
    const existing = await HomepageSection.find({ slug: { $in: defaultSlugs } });
    const existingSlugs = new Set(existing.map((s) => s.slug));

    for (const def of DEFAULT_HOMEPAGE_SECTIONS) {
      if (!existingSlugs.has(def.slug)) {
        try {
          const created = await HomepageSection.create({
            ...def,
            title: def.heading,
            displayOrder: def.displayPosition,
            sectionType: def.slug
          });
          existing.push(created);
        } catch (e) {
          // If concurrent create or slug already exists, ignore
        }
      }
    }

    // Check if sections have assigned products; if 0, assign published products
    for (const sec of existing) {
      const count = await HomepageSectionProduct.countDocuments({ sectionId: sec._id });
      if (count === 0) {
        let filter = { status: 'published' };
        if (sec.slug === 'featured') {
          filter = { status: 'published', isFeatured: true };
        } else if (sec.slug === 'bestsellers') {
          filter = { status: 'published', badges: 'BESTSELLER' };
        } else if (sec.slug === 'trending') {
          filter = { status: 'published', badges: 'TRENDING' };
        } else if (sec.slug === 'offers_deals') {
          filter = { status: 'published', $expr: { $gt: ['$baseMrp', '$basePrice'] } };
        } else if (sec.slug === 'mosmac_select') {
          filter = { status: 'published', isFeatured: true };
        }

        let candidates = await Product.find(filter).limit(sec.maxProducts || 8).select('_id');
        if (candidates.length < 4) {
          candidates = await Product.find({ status: 'published' }).limit(sec.maxProducts || 8).select('_id');
        }

        if (candidates.length > 0) {
          const ops = candidates.map((p, idx) => ({
            sectionId: sec._id,
            productId: p._id,
            displayOrder: idx + 1
          }));

          try {
            await HomepageSectionProduct.insertMany(ops, { ordered: false });
            // Sync legacy productIds array on HomepageSection
            await HomepageSection.findByIdAndUpdate(sec._id, {
              $set: { 'config.productIds': candidates.map((p) => p._id) }
            });
          } catch (e) {
            // Ignore unique constraint collisions
          }
        }
      }
    }
  },

  /**
   * Lists all homepage sections for the admin console with product counts
   */
  async listAdminSections() {
    await this.ensureDefaultSections();

    const sections = await HomepageSection.find({}).sort({ displayPosition: 1, createdAt: 1 }).lean();

    // Fetch product counts for each section
    const counts = await HomepageSectionProduct.aggregate([
      { $group: { _id: '$sectionId', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    return sections.map((sec) => ({
      ...sec,
      productCount: countMap.get(sec._id.toString()) || 0
    }));
  },

  /**
   * Gets a single section by ID or slug
   */
  async getSectionById(idOrSlug) {
    let section = null;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      section = await HomepageSection.findById(idOrSlug).lean();
    }
    if (!section) {
      section = await HomepageSection.findOne({ slug: idOrSlug.toLowerCase() }).lean();
    }
    if (!section) {
      throw ApiError.notFound('Homepage section not found');
    }

    const productCount = await HomepageSectionProduct.countDocuments({ sectionId: section._id });
    return { ...section, productCount };
  },

  /**
   * Creates a new custom homepage section
   */
  async createSection(data, staffUser) {
    const rawSlug = (data.slug || data.name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_');

    if (!rawSlug) {
      throw ApiError.badRequest('A valid unique section slug or name is required');
    }

    const existing = await HomepageSection.findOne({ slug: rawSlug });
    if (existing) {
      throw ApiError.conflict(`A section with identifier '${rawSlug}' already exists`);
    }

    // Determine default display position
    let position = data.displayPosition;
    if (position === undefined || position === null) {
      const highest = await HomepageSection.findOne({}).sort({ displayPosition: -1 }).select('displayPosition');
      position = (highest?.displayPosition || 0) + 1;
    }

    const section = await HomepageSection.create({
      name: data.name,
      slug: rawSlug,
      description: data.description || '',
      heading: data.heading || data.name,
      subtitle: data.subtitle || '',
      type: data.type || 'product_grid',
      isDefault: false,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      maxProducts: Number(data.maxProducts) || 8,
      displayPosition: position,
      showViewAll: data.showViewAll !== undefined ? Boolean(data.showViewAll) : true,
      viewAllLink: data.viewAllLink || '',
      title: data.heading || data.name,
      displayOrder: position,
      sectionType: rawSlug
    });

    if (staffUser) {
      await auditService.log({
        actorId: staffUser._id,
        actorRole: staffUser.role,
        actorEmail: staffUser.email,
        action: 'HOMEPAGE_SECTION_CREATED',
        resourceType: 'HomepageSection',
        resourceId: section._id,
        notes: `Created custom homepage section '${section.name}' (${section.slug})`
      });
    }

    return section;
  },

  /**
   * Updates an existing section's details and settings
   */
  async updateSection(id, data, staffUser) {
    const section = await HomepageSection.findById(id);
    if (!section) {
      throw ApiError.notFound('Homepage section not found');
    }

    // Prevent changing slug of default sections
    if (data.slug && data.slug !== section.slug) {
      if (section.isDefault) {
        throw ApiError.badRequest('Section identifier cannot be changed for default system sections');
      }
      const existing = await HomepageSection.findOne({ slug: data.slug.toLowerCase().trim(), _id: { $ne: id } });
      if (existing) {
        throw ApiError.conflict(`Section identifier '${data.slug}' is already in use`);
      }
      section.slug = data.slug.toLowerCase().trim();
      section.sectionType = section.slug;
    }

    if (data.name !== undefined) section.name = data.name;
    if (data.description !== undefined) section.description = data.description;
    if (data.heading !== undefined) {
      section.heading = data.heading;
      section.title = data.heading;
    }
    if (data.subtitle !== undefined) section.subtitle = data.subtitle;
    if (data.type !== undefined) section.type = data.type;
    if (data.isActive !== undefined) section.isActive = Boolean(data.isActive);
    if (data.maxProducts !== undefined) section.maxProducts = Math.max(1, Math.min(50, Number(data.maxProducts)));
    if (data.displayPosition !== undefined) {
      section.displayPosition = Number(data.displayPosition);
      section.displayOrder = Number(data.displayPosition);
    }
    if (data.showViewAll !== undefined) section.showViewAll = Boolean(data.showViewAll);
    if (data.viewAllLink !== undefined) section.viewAllLink = data.viewAllLink;

    await section.save();

    if (staffUser) {
      await auditService.log({
        actorId: staffUser._id,
        actorRole: staffUser.role,
        actorEmail: staffUser.email,
        action: 'HOMEPAGE_SECTION_UPDATED',
        resourceType: 'HomepageSection',
        resourceId: section._id,
        notes: `Updated homepage section '${section.name}' (${section.slug})`
      });
    }

    return section;
  },

  /**
   * Toggles the active status of a section
   */
  async toggleSectionStatus(id, isActive, staffUser) {
    const section = await HomepageSection.findByIdAndUpdate(
      id,
      { $set: { isActive: Boolean(isActive) } },
      { new: true }
    );
    if (!section) {
      throw ApiError.notFound('Homepage section not found');
    }

    if (staffUser) {
      await auditService.log({
        actorId: staffUser._id,
        actorRole: staffUser.role,
        actorEmail: staffUser.email,
        action: 'HOMEPAGE_SECTION_STATUS_TOGGLED',
        resourceType: 'HomepageSection',
        resourceId: section._id,
        notes: `Set section '${section.name}' status to ${section.isActive ? 'ACTIVE' : 'INACTIVE'}`
      });
    }

    return section;
  },

  /**
   * Deletes a custom homepage section
   */
  async deleteSection(id, staffUser) {
    const section = await HomepageSection.findById(id);
    if (!section) {
      throw ApiError.notFound('Homepage section not found');
    }

    if (section.isDefault) {
      throw ApiError.badRequest('Default system sections cannot be deleted. You can disable them instead.');
    }

    await Promise.all([
      HomepageSection.findByIdAndDelete(id),
      HomepageSectionProduct.deleteMany({ sectionId: id })
    ]);

    if (staffUser) {
      await auditService.log({
        actorId: staffUser._id,
        actorRole: staffUser.role,
        actorEmail: staffUser.email,
        action: 'HOMEPAGE_SECTION_DELETED',
        resourceType: 'HomepageSection',
        resourceId: id,
        notes: `Deleted custom homepage section '${section.name}' (${section.slug})`
      });
    }

    return { success: true, message: `Section '${section.name}' deleted successfully` };
  },

  /**
   * Reorders multiple sections
   */
  async reorderSections(sectionsList, staffUser) {
    if (!Array.isArray(sectionsList) || sectionsList.length === 0) {
      throw ApiError.badRequest('sections array is required for reordering');
    }

    const bulkOps = sectionsList.map((item, index) => {
      const position = item.displayPosition !== undefined ? Number(item.displayPosition) : index + 1;
      return {
        updateOne: {
          filter: { _id: item.id || item._id },
          update: { $set: { displayPosition: position, displayOrder: position } }
        }
      };
    });

    await HomepageSection.bulkWrite(bulkOps);

    if (staffUser) {
      await auditService.log({
        actorId: staffUser._id,
        actorRole: staffUser.role,
        actorEmail: staffUser.email,
        action: 'HOMEPAGE_SECTIONS_REORDERED',
        resourceType: 'HomepageSection',
        notes: `Reordered ${sectionsList.length} homepage sections`
      });
    }

    return this.listAdminSections();
  },

  // =========================================================================
  // PRODUCT ASSIGNMENT METHODS
  // =========================================================================

  /**
   * Gets assigned products for a section with full product details
   */
  async getSectionProducts(sectionId) {
    const section = await this.getSectionById(sectionId);

    const assignments = await HomepageSectionProduct.find({ sectionId: section._id })
      .sort({ displayOrder: 1, createdAt: 1 })
      .populate({
        path: 'productId',
        select: 'title slug images basePrice baseMrp status variants categoryId brandId ratings badges isFeatured',
        populate: [
          { path: 'categoryId', select: 'name slug' },
          { path: 'brandId', select: 'name slug' }
        ]
      })
      .lean();

    return assignments
      .filter((a) => a.productId) // Guard against dangling references
      .map((a) => {
        const prod = a.productId;
        const defaultVariant = prod.variants?.[0] || {};
        const primaryImage = prod.images?.find((img) => img.isPrimary)?.url || prod.images?.[0]?.url || '';
        const price = prod.basePrice ? prod.basePrice / 100 : defaultVariant.price ? defaultVariant.price / 100 : 0;
        const mrp = prod.baseMrp ? prod.baseMrp / 100 : defaultVariant.mrp ? defaultVariant.mrp / 100 : 0;

        return {
          _id: prod._id,
          id: prod._id,
          assignmentId: a._id,
          displayOrder: a.displayOrder,
          productId: prod._id,
          title: prod.title,
          slug: prod.slug,
          sku: defaultVariant.sku || 'N/A',
          category: prod.categoryId?.name || 'General',
          brand: prod.brandId?.name || '',
          price,
          mrp,
          status: prod.status,
          image: primaryImage,
          imageUrl: primaryImage,
          images: prod.images || [],
          badges: prod.badges || [],
          isFeatured: prod.isFeatured || false,
          ratings: prod.ratings
        };
      });
  },

  /**
   * Assigns products to a section
   */
  async assignProducts(sectionId, { productIds = [], productSkus = [] }, staffUser) {
    const section = await this.getSectionById(sectionId);

    let targetIds = [...productIds];

    if (productSkus && productSkus.length > 0) {
      const skuProds = await Product.find({ 'variants.sku': { $in: productSkus.map((s) => s.toUpperCase().trim()) } }).select('_id');
      targetIds.push(...skuProds.map((p) => p._id.toString()));
    }

    targetIds = [...new Set(targetIds.filter(Boolean))];

    if (targetIds.length === 0) {
      throw ApiError.badRequest('Please provide at least one valid product ID or SKU to assign');
    }

    // Verify products exist
    const validProducts = await Product.find({ _id: { $in: targetIds } }).select('_id');
    const validIdSet = new Set(validProducts.map((p) => p._id.toString()));

    // Get existing assignments to prevent duplicates
    const existing = await HomepageSectionProduct.find({ sectionId: section._id }).select('productId displayOrder');
    const existingProdIds = new Set(existing.map((e) => e.productId.toString()));
    let maxOrder = existing.reduce((max, e) => Math.max(max, e.displayOrder || 0), 0);

    const toInsert = [];
    for (const pid of targetIds) {
      if (validIdSet.has(pid) && !existingProdIds.has(pid)) {
        maxOrder += 1;
        toInsert.push({
          sectionId: section._id,
          productId: pid,
          displayOrder: maxOrder
        });
      }
    }

    if (toInsert.length > 0) {
      await HomepageSectionProduct.insertMany(toInsert, { ordered: false });

      // Sync legacy config
      const allCurrent = await HomepageSectionProduct.find({ sectionId: section._id }).sort({ displayOrder: 1 });
      await HomepageSection.findByIdAndUpdate(section._id, {
        $set: { 'config.productIds': allCurrent.map((a) => a.productId) }
      });
    }

    if (staffUser) {
      await auditService.log({
        actorId: staffUser._id,
        actorRole: staffUser.role,
        actorEmail: staffUser.email,
        action: 'HOMEPAGE_SECTION_PRODUCTS_ASSIGNED',
        resourceType: 'HomepageSection',
        resourceId: section._id,
        notes: `Assigned ${toInsert.length} products to section '${section.name}'`
      });
    }

    return this.getSectionProducts(section._id);
  },

  /**
   * Replaces the entire list of products and their exact display order for a section
   */
  async updateSectionProducts(sectionId, productsList, staffUser) {
    const section = await this.getSectionById(sectionId);

    if (!Array.isArray(productsList)) {
      throw ApiError.badRequest('products must be an array of { productId, displayOrder }');
    }

    // Validate no duplicates in incoming payload
    const seen = new Set();
    const cleanList = [];
    for (let i = 0; i < productsList.length; i++) {
      const item = productsList[i];
      const pid = item.productId || item.id || item._id;
      if (!pid) continue;
      const pidStr = pid.toString();
      if (!seen.has(pidStr)) {
        seen.add(pidStr);
        cleanList.push({
          sectionId: section._id,
          productId: pidStr,
          displayOrder: item.displayOrder !== undefined ? Number(item.displayOrder) : i + 1
        });
      }
    }

    // Delete existing and insert new
    await HomepageSectionProduct.deleteMany({ sectionId: section._id });

    if (cleanList.length > 0) {
      await HomepageSectionProduct.insertMany(cleanList, { ordered: true });
    }

    // Sync legacy config
    await HomepageSection.findByIdAndUpdate(section._id, {
      $set: { 'config.productIds': cleanList.map((c) => c.productId) }
    });

    if (staffUser) {
      await auditService.log({
        actorId: staffUser._id,
        actorRole: staffUser.role,
        actorEmail: staffUser.email,
        action: 'HOMEPAGE_SECTION_PRODUCTS_UPDATED',
        resourceType: 'HomepageSection',
        resourceId: section._id,
        notes: `Updated all ${cleanList.length} products and display orders for '${section.name}'`
      });
    }

    return this.getSectionProducts(section._id);
  },

  /**
   * Removes a product assignment from a section
   */
  async removeProductFromSection(sectionId, productId, staffUser) {
    const section = await this.getSectionById(sectionId);

    await HomepageSectionProduct.deleteOne({ sectionId: section._id, productId });

    // Sync legacy config
    const remaining = await HomepageSectionProduct.find({ sectionId: section._id }).sort({ displayOrder: 1 });
    await HomepageSection.findByIdAndUpdate(section._id, {
      $set: { 'config.productIds': remaining.map((r) => r.productId) }
    });

    if (staffUser) {
      await auditService.log({
        actorId: staffUser._id,
        actorRole: staffUser.role,
        actorEmail: staffUser.email,
        action: 'HOMEPAGE_SECTION_PRODUCT_REMOVED',
        resourceType: 'HomepageSection',
        resourceId: section._id,
        notes: `Removed product ${productId} from section '${section.name}'`
      });
    }

    return { success: true, message: 'Product removed from section' };
  },

  /**
   * Search catalog for product selector
   */
  async searchProducts({ query = '', category = '', brand = '', status = '', page = 1, limit = 10 } = {}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (p - 1) * l;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.categoryId = category;
      } else {
        const cat = await Category.findOne({ slug: category.toLowerCase().trim() });
        if (cat) filter.categoryId = cat._id;
      }
    }

    if (brand) {
      if (mongoose.Types.ObjectId.isValid(brand)) {
        filter.brandId = brand;
      } else {
        const b = await Brand.findOne({ slug: brand.toLowerCase().trim() });
        if (b) filter.brandId = b._id;
      }
    }

    if (query && query.trim()) {
      const q = query.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
        { 'variants.sku': { $regex: q, $options: 'i' } }
      ];
      if (mongoose.Types.ObjectId.isValid(q)) {
        filter.$or.push({ _id: q });
      }
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .populate('categoryId', 'name slug')
        .populate('brandId', 'name slug')
        .lean(),
      Product.countDocuments(filter)
    ]);

    const formatted = products.map((prod) => {
      const defaultVariant = prod.variants?.[0] || {};
      const primaryImage = prod.images?.find((img) => img.isPrimary)?.url || prod.images?.[0]?.url || '';
      const price = prod.basePrice ? prod.basePrice / 100 : defaultVariant.price ? defaultVariant.price / 100 : 0;
      const mrp = prod.baseMrp ? prod.baseMrp / 100 : defaultVariant.mrp ? defaultVariant.mrp / 100 : 0;

      return {
        _id: prod._id,
        title: prod.title,
        slug: prod.slug,
        sku: defaultVariant.sku || 'N/A',
        category: prod.categoryId?.name || 'General',
        brand: prod.brandId?.name || '',
        price,
        mrp,
        status: prod.status,
        image: primaryImage,
        imageUrl: primaryImage,
        images: prod.images || [],
        stockQuantity: defaultVariant.stockQuantity || 0
      };
    });

    return {
      products: formatted,
      total,
      page: p,
      limit: l,
      pages: Math.ceil(total / l)
    };
  },

  // =========================================================================
  // EXCEL IMPORT & EXPORT METHODS
  // =========================================================================

  /**
   * Generates a sample Excel template with instructions and sample rows
   */
  async generateSampleExcel() {
    await this.ensureDefaultSections();
    const sections = await HomepageSection.find({}).select('name slug').lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mosmac Admin Platform';
    workbook.created = new Date();

    // 1. Data Sheet
    const sheet = workbook.addWorksheet('Section Products', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Section Identifier', key: 'sectionSlug', width: 22 },
      { header: 'Product SKU', key: 'productSku', width: 22 },
      { header: 'Display Order', key: 'displayOrder', width: 16 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Find real sample SKUs from database to make the sample instantly valid
    const realProducts = await Product.find({ status: 'published' }).limit(6).select('variants.sku');
    const realSkus = [];
    realProducts.forEach((p) => {
      p.variants?.forEach((v) => {
        if (v.sku && !realSkus.includes(v.sku)) realSkus.push(v.sku);
      });
    });

    const sampleRows = [
      { sectionSlug: 'trending', productSku: realSkus[0] || 'SKU012', displayOrder: 1 },
      { sectionSlug: 'trending', productSku: realSkus[1] || 'SKU002', displayOrder: 2 },
      { sectionSlug: 'bestsellers', productSku: realSkus[2] || 'SKU009', displayOrder: 1 },
      { sectionSlug: 'featured', productSku: realSkus[3] || 'SKU018', displayOrder: 1 },
      { sectionSlug: 'whats_new', productSku: realSkus[4] || 'SKU040', displayOrder: 1 },
      { sectionSlug: 'most_loved', productSku: realSkus[5] || 'SKU012', displayOrder: 1 }
    ];

    sampleRows.forEach((row) => sheet.addRow(row));

    // 2. Instructions & Reference Sheet
    const infoSheet = workbook.addWorksheet('Available Sections Reference');
    infoSheet.columns = [
      { header: 'Section Name', key: 'name', width: 25 },
      { header: 'Section Identifier (Slug)', key: 'slug', width: 25 },
      { header: 'Instructions', key: 'instructions', width: 45 }
    ];

    infoSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    infoSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' }
    };

    sections.forEach((s) => {
      infoSheet.addRow({
        name: s.name,
        slug: s.slug,
        instructions: `Use exact identifier "${s.slug}" in Section Identifier column`
      });
    });

    return workbook.xlsx.writeBuffer();
  },

  /**
   * Pre-validates an uploaded Excel file and returns an import preview report
   */
  async validateExcelImport(buffer) {
    if (!buffer) {
      throw ApiError.badRequest('Excel file buffer is required');
    }

    await this.ensureDefaultSections();
    const sections = await HomepageSection.find({}).select('_id slug name').lean();
    const sectionMap = new Map();
    sections.forEach((s) => {
      sectionMap.set(s.slug.toLowerCase().trim(), s);
      sectionMap.set(s._id.toString(), s);
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet(1);
    if (!sheet) {
      throw ApiError.badRequest('Excel workbook is empty or has no sheets');
    }

    const rows = [];
    const headerRow = sheet.getRow(1);
    const colMap = {};

    headerRow.eachCell((cell, colNumber) => {
      const val = String(cell.value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (val.includes('section')) colMap.sectionSlug = colNumber;
      else if (val.includes('sku')) colMap.productSku = colNumber;
      else if (val.includes('order') || val.includes('position')) colMap.displayOrder = colNumber;
    });

    if (!colMap.sectionSlug || !colMap.productSku) {
      throw ApiError.badRequest(
        'Invalid Excel template headers. Required columns: "Section Identifier" and "Product SKU".'
      );
    }

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const secVal = String(row.getCell(colMap.sectionSlug).value || '').trim();
      const skuVal = String(row.getCell(colMap.productSku).value || '').trim().toUpperCase();
      const orderVal = colMap.displayOrder ? parseInt(row.getCell(colMap.displayOrder).value, 10) : NaN;

      if (secVal || skuVal) {
        rows.push({
          rowNumber,
          sectionSlug: secVal.toLowerCase(),
          productSku: skuVal,
          displayOrder: isNaN(orderVal) ? rowNumber - 1 : orderVal
        });
      }
    });

    if (rows.length === 0) {
      throw ApiError.badRequest('No data rows found in the uploaded Excel file');
    }

    // Lookup all SKUs from Product database
    const allSkus = [...new Set(rows.map((r) => r.productSku).filter(Boolean))];
    const products = await Product.find({ 'variants.sku': { $in: allSkus } }).select('_id title variants.sku status').lean();

    const skuMap = new Map();
    products.forEach((p) => {
      p.variants?.forEach((v) => {
        if (v.sku) {
          skuMap.set(v.sku.toUpperCase().trim(), {
            productId: p._id,
            title: p.title,
            status: p.status
          });
        }
      });
    });

    const errors = [];
    const validRows = [];
    const seenSectionProduct = new Set();
    let duplicateRecords = 0;
    let productsNotFound = 0;
    let unknownSections = 0;

    rows.forEach((r) => {
      let isRowValid = true;

      // 1. Check Section Identifier
      const section = sectionMap.get(r.sectionSlug);
      if (!section) {
        unknownSections += 1;
        isRowValid = false;
        errors.push({
          row: r.rowNumber,
          column: 'Section Identifier',
          value: r.sectionSlug,
          reason: `Unknown section identifier '${r.sectionSlug}'. Check the reference sheet.`
        });
      }

      // 2. Check SKU existence
      const prod = skuMap.get(r.productSku);
      if (!prod) {
        productsNotFound += 1;
        isRowValid = false;
        errors.push({
          row: r.rowNumber,
          column: 'Product SKU',
          value: r.productSku,
          reason: `Product SKU '${r.productSku}' was not found in the product catalogue.`
        });
      }

      // 3. Check duplicate assignments inside the same section in the file
      if (section && prod) {
        const comboKey = `${section._id.toString()}_${prod.productId.toString()}`;
        if (seenSectionProduct.has(comboKey)) {
          duplicateRecords += 1;
          isRowValid = false;
          errors.push({
            row: r.rowNumber,
            column: 'Product SKU',
            value: r.productSku,
            reason: `Duplicate assignment: SKU '${r.productSku}' is listed multiple times for section '${section.name}'.`
          });
        } else {
          seenSectionProduct.add(comboKey);
        }
      }

      if (isRowValid && section && prod) {
        validRows.push({
          rowNumber: r.rowNumber,
          sectionId: section._id,
          sectionSlug: section.slug,
          sectionName: section.name,
          productId: prod.productId,
          productTitle: prod.title,
          productSku: r.productSku,
          displayOrder: r.displayOrder
        });
      }
    });

    return {
      totalRows: rows.length,
      validRows: validRows.length,
      invalidRows: rows.length - validRows.length,
      duplicateRecords,
      productsNotFound,
      unknownSections,
      errors,
      validItems: validRows
    };
  },

  /**
   * Executes the validated import with chosen mode (replace or append)
   */
  async executeExcelImport({ validItems = [], mode = 'replace' }, staffUser) {
    if (!validItems || validItems.length === 0) {
      throw ApiError.badRequest('No valid rows to import');
    }

    const modeNormalized = mode === 'append' ? 'append' : 'replace';

    // Group valid items by sectionId
    const bySection = new Map();
    validItems.forEach((item) => {
      const sId = item.sectionId.toString();
      if (!bySection.has(sId)) bySection.set(sId, []);
      bySection.get(sId).push(item);
    });

    let totalImported = 0;
    const affectedSectionNames = [];

    for (const [sectionId, items] of bySection.entries()) {
      const section = await HomepageSection.findById(sectionId);
      if (!section) continue;

      affectedSectionNames.push(section.name);

      if (modeNormalized === 'replace') {
        // Replace mode: wipe existing assignments for this section
        await HomepageSectionProduct.deleteMany({ sectionId });

        const toInsert = items.map((it, idx) => ({
          sectionId,
          productId: it.productId,
          displayOrder: it.displayOrder !== undefined ? it.displayOrder : idx + 1
        }));

        await HomepageSectionProduct.insertMany(toInsert, { ordered: false });
        totalImported += toInsert.length;
      } else {
        // Append mode: retain existing, append new products
        const existing = await HomepageSectionProduct.find({ sectionId }).select('productId displayOrder');
        const existingSet = new Set(existing.map((e) => e.productId.toString()));
        let maxOrder = existing.reduce((max, e) => Math.max(max, e.displayOrder || 0), 0);

        const toInsert = [];
        for (const it of items) {
          if (!existingSet.has(it.productId.toString())) {
            existingSet.add(it.productId.toString());
            maxOrder += 1;
            toInsert.push({
              sectionId,
              productId: it.productId,
              displayOrder: it.displayOrder !== undefined ? it.displayOrder : maxOrder
            });
          }
        }

        if (toInsert.length > 0) {
          await HomepageSectionProduct.insertMany(toInsert, { ordered: false });
          totalImported += toInsert.length;
        }
      }

      // Sync legacy config
      const allCurrent = await HomepageSectionProduct.find({ sectionId }).sort({ displayOrder: 1 });
      await HomepageSection.findByIdAndUpdate(sectionId, {
        $set: { 'config.productIds': allCurrent.map((a) => a.productId) }
      });
    }

    if (staffUser) {
      await auditService.log({
        actorId: staffUser._id,
        actorRole: staffUser.role,
        actorEmail: staffUser.email,
        action: 'HOMEPAGE_SECTIONS_EXCEL_IMPORTED',
        resourceType: 'HomepageSection',
        notes: `Imported ${totalImported} assignments across ${bySection.size} sections in ${modeNormalized.toUpperCase()} mode`
      });
    }

    return {
      success: true,
      mode: modeNormalized,
      totalImported,
      affectedSections: affectedSectionNames,
      message: `Successfully imported ${totalImported} product assignments in ${modeNormalized} mode.`
    };
  },

  /**
   * Exports all current section product assignments to an Excel file
   */
  async exportAssignmentsExcel() {
    await this.ensureDefaultSections();

    const assignments = await HomepageSectionProduct.find({})
      .populate('sectionId', 'name slug displayPosition')
      .populate({
        path: 'productId',
        select: 'title slug variants.sku categoryId basePrice status',
        populate: { path: 'categoryId', select: 'name' }
      })
      .sort({ 'sectionId.displayPosition': 1, displayOrder: 1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mosmac Admin Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Current Assignments', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Section Identifier', key: 'sectionSlug', width: 22 },
      { header: 'Section Name', key: 'sectionName', width: 25 },
      { header: 'Product SKU', key: 'productSku', width: 20 },
      { header: 'Product Title', key: 'productTitle', width: 35 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Price (INR)', key: 'price', width: 14 },
      { header: 'Display Order', key: 'displayOrder', width: 15 },
      { header: 'Status', key: 'status', width: 14 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };

    assignments.forEach((a) => {
      if (a.sectionId && a.productId) {
        const defaultVariant = a.productId.variants?.[0] || {};
        const price = a.productId.basePrice ? a.productId.basePrice / 100 : defaultVariant.price ? defaultVariant.price / 100 : 0;

        sheet.addRow({
          sectionSlug: a.sectionId.slug,
          sectionName: a.sectionId.name,
          productSku: defaultVariant.sku || 'N/A',
          productTitle: a.productId.title,
          category: a.productId.categoryId?.name || 'General',
          price,
          displayOrder: a.displayOrder,
          status: a.productId.status
        });
      }
    });

    return workbook.xlsx.writeBuffer();
  },

  // =========================================================================
  // PUBLIC STOREFRONT HOMEPAGE SECTIONS RESOLVER
  // =========================================================================

  /**
   * Resolves active homepage sections with populated products for public storefront
   */
  async getPublicStorefrontSections() {
    await this.ensureDefaultSections();

    // 1. Fetch all active sections sorted by displayPosition
    const sections = await HomepageSection.find({ isActive: true })
      .sort({ displayPosition: 1, createdAt: 1 })
      .lean();

    if (sections.length === 0) {
      return [];
    }

    const sectionIds = sections.map((s) => s._id);

    // 2. Fetch all assignments for these sections
    const assignments = await HomepageSectionProduct.find({ sectionId: { $in: sectionIds } })
      .sort({ displayOrder: 1, createdAt: 1 })
      .populate({
        path: 'productId',
        match: { status: 'published' }, // Crucial: only published products
        select: 'title slug images basePrice baseMrp ratings badges isFeatured variants categoryId brandId status',
        populate: [
          { path: 'categoryId', select: 'name slug' },
          { path: 'brandId', select: 'name slug' }
        ]
      })
      .lean();

    // Group valid products by sectionId
    const productsBySection = new Map();
    assignments.forEach((a) => {
      if (!a.productId) return; // Skip non-published or deleted products
      const sId = a.sectionId.toString();
      if (!productsBySection.has(sId)) productsBySection.set(sId, []);

      const prod = a.productId;
      const defaultVariant = prod.variants?.[0] || {};
      const primaryImage = prod.images?.find((img) => img.isPrimary)?.url || prod.images?.[0]?.url || '';
      const price = prod.basePrice ? prod.basePrice / 100 : defaultVariant.price ? defaultVariant.price / 100 : 0;
      const mrp = prod.baseMrp ? prod.baseMrp / 100 : defaultVariant.mrp ? defaultVariant.mrp / 100 : 0;

      // Calculate discount percentage
      const discountPercentage = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

      productsBySection.get(sId).push({
        _id: prod._id,
        title: prod.title,
        slug: prod.slug,
        sku: defaultVariant.sku || 'N/A',
        basePrice: prod.basePrice,
        baseMrp: prod.baseMrp || prod.basePrice,
        variants: prod.variants || [],
        price,
        mrp,
        discountPercentage,
        ratings: prod.ratings,
        badges: prod.badges || [],
        isFeatured: prod.isFeatured || false,
        images: prod.images || [],
        imageUrl: primaryImage,
        category: prod.categoryId,
        brand: prod.brandId,
        displayOrder: a.displayOrder
      });
    });

    // 3. Assemble response, omitting empty sections
    const result = [];
    for (const sec of sections) {
      const sId = sec._id.toString();
      const rawProducts = productsBySection.get(sId) || [];
      const limit = sec.maxProducts || 8;
      const slicedProducts = rawProducts.slice(0, limit);

      // Hide section if it has no valid products
      if (slicedProducts.length > 0) {
        result.push({
          id: sec._id,
          _id: sec._id,
          slug: sec.slug,
          name: sec.name,
          heading: sec.heading || sec.name,
          subtitle: sec.subtitle || '',
          description: sec.description || '',
          type: sec.type || 'product_grid',
          isActive: sec.isActive !== false,
          maxProducts: sec.maxProducts || 8,
          displayPosition: sec.displayPosition,
          showViewAll: sec.showViewAll !== false,
          viewAllLink: sec.viewAllLink || `/products?section=${sec.slug}`,
          products: slicedProducts
        });
      }
    }

    return result;
  }
};

export default homepageSectionService;
