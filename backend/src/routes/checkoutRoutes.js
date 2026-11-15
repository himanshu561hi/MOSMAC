import { Router } from 'express';
import { checkoutController } from '../controllers/checkoutController.js';
import { optionalAuthenticate } from '../middlewares/auth.js';
import { checkoutLimiter } from '../middlewares/rateLimiter.js';

export const checkoutRoutes = Router();

checkoutRoutes.post('/quote', checkoutLimiter, optionalAuthenticate, checkoutController.getQuote);
checkoutRoutes.get('/cod-eligibility', optionalAuthenticate, checkoutController.checkCodEligibility);

export default checkoutRoutes;
