import { Router } from 'express';
import { orderController } from '../controllers/orderController.js';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.js';
import { checkoutLimiter } from '../middlewares/rateLimiter.js';

export const orderRoutes = Router();

// Order creation (supports authenticated customer or verified guest) protected by checkout limiter
orderRoutes.post('/', checkoutLimiter, optionalAuthenticate, orderController.createOrder);

// Public guest order verification
orderRoutes.post('/guest-lookup', orderController.guestOrderLookup);

// Customer order listing (authenticated)
orderRoutes.get('/', authenticate, orderController.getCustomerOrders);

// Order details (supports authenticated customer or verified guest)
orderRoutes.get('/:orderNumber', optionalAuthenticate, orderController.getOrderDetails);

// Cancel order before dispatch
orderRoutes.post('/:orderNumber/cancel', authenticate, orderController.cancelOrder);

export default orderRoutes;
