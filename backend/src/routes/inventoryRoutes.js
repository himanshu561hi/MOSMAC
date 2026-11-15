import { Router } from 'express';
import {
  adjustInventoryStock,
  getInventory,
  getInventoryLogs
} from '../controllers/inventoryController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { stockAdjustmentSchema } from '../validators/catalogueValidators.js';
import { ROLES } from '../constants/roles.js';

export const inventoryRoutes = Router();

// Protected: All inventory endpoints require administrative privileges
inventoryRoutes.use(authenticate);
inventoryRoutes.use(authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.ORDER_MANAGER));

inventoryRoutes.get('/', getInventory);
inventoryRoutes.get('/logs', getInventoryLogs);
inventoryRoutes.post('/adjust', validate(stockAdjustmentSchema), adjustInventoryStock);

export default inventoryRoutes;

