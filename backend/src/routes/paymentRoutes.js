import { Router } from 'express';
import { paymentController } from '../controllers/paymentController.js';
import { optionalAuthenticate } from '../middlewares/auth.js';
import { checkoutLimiter } from '../middlewares/rateLimiter.js';

export const paymentRoutes = Router();

// Client payment verification callback (protected by checkout limiter)
paymentRoutes.post('/verify', checkoutLimiter, optionalAuthenticate, paymentController.verifyPayment);

// Client payment failure report
paymentRoutes.post('/failure', optionalAuthenticate, paymentController.recordPaymentFailure);

// Razorpay webhook receiver
paymentRoutes.post('/webhook', paymentController.handleRazorpayWebhook);

export default paymentRoutes;
