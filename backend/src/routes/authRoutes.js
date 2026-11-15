import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema
} from '../validators/authValidators.js';

export const authRoutes = Router();

// Public auth endpoints with rate limiting
authRoutes.post('/register', authLimiter, validate(registerSchema), register);
authRoutes.post('/login', authLimiter, validate(loginSchema), login);
authRoutes.post('/refresh', refresh);
authRoutes.post('/logout', logout);
authRoutes.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
authRoutes.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
authRoutes.post('/verify-email', verifyEmail);

// Authenticated customer endpoints
authRoutes.get('/me', authenticate, getMe);
authRoutes.patch('/profile', authenticate, validate(updateProfileSchema), updateProfile);
authRoutes.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
authRoutes.post('/logout-all', authenticate, logoutAll);

export default authRoutes;

