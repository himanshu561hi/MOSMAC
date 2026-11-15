import { Router } from 'express';
import { addressController } from '../controllers/addressController.js';
import { authenticate } from '../middlewares/auth.js';

export const addressRoutes = Router();

// Customer Addresses (all protected by authenticate)
addressRoutes.use(authenticate);

addressRoutes.get('/', addressController.getAddresses);
addressRoutes.get('/:id', addressController.getAddressById);
addressRoutes.post('/', addressController.createAddress);
addressRoutes.put('/:id', addressController.updateAddress);
addressRoutes.patch('/:id', addressController.updateAddress);
addressRoutes.delete('/:id', addressController.deleteAddress);
addressRoutes.patch('/:id/default', addressController.setDefaultAddress);

export default addressRoutes;
