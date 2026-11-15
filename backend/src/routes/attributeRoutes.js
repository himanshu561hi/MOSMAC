import { Router } from 'express';
import {
  getAttributesByCategory,
  createAttribute,
  updateAttribute,
  deleteAttribute
} from '../controllers/attributeController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createAttributeSchema, updateAttributeSchema } from '../validators/catalogueValidators.js';
import { ROLES } from '../constants/roles.js';

export const attributeRoutes = Router();

// Public route: fetch attributes for product forms / filters
attributeRoutes.get('/category/:categoryId', getAttributesByCategory);

// Admin mutation routes
attributeRoutes.post(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(createAttributeSchema),
  createAttribute
);

attributeRoutes.put(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updateAttributeSchema),
  updateAttribute
);

attributeRoutes.delete(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  deleteAttribute
);

export default attributeRoutes;

