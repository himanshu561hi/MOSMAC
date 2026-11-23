import { Router } from 'express';
import { offersDealsController } from '../controllers/offersDealsController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { ROLES } from '../constants/roles.js';

export const offersDealsRoutes = Router();

// Public storefront endpoints
offersDealsRoutes.get('/data', offersDealsController.getStorefrontData);
offersDealsRoutes.get('/config', offersDealsController.getConfig);

// Admin configuration endpoints
offersDealsRoutes.put(
  '/config',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  offersDealsController.updateConfig
);

export default offersDealsRoutes;
