import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { ADMIN_ROLES, ROLES } from '../constants/roles.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { sendSuccess } from '../utils/responseFormatter.js';

// Controllers
import adminDashboardController from '../controllers/adminDashboardController.js';
import adminCustomerController from '../controllers/adminCustomerController.js';
import adminStaffController from '../controllers/adminStaffController.js';
import adminPaymentOpsController from '../controllers/adminPaymentOpsController.js';
import adminInventoryOpsController from '../controllers/adminInventoryOpsController.js';
import adminReportController from '../controllers/adminReportController.js';
import adminAuditController from '../controllers/adminAuditController.js';
import adminSetupController from '../controllers/adminSetupController.js';
import adminImportExportController from '../controllers/adminImportExportController.js';

// Multer memory storage configuration for bulk imports (Excel + optional Images ZIP)
const bulkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024 }, // up to 300 MB limit
  fileFilter: (req, file, cb) => {
    const isExcel =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.toLowerCase().endsWith('.xlsx');
    const isZip =
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.mimetype === 'application/octet-stream' ||
      file.originalname.toLowerCase().endsWith('.zip');

    if (file.fieldname === 'file' && isExcel) {
      cb(null, true);
    } else if (file.fieldname === 'imagesZip' && isZip) {
      cb(null, true);
    } else if (isExcel || isZip) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type for field '${file.fieldname}': only .xlsx and .zip files are allowed`), false);
    }
  }
});

// Middlewares & Validators
import { authLimiter } from '../middlewares/rateLimiter.js';
import {
  createStaffSchema,
  updateStaffRoleSchema,
  addCustomerNoteSchema,
  updateCustomerStatusSchema,
  updateThresholdSchema,
  stockAdjustmentSchema,
  initialSuperAdminSchema,
  adminLoginSchema
} from '../validators/adminValidators.js';

export const adminRoutes = Router();

/* ==========================================================================
   Unauthenticated Administrative Setup & Login Endpoints
   ========================================================================== */

/**
 * GET /api/v1/admin/initial-registration/status
 * Check if initial Super Admin browser registration is open
 */
adminRoutes.get('/initial-registration/status', adminSetupController.checkStatus);

/**
 * POST /api/v1/admin/initial-registration
 * One-time browser-based initial Super Admin registration (requires server secret)
 */
adminRoutes.post(
  '/initial-registration',
  authLimiter,
  validate(initialSuperAdminSchema),
  adminSetupController.registerInitialSuperAdmin
);

/**
 * POST /api/v1/admin/login
 * Dedicated administrative staff login (rejects customer accounts)
 */
adminRoutes.post(
  '/login',
  authLimiter,
  validate(adminLoginSchema),
  adminSetupController.adminLogin
);

/* ==========================================================================
   Authenticated Operations Portal Routes (Strict RBAC Gated)
   ========================================================================== */
adminRoutes.use(authenticate);
adminRoutes.use(authorize(...ADMIN_ROLES));

/**
 * GET /api/v1/admin/me
 * Returns current admin profile and operational role
 */
adminRoutes.get('/me', (req, res) => {
  return sendSuccess(res, HTTP_STATUS.OK, 'Admin profile retrieved', {
    user: req.user.toJSON(),
    role: req.user.role,
    isSuperAdmin: req.user.role === ROLES.SUPER_ADMIN
  });
});

/* ==========================================================================
   1. Executive Analytics & Dashboard Metrics
   ========================================================================== */
adminRoutes.get(
  '/analytics/overview',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminDashboardController.getDashboardOverview
);

/* ==========================================================================
   2. Customer Relationship Management (CRM)
   ========================================================================== */
adminRoutes.get(
  '/customers/export',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminCustomerController.exportCustomers
);

adminRoutes.get(
  '/customers',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.SUPPORT_STAFF),
  adminCustomerController.listCustomers
);

adminRoutes.get(
  '/customers/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.SUPPORT_STAFF),
  adminCustomerController.getCustomerProfile
);

adminRoutes.post(
  '/customers/:id/notes',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.SUPPORT_STAFF),
  validate(addCustomerNoteSchema),
  adminCustomerController.addCustomerNote
);

adminRoutes.patch(
  '/customers/:id/status',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updateCustomerStatusSchema),
  adminCustomerController.updateCustomerStatus
);

// Backward compatibility alias for /admin/users
adminRoutes.get(
  '/users',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminCustomerController.listCustomers
);

// Backward compatibility alias for /admin/users/:id/status
adminRoutes.patch(
  '/users/:id/status',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateCustomerStatusSchema),
  adminCustomerController.updateCustomerStatus
);

/* ==========================================================================
   3. Staff Accounts, Roles & Permissions (Super Admin Only)
   ========================================================================== */
adminRoutes.get(
  '/staff',
  authorize(ROLES.SUPER_ADMIN),
  adminStaffController.listStaff
);

adminRoutes.post(
  '/staff',
  authorize(ROLES.SUPER_ADMIN),
  validate(createStaffSchema),
  adminStaffController.createStaff
);

adminRoutes.patch(
  '/staff/:id/role',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateStaffRoleSchema),
  adminStaffController.updateStaffRole
);

adminRoutes.post(
  '/staff/:id/revoke',
  authorize(ROLES.SUPER_ADMIN),
  adminStaffController.revokeStaffSessions
);

/* ==========================================================================
   4. Payments & Refunds Financial Operations
   ========================================================================== */
adminRoutes.get(
  '/payments/export',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminPaymentOpsController.exportPayments
);

adminRoutes.get(
  '/payments',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminPaymentOpsController.listPayments
);

adminRoutes.get(
  '/payments/refunds',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminPaymentOpsController.listRefunds
);

/* ==========================================================================
   5. Inventory & Replenishment Operations
   ========================================================================== */
adminRoutes.get(
  '/inventory/export',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminInventoryOpsController.exportInventory
);

adminRoutes.get(
  '/inventory/replenishment-alerts',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminInventoryOpsController.getReplenishmentAlerts
);

adminRoutes.patch(
  '/inventory/threshold/:sku',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updateThresholdSchema),
  adminInventoryOpsController.updateThreshold
);

adminRoutes.post(
  '/inventory/adjust',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(stockAdjustmentSchema),
  adminInventoryOpsController.adjustStock
);

/* ==========================================================================
   6. Reporting & Exports
   ========================================================================== */
adminRoutes.get(
  '/reports/orders',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminReportController.exportOrdersReport
);

adminRoutes.get(
  '/reports/tax',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminReportController.exportTaxReport
);

adminRoutes.get(
  '/reports/coupons',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminReportController.exportCouponsReport
);

/* ==========================================================================
   7. Immutable Administrative Audit Logging
   ========================================================================== */
adminRoutes.get(
  '/audit-logs',
  authorize(ROLES.SUPER_ADMIN),
  adminAuditController.getAuditLogs
);

/* ==========================================================================
   8. Phase 10A — Universal Excel Bulk Import & Data Export System
   ========================================================================== */

/**
 * GET /api/v1/admin/bulk/:module/template?sample=true|false
 * Download blank or sample .xlsx template
 */
adminRoutes.get(
  '/bulk/:module/template',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminImportExportController.downloadTemplate
);

/**
 * POST /api/v1/admin/bulk/:module/validate
 * Upload and pre-validate Excel file, returns preview and error summary
 */
adminRoutes.post(
  '/bulk/:module/validate',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  bulkUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'imagesZip', maxCount: 1 }
  ]),
  adminImportExportController.validateUpload
);

/**
 * POST /api/v1/admin/bulk/:module/execute
 * Execute validated import job with mode (create_only, update_existing, create_update)
 */
adminRoutes.post(
  '/bulk/:module/execute',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminImportExportController.executeImport
);

/**
 * GET /api/v1/admin/bulk/job/:jobId/status
 * Get real-time status and progress of an import job
 */
adminRoutes.get(
  '/bulk/job/:jobId/status',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminImportExportController.getJobStatus
);

/**
 * GET /api/v1/admin/bulk/:module/export
 * Download sanitized Excel export (.xlsx) for any supported module
 */
adminRoutes.get(
  '/bulk/:module/export',
  authorize(...ADMIN_ROLES),
  adminImportExportController.exportModule
);

/**
 * GET /api/v1/admin/bulk/history
 * List historical bulk import jobs
 */
adminRoutes.get(
  '/bulk/history',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminImportExportController.getHistory
);

/**
 * GET /api/v1/admin/bulk/history/:id/report
 * Download execution error and audit report (.xlsx) for an import job
 */
adminRoutes.get(
  '/bulk/history/:id/report',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  adminImportExportController.downloadReport
);

export default adminRoutes;
