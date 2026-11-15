import { Router } from 'express';
import {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { authenticate, authorize, optionalAuthenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createCategorySchema, updateCategorySchema } from '../validators/catalogueValidators.js';
import { ROLES } from '../constants/roles.js';

export const categoryRoutes = Router();

// Public routes
categoryRoutes.get('/', optionalAuthenticate, getCategories);
categoryRoutes.get('/:slug', getCategoryBySlug);

// Admin-protected mutation routes
categoryRoutes.post(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(createCategorySchema),
  createCategory
);

categoryRoutes.put(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updateCategorySchema),
  updateCategory
);

categoryRoutes.delete(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  deleteCategory
);

export default categoryRoutes;
