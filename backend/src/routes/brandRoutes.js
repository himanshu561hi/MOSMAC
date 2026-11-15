import { Router } from 'express';
import {
  getBrands,
  getBrandBySlug,
  createBrand,
  updateBrand,
  deleteBrand
} from '../controllers/brandController.js';
import { authenticate, authorize, optionalAuthenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createBrandSchema, updateBrandSchema } from '../validators/catalogueValidators.js';
import { ROLES } from '../constants/roles.js';

export const brandRoutes = Router();

// Public routes
brandRoutes.get('/', optionalAuthenticate, getBrands);
brandRoutes.get('/:slug', getBrandBySlug);

// Admin mutation routes
brandRoutes.post(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(createBrandSchema),
  createBrand
);

brandRoutes.put(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updateBrandSchema),
  updateBrand
);

brandRoutes.delete(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  deleteBrand
);

export default brandRoutes;
