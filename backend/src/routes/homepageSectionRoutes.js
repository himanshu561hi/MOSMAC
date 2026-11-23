import { Router } from 'express';
import multer from 'multer';
import { homepageSectionController } from '../controllers/homepageSectionController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { ADMIN_ROLES, ROLES } from '../constants/roles.js';
import {
  createSectionSchema,
  updateSectionSchema,
  toggleStatusSchema,
  reorderSectionsSchema,
  assignProductsSchema,
  updateProductsSchema
} from '../validators/homepageSectionValidators.js';

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    const isExcel =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.toLowerCase().endsWith('.xlsx');
    if (isExcel) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx) files are allowed'), false);
    }
  }
});

export const homepageSectionRoutes = Router();

// ==========================================
// PUBLIC STOREFRONT ROUTE
// ==========================================
homepageSectionRoutes.get('/sections', homepageSectionController.getPublicStorefrontSections);

// ==========================================
// ADMIN HOMEPAGE SECTION MANAGEMENT ROUTES
// ==========================================
const adminHomepageRouter = Router();
adminHomepageRouter.use(authenticate);
adminHomepageRouter.use(authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER));

// Excel Operations (must come before /:id parameter routes)
adminHomepageRouter.get('/sample-excel', homepageSectionController.downloadSampleExcel);
adminHomepageRouter.post('/validate-excel', excelUpload.single('file'), homepageSectionController.validateExcelUpload);
adminHomepageRouter.post('/import', homepageSectionController.executeExcelImport);
adminHomepageRouter.get('/export', homepageSectionController.exportAssignmentsExcel);

// Product Selector Search
adminHomepageRouter.get('/search-products', homepageSectionController.searchProducts);

// Section CRUD & Reordering
adminHomepageRouter.get('/', homepageSectionController.listAdminSections);
adminHomepageRouter.post('/', validate(createSectionSchema), homepageSectionController.createSection);
adminHomepageRouter.patch('/reorder', validate(reorderSectionsSchema), homepageSectionController.reorderSections);

adminHomepageRouter.get('/:id', homepageSectionController.getSectionById);
adminHomepageRouter.put('/:id', validate(updateSectionSchema), homepageSectionController.updateSection);
adminHomepageRouter.delete('/:id', homepageSectionController.deleteSection);
adminHomepageRouter.patch('/:id/status', validate(toggleStatusSchema), homepageSectionController.toggleSectionStatus);

// Product Assignment & Ordering within a Section
adminHomepageRouter.get('/:id/products', homepageSectionController.getSectionProducts);
adminHomepageRouter.post('/:id/products', validate(assignProductsSchema), homepageSectionController.assignProducts);
adminHomepageRouter.put('/:id/products', validate(updateProductsSchema), homepageSectionController.updateSectionProducts);
adminHomepageRouter.delete('/:id/products/:productId', homepageSectionController.removeProductFromSection);

export { adminHomepageRouter };
export default homepageSectionRoutes;
