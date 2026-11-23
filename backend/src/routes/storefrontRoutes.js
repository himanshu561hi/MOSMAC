import { Router } from 'express';
import { getHomepageData, checkPinCodeServiceability } from '../controllers/storefrontController.js';
import { homepageSectionController } from '../controllers/homepageSectionController.js';

export const storefrontRoutes = Router();

// Public discovery endpoints
storefrontRoutes.get('/homepage', getHomepageData);
storefrontRoutes.get('/homepage/sections', homepageSectionController.getPublicStorefrontSections);
storefrontRoutes.get('/check-pincode', checkPinCodeServiceability);
storefrontRoutes.post('/check-pincode', checkPinCodeServiceability);

export default storefrontRoutes;

