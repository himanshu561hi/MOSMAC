import { Router } from 'express';
import { orderController } from '../controllers/orderController.js';
import { refundController } from '../controllers/refundController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

export const adminOrderRoutes = Router();

// Protect all admin order endpoints
adminOrderRoutes.use(authenticate);

// Orders listing & status transitions
adminOrderRoutes.get(
  '/',
  authorize('super_admin', 'store_manager', 'order_manager'),
  orderController.adminListOrders
);

adminOrderRoutes.get(
  '/:id',
  authorize('super_admin', 'store_manager', 'order_manager'),
  orderController.adminGetOrderById
);

adminOrderRoutes.patch(
  '/:id/status',
  authorize('super_admin', 'store_manager', 'order_manager'),
  orderController.adminUpdateOrderStatus
);

// Refunds (Strictly Super Admin & Store Manager)
adminOrderRoutes.post(
  '/:id/refund',
  authorize('super_admin', 'store_manager'),
  (req, res, next) => {
    req.body.orderId = req.params.id;
    return refundController.processRefund(req, res, next);
  }
);

adminOrderRoutes.get(
  '/:id/refunds',
  authorize('super_admin', 'store_manager'),
  (req, res, next) => {
    req.params.orderId = req.params.id;
    return refundController.getOrderRefunds(req, res, next);
  }
);

export default adminOrderRoutes;
