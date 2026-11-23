import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { hashPassword, hashToken } from '../services/passwordService.js';
import {
  generateAccessToken,
  generateRefreshToken,
  parseRefreshToken,
  setRefreshCookie,
  clearRefreshCookie
} from '../services/tokenService.js';
import emailService from '../integrations/emailAdapter.js';
import cartService from '../services/cartService.js';
import wishlistService from '../services/wishlistService.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Register new customer account
 */
export async function register(req, res, next) {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists', ERROR_CODES.RESOURCE_CONFLICT);
    }

    const hashedPassword = await hashPassword(password);

    const user = new User({
      email,
      passwordHash: hashedPassword,
      firstName,
      lastName: lastName || '',
      phone: phone || undefined,
      role: 'customer',
      status: 'active'
    });

    // Create session and refresh token
    const { token: refreshToken, hashedToken, sessionId } = generateRefreshToken();
    user.addRefreshSession({
      sessionId,
      hashedToken,
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress || 'Unknown'
    });

    // Generate email verification token
    const rawVerifyToken = user.createEmailVerificationToken();

    await user.save();

    // Send verification email asynchronously
    const frontendBase = env.CORS_ORIGIN.split(',')[0].trim();
    const verifyUrl = `${frontendBase}/verify-email?token=${rawVerifyToken}`;
    emailService.sendVerificationEmail(user.email, verifyUrl, user.firstName).catch((err) => {
      logger.error('Failed to send verification email during register:', err);
    });

    // Auto-merge guest cart & wishlist if guest session was active
    const guestSessionId = req.headers['x-guest-id'] || req.cookies?.guest_id || req.body?.guestId;
    if (guestSessionId) {
      try {
        await cartService.mergeGuestCart({ userId: user._id, guestId: guestSessionId });
        await wishlistService.mergeGuestWishlist({ userId: user._id, guestId: guestSessionId });
      } catch (mergeErr) {
        logger.warn('Auto-merge guest session during register warning:', mergeErr);
      }
    }

    // Attach HttpOnly refresh cookie & return access token
    setRefreshCookie(res, refreshToken);
    const accessToken = generateAccessToken(user);

    return sendSuccess(res, HTTP_STATUS.CREATED, 'Account registered successfully', {
      user: user.toJSON(),
      accessToken
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Customer & staff login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash +refreshSessions');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (user.status !== 'active') {
      throw ApiError.forbidden(`Your account is ${user.status}. Please contact customer support.`, ERROR_CODES.FORBIDDEN);
    }

    // Generate rotated refresh token
    const { token: refreshToken, hashedToken, sessionId } = generateRefreshToken();
    user.addRefreshSession({
      sessionId,
      hashedToken,
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress || 'Unknown'
    });

    user.lastLoginAt = new Date();
    await user.save();

    // Auto-merge guest cart & wishlist if guest session was active
    const guestSessionId = req.headers['x-guest-id'] || req.cookies?.guest_id || req.body?.guestId;
    if (guestSessionId) {
      try {
        await cartService.mergeGuestCart({ userId: user._id, guestId: guestSessionId });
        await wishlistService.mergeGuestWishlist({ userId: user._id, guestId: guestSessionId });
      } catch (mergeErr) {
        logger.warn('Auto-merge guest session during login warning:', mergeErr);
      }
    }

    setRefreshCookie(res, refreshToken);
    const accessToken = generateAccessToken(user);

    return sendSuccess(res, HTTP_STATUS.OK, 'Login successful', {
      user: user.toJSON(),
      accessToken
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Rotate refresh session with Token Reuse Detection
 */
export async function refresh(req, res, next) {
  try {
    const incomingCookie = req.cookies.refreshToken;
    if (!incomingCookie) {
      throw ApiError.unauthorized('Refresh token is missing. Please log in again.', ERROR_CODES.UNAUTHORIZED);
    }

    const parsed = parseRefreshToken(incomingCookie);
    if (!parsed) {
      clearRefreshCookie(res);
      throw ApiError.unauthorized('Malformed refresh token format.', ERROR_CODES.INVALID_TOKEN);
    }

    const { sessionId, secret } = parsed;
    const incomingSecretHash = hashToken(secret);

    // Find the user holding this sessionId
    const user = await User.findOne({ 'refreshSessions.sessionId': sessionId }).select('+refreshSessions');

    if (!user) {
      clearRefreshCookie(res);
      throw ApiError.unauthorized('Session has expired or does not exist.', ERROR_CODES.UNAUTHORIZED);
    }

    // Locate the exact session
    const sessionIndex = user.refreshSessions.findIndex((s) => s.sessionId === sessionId);
    if (sessionIndex === -1) {
      clearRefreshCookie(res);
      throw ApiError.unauthorized('Session has expired.', ERROR_CODES.UNAUTHORIZED);
    }

    const currentSession = user.refreshSessions[sessionIndex];

    // REFRESH TOKEN REUSE DETECTION WITH CONCURRENT GRACE PERIOD:
    // If the presented token hash does NOT match the active session hash,
    // check if it matches the previous token within a 30-second window (concurrent React requests)
    if (currentSession.tokenHash !== incomingSecretHash) {
      const isWithinGracePeriod =
        process.env.NODE_ENV !== 'test' &&
        currentSession.previousTokenHash === incomingSecretHash &&
        currentSession.previousTokenRotatedAt &&
        Date.now() - new Date(currentSession.previousTokenRotatedAt).getTime() < 30000;

      if (isWithinGracePeriod) {
        // Safe concurrent request within 30s grace window: return valid access token
        const newAccessToken = generateAccessToken(user);
        return sendSuccess(res, HTTP_STATUS.OK, 'Token refreshed successfully', {
          accessToken: newAccessToken
        });
      }

      logger.warn(`⚠️ REUSE DETECTED: Refresh token reuse on user ${user._id}. Revoking all sessions.`);
      // Invalidate ALL sessions for this user immediately
      user.refreshSessions = [];
      user.tokenVersion += 1;
      await user.save();
      clearRefreshCookie(res);

      throw ApiError.unauthorized(
        'Security breach alert: Token reuse detected. All active sessions have been revoked.',
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Check expiration
    if (new Date() > currentSession.expiresAt) {
      user.refreshSessions.splice(sessionIndex, 1);
      await user.save();
      clearRefreshCookie(res);
      throw ApiError.unauthorized('Refresh session has expired. Please log in again.', ERROR_CODES.TOKEN_EXPIRED);
    }

    // Rotate token: Issue new secret, update session record & record previous hash
    const { token: newRefreshToken, hashedToken: newHashedToken } = generateRefreshToken();
    currentSession.previousTokenHash = currentSession.tokenHash;
    currentSession.previousTokenRotatedAt = new Date();
    currentSession.tokenHash = newHashedToken;
    currentSession.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    currentSession.userAgent = req.headers['user-agent'] || currentSession.userAgent;
    currentSession.ipAddress = req.ip || currentSession.ipAddress;

    await user.save();

    setRefreshCookie(res, newRefreshToken);
    const newAccessToken = generateAccessToken(user);

    return sendSuccess(res, HTTP_STATUS.OK, 'Token refreshed successfully', {
      accessToken: newAccessToken
    });
  } catch (error) {
    next(error);
  }
}

/**
 * End current session
 */
export async function logout(req, res, next) {
  try {
    const incomingCookie = req.cookies.refreshToken;
    if (incomingCookie) {
      const parsed = parseRefreshToken(incomingCookie);
      if (parsed) {
        await User.updateOne(
          { 'refreshSessions.sessionId': parsed.sessionId },
          { $pull: { refreshSessions: { sessionId: parsed.sessionId } } }
        );
      }
    }

    clearRefreshCookie(res);
    return sendSuccess(res, HTTP_STATUS.OK, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Revoke all sessions across all devices
 */
export async function logoutAll(req, res, next) {
  try {
    const user = req.user;
    user.tokenVersion += 1;
    user.refreshSessions = [];
    await user.save();

    clearRefreshCookie(res);
    return sendSuccess(res, HTTP_STATUS.OK, 'All active sessions have been revoked');
  } catch (error) {
    next(error);
  }
}

/**
 * Get current authenticated user profile
 */
export async function getMe(req, res) {
  return sendSuccess(res, HTTP_STATUS.OK, 'Current user profile retrieved', {
    user: req.user.toJSON()
  });
}

/**
 * Update authenticated customer profile
 */
export async function updateProfile(req, res, next) {
  try {
    const { firstName, lastName, phone } = req.body;
    const user = req.user;

    if (firstName) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    return sendSuccess(res, HTTP_STATUS.OK, 'Profile updated successfully', {
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Change customer password
 */
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+passwordHash +refreshSessions');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw ApiError.badRequest('Current password does not match', ERROR_CODES.INVALID_CREDENTIALS);
    }

    user.passwordHash = await hashPassword(newPassword);
    user.tokenVersion += 1; // Invalidate all existing access tokens
    user.refreshSessions = []; // Invalidate all refresh sessions

    // Create fresh session for this device
    const { token: newRefreshToken, hashedToken, sessionId } = generateRefreshToken();
    user.addRefreshSession({
      sessionId,
      hashedToken,
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || 'Unknown'
    });

    await user.save();

    setRefreshCookie(res, newRefreshToken);
    const newAccessToken = generateAccessToken(user);

    return sendSuccess(res, HTTP_STATUS.OK, 'Password updated successfully', {
      accessToken: newAccessToken
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Request password reset token
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Consistent timing / anti-enumeration: always return success
    if (user && user.status === 'active') {
      const rawToken = user.createPasswordResetToken();
      await user.save();

      const frontendBase = env.CORS_ORIGIN.split(',')[0].trim();
      const resetUrl = `${frontendBase}/reset-password?token=${rawToken}`;

      emailService.sendPasswordResetEmail(user.email, resetUrl, user.firstName).catch((err) => {
        logger.error('Failed to send password reset email:', err);
      });
    }

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'If an account exists with that email, password reset instructions have been sent.'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Reset password using single-use expiring token
 */
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const hashed = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() }
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw ApiError.badRequest(
        'Password reset token is invalid or has expired.',
        ERROR_CODES.INVALID_TOKEN
      );
    }

    user.passwordHash = await hashPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion += 1; // Invalidate any existing sessions
    user.refreshSessions = [];

    await user.save();

    clearRefreshCookie(res);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Password has been reset successfully. Please log in with your new password.'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Verify email address token
 */
export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    const hashed = hashToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: new Date() }
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      throw ApiError.badRequest(
        'Verification token is invalid or has expired.',
        ERROR_CODES.INVALID_TOKEN
      );
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    return sendSuccess(res, HTTP_STATUS.OK, 'Email address verified successfully.');
  } catch (error) {
    next(error);
  }
}

export default {
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
};

