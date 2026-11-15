import { Router } from 'express';
import {
  getProducts,
  getProductSuggestions,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import { productReviewRouter } from './reviewRoutes.js';
import { authenticate, authorize, optionalAuthenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createProductSchema, updateProductSchema } from '../validators/catalogueValidators.js';
import { ROLES } from '../constants/roles.js';

export const productRoutes = Router();

// Mount Product Reviews sub-router
productRoutes.use('/:id/reviews', productReviewRouter);

// Public discovery routes
productRoutes.get('/', optionalAuthenticate, getProducts);
productRoutes.get('/suggestions', getProductSuggestions);
productRoutes.get('/:slug', optionalAuthenticate, getProductBySlug);

// Admin product mutation routes
productRoutes.post(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(createProductSchema),
  createProduct
);

productRoutes.put(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updateProductSchema),
  updateProduct
);

productRoutes.delete(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  deleteProduct
);

export default productRoutes;

