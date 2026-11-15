import { cmsService } from '../services/cmsService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

// ==========================================
// BANNERS
// ==========================================

export async function listAdminBanners(req, res, next) {
  try {
    const { page, limit, bannerType, isActive } = req.query;
    const result = await cmsService.listAdminBanners({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      bannerType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    });
    return sendSuccess(res, HTTP_STATUS.OK, 'Banners retrieved successfully', result);
  } catch (error) {
    next(error);
  }
}

export async function listPublicBanners(req, res, next) {
  try {
    const { type } = req.query;
    const banners = await cmsService.listPublicBanners(type || 'hero');
    return sendSuccess(res, HTTP_STATUS.OK, 'Public active banners retrieved', { banners });
  } catch (error) {
    next(error);
  }
}

export async function createBanner(req, res, next) {
  try {
    const banner = await cmsService.createBanner(req.body, req.user);
    return sendSuccess(res, HTTP_STATUS.CREATED, 'Banner created successfully', { banner });
  } catch (error) {
    next(error);
  }
}

export async function updateBanner(req, res, next) {
  try {
    const banner = await cmsService.updateBanner(req.params.id, req.body, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, 'Banner updated successfully', { banner });
  } catch (error) {
    next(error);
  }
}

export async function deleteBanner(req, res, next) {
  try {
    const result = await cmsService.deleteBanner(req.params.id, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, 'Banner deleted successfully', result);
  } catch (error) {
    next(error);
  }
}

// ==========================================
// HOMEPAGE BUILDER
// ==========================================

export async function listAdminSections(req, res, next) {
  try {
    const sections = await cmsService.listAdminSections();
    return sendSuccess(res, HTTP_STATUS.OK, 'Homepage builder sections retrieved', { sections });
  } catch (error) {
    next(error);
  }
}

export async function getDynamicHomepageSections(req, res, next) {
  try {
    const sections = await cmsService.getDynamicHomepageSections();
    return sendSuccess(res, HTTP_STATUS.OK, 'Dynamic homepage layout retrieved', { sections });
  } catch (error) {
    next(error);
  }
}

export async function createSection(req, res, next) {
  try {
    const section = await cmsService.createSection(req.body, req.user);
    return sendSuccess(res, HTTP_STATUS.CREATED, 'Homepage section created', { section });
  } catch (error) {
    next(error);
  }
}

export async function updateSection(req, res, next) {
  try {
    const section = await cmsService.updateSection(req.params.id, req.body, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, 'Homepage section updated', { section });
  } catch (error) {
    next(error);
  }
}

export async function reorderSections(req, res, next) {
  try {
    const result = await cmsService.reorderSections(req.body.sections, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, 'Homepage sections reordered', result);
  } catch (error) {
    next(error);
  }
}

export async function deleteSection(req, res, next) {
  try {
    const result = await cmsService.deleteSection(req.params.id, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, 'Homepage section removed', result);
  } catch (error) {
    next(error);
  }
}

// ==========================================
// CONTENT PAGES & POLICIES
// ==========================================

export async function listAdminPages(req, res, next) {
  try {
    const { page, limit, status, search } = req.query;
    const result = await cmsService.listAdminPages({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      search
    });
    return sendSuccess(res, HTTP_STATUS.OK, 'Content pages retrieved', result);
  } catch (error) {
    next(error);
  }
}

export async function getPublicPageBySlug(req, res, next) {
  try {
    const page = await cmsService.getPublicPageBySlug(req.params.slug);
    return sendSuccess(res, HTTP_STATUS.OK, 'Content page retrieved', { page });
  } catch (error) {
    next(error);
  }
}

export async function createPage(req, res, next) {
  try {
    const page = await cmsService.createPage(req.body, req.user);
    return sendSuccess(res, HTTP_STATUS.CREATED, 'Content page created', { page });
  } catch (error) {
    next(error);
  }
}

export async function updatePage(req, res, next) {
  try {
    const page = await cmsService.updatePage(req.params.id, req.body, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, 'Content page updated', { page });
  } catch (error) {
    next(error);
  }
}

export async function deletePage(req, res, next) {
  try {
    const result = await cmsService.deletePage(req.params.id, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, 'Content page deleted', result);
  } catch (error) {
    next(error);
  }
}

// ==========================================
// FAQ MANAGEMENT
// ==========================================

export async function listAdminFaqs(req, res, next) {
  try {
    const { category, search } = req.query;
    const faqs = await cmsService.listAdminFaqs({ category, search });
    return sendSuccess(res, HTTP_STATUS.OK, 'FAQs retrieved', { faqs });
  } catch (error) {
    next(error);
  }
}

export async function listPublicFaqs(req, res, next) {
  try {
    const result = await cmsService.listPublicFaqs();
    return sendSuccess(res, HTTP_STATUS.OK, 'Public FAQs retrieved', result);
  } catch (error) {
    next(error);
  }
}

export async function createFaq(req, res, next) {
  try {
    const faq = await cmsService.createFaq(req.body, req.user);
    return sendSuccess(res, HTTP_STATUS.CREATED, 'FAQ created successfully', { faq });
  } catch (error) {
    next(error);
  }
}

export async function updateFaq(req, res, next) {
  try {
    const faq = await cmsService.updateFaq(req.params.id, req.body, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, 'FAQ updated successfully', { faq });
  } catch (error) {
    next(error);
  }
}

export async function deleteFaq(req, res, next) {
  try {
    const result = await cmsService.deleteFaq(req.params.id, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, 'FAQ deleted successfully', result);
  } catch (error) {
    next(error);
  }
}

// ==========================================
// STORE SETTINGS
// ==========================================

export async function getPublicStoreSettings(req, res, next) {
  try {
    const settings = await cmsService.getPublicStoreSettings();
    return sendSuccess(res, HTTP_STATUS.OK, 'Store settings retrieved', { settings });
  } catch (error) {
    next(error);
  }
}

export async function getAdminStoreSettings(req, res, next) {
  try {
    const settings = await cmsService.getStoreSettings();
    return sendSuccess(res, HTTP_STATUS.OK, 'Admin store settings retrieved', { settings });
  } catch (error) {
    next(error);
  }
}

export async function updateStoreSettings(req, res, next) {
  try {
    const settings = await cmsService.updateStoreSettings(req.body, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, 'Store settings updated', { settings });
  } catch (error) {
    next(error);
  }
}
