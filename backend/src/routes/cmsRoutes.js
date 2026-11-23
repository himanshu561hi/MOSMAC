import { Router } from 'express';
import * as cmsController from '../controllers/cmsController.js';
import * as templateController from '../controllers/notificationTemplateController.js';
import * as sitemapController from '../controllers/sitemapController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../constants/roles.js';
import {
  createBannerSchema,
  updateBannerSchema,
  createSectionSchema,
  updateSectionSchema,
  reorderSectionsSchema,
  createPageSchema,
  updatePageSchema,
  createFaqSchema,
  updateFaqSchema,
  updateStoreSettingsSchema,
  updateTemplateSchema
} from '../validators/cmsValidators.js';

export const cmsRoutes = Router();

// ==========================================
// PUBLIC STOREFRONT CONTENT ROUTES
// ==========================================

cmsRoutes.get('/homepage', cmsController.getDynamicHomepageSections);
cmsRoutes.get('/banners', cmsController.listPublicBanners);
cmsRoutes.get('/whats-new', cmsController.getWhatsNewData);
cmsRoutes.get('/pages/:slug', cmsController.getPublicPageBySlug);
cmsRoutes.get('/faqs', cmsController.listPublicFaqs);
cmsRoutes.get('/settings', cmsController.getPublicStoreSettings);
cmsRoutes.get('/navigation', cmsController.getPublicStoreSettings);
cmsRoutes.get('/sitemap.xml', sitemapController.getSitemapXml);

// ==========================================
// ADMIN CMS ROUTES (Protected: Store Manager+)
// ==========================================

const adminCmsRouter = Router();
adminCmsRouter.use(authenticate);
adminCmsRouter.use(authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER));

// 1. Hero & Promotional Banners
adminCmsRouter.get('/banners', cmsController.listAdminBanners);
adminCmsRouter.post('/banners', validate(createBannerSchema), cmsController.createBanner);
adminCmsRouter.patch('/banners/:id', validate(updateBannerSchema), cmsController.updateBanner);
adminCmsRouter.delete('/banners/:id', cmsController.deleteBanner);

// 2. Homepage Builder Sections
adminCmsRouter.get('/homepage', cmsController.listAdminSections);
adminCmsRouter.post('/homepage', validate(createSectionSchema), cmsController.createSection);
adminCmsRouter.patch('/homepage/:id', validate(updateSectionSchema), cmsController.updateSection);
adminCmsRouter.post('/homepage/reorder', validate(reorderSectionsSchema), cmsController.reorderSections);
adminCmsRouter.delete('/homepage/:id', cmsController.deleteSection);

// 3. Content Pages & Policies
adminCmsRouter.get('/pages', cmsController.listAdminPages);
adminCmsRouter.post('/pages', validate(createPageSchema), cmsController.createPage);
adminCmsRouter.patch('/pages/:id', validate(updatePageSchema), cmsController.updatePage);
adminCmsRouter.delete('/pages/:id', cmsController.deletePage);

// 3.1 What's New Page Section Config
adminCmsRouter.get('/whats-new', cmsController.getAdminWhatsNewConfig);
adminCmsRouter.patch('/whats-new', cmsController.updateAdminWhatsNewConfig);

// 4. FAQs
adminCmsRouter.get('/faqs', cmsController.listAdminFaqs);
adminCmsRouter.post('/faqs', validate(createFaqSchema), cmsController.createFaq);
adminCmsRouter.patch('/faqs/:id', validate(updateFaqSchema), cmsController.updateFaq);
adminCmsRouter.delete('/faqs/:id', cmsController.deleteFaq);

// 5. Store Settings
adminCmsRouter.get('/settings', cmsController.getAdminStoreSettings);
adminCmsRouter.patch('/settings', validate(updateStoreSettingsSchema), cmsController.updateStoreSettings);

// 6. Notification Templates
adminCmsRouter.get('/templates', templateController.listTemplates);
adminCmsRouter.get('/templates/:type', templateController.getTemplate);
adminCmsRouter.patch('/templates/:id', validate(updateTemplateSchema), templateController.updateTemplate);
adminCmsRouter.post('/templates/:type/preview', templateController.previewTemplate);

export { adminCmsRouter };
export default cmsRoutes;
