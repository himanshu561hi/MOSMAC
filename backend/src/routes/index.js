import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import brandRoutes from './brandRoutes.js';
import attributeRoutes from './attributeRoutes.js';
import productRoutes from './productRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import mediaRoutes from './mediaRoutes.js';
import storefrontRoutes from './storefrontRoutes.js';
import cartRoutes from './cartRoutes.js';
import wishlistRoutes from './wishlistRoutes.js';
import couponRoutes from './couponRoutes.js';
import addressRoutes from './addressRoutes.js';
import checkoutRoutes from './checkoutRoutes.js';
import orderRoutes from './orderRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import adminOrderRoutes from './adminOrderRoutes.js';
import cmsRoutes, { adminCmsRouter } from './cmsRoutes.js';
import { offersDealsRoutes } from './offersDealsRoutes.js';
import { adminReviewRouter } from './reviewRoutes.js';
import homepageSectionRoutes, { adminHomepageRouter } from './homepageSectionRoutes.js';
import { homepageSectionController } from '../controllers/homepageSectionController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { ROLES } from '../constants/roles.js';

export const apiRouter = Router();

// Mount Health Check Routes
apiRouter.use('/health', healthRoutes);

// Mount Storefront Public Experience Routes
apiRouter.use('/storefront', storefrontRoutes);
apiRouter.use('/homepage', homepageSectionRoutes);

// Mount Authentication & Customer Identity Routes
apiRouter.use('/auth', authRoutes);

// Mount Customer Address Management Routes
apiRouter.use('/account/addresses', addressRoutes);

// Mount Checkout & Quotation Routes
apiRouter.use('/checkout', checkoutRoutes);

// Mount Order Management Routes
apiRouter.use('/orders', orderRoutes);

// Mount Payment Processing & Webhook Routes
apiRouter.use('/payments', paymentRoutes);

// Mount Shopping Features (Cart, Wishlist & Coupons)
apiRouter.use('/cart', cartRoutes);
apiRouter.use('/wishlist', wishlistRoutes);
apiRouter.use('/coupons', couponRoutes);

// Mount Catalogue & Discovery Routes
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/brands', brandRoutes);
apiRouter.use('/attributes', attributeRoutes);
apiRouter.use('/products', productRoutes);

// Mount Inventory & Stock Management Routes
apiRouter.use('/inventory', inventoryRoutes);

// Mount Media Management Routes
apiRouter.use('/media', mediaRoutes);

// Mount CMS & Storefront Content Routes
apiRouter.use('/content', cmsRoutes);
apiRouter.use('/cms', cmsRoutes);

// Mount Offers & Deals Feature Routes
apiRouter.use('/offers-deals', offersDealsRoutes);
apiRouter.use('/admin/offers-deals', offersDealsRoutes);

// Mount Administrative Management Routes
apiRouter.use('/admin/orders', adminOrderRoutes);
apiRouter.use('/admin/cms', adminCmsRouter);
apiRouter.use('/admin/reviews', adminReviewRouter);
apiRouter.use('/admin/homepage-sections', adminHomepageRouter);
apiRouter.use('/admin', adminRoutes);

// Stub for remaining Phase 2-8 routes
apiRouter.get('/', (req, res) => {
  res.json({
    name: 'E-Commerce Platform REST API',
    version: 'v1',
    status: 'Operational'
  });
});

export default apiRouter;

