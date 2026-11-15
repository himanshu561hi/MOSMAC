import { verifyAccessToken } from '../services/tokenService.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Strict authentication middleware.
 * Verifies JWT access token, checks user status, and validates tokenVersion.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is missing or malformed', ERROR_CODES.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Access token has expired. Please refresh your session', ERROR_CODES.TOKEN_EXPIRED);
      }
      throw ApiError.unauthorized('Invalid access token', ERROR_CODES.INVALID_TOKEN);
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      throw ApiError.unauthorized('The account belonging to this token no longer exists', ERROR_CODES.UNAUTHORIZED);
    }

    if (user.status !== 'active') {
      throw ApiError.forbidden(`Your account is ${user.status}. Please contact support`, ERROR_CODES.FORBIDDEN);
    }

    // Check if token was issued prior to password change or global logout
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion < user.tokenVersion) {
      throw ApiError.unauthorized('This session has been revoked. Please log in again', ERROR_CODES.TOKEN_EXPIRED);
    }

    req.user = user;
    req.auth = decoded;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-Based Access Control (RBAC) middleware.
 * @param {...string} allowedRoles - Permitted roles (e.g. 'super_admin', 'store_manager')
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication is required to perform this action'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Forbidden: You do not have permissions for this action. Required role: [${allowedRoles.join(', ')}]`,
          ERROR_CODES.FORBIDDEN
        )
      );
    }

    next();
  };
}

/**
 * Optional authentication middleware.
 * Attaches req.user if a valid token is provided, but does not block guest requests.
 */
export async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.sub);
      if (user && user.status === 'active' && decoded.tokenVersion === user.tokenVersion) {
        req.user = user;
        req.auth = decoded;
      }
    }
  } catch (err) {
    // Silently continue as guest
    req.user = null;
  }
  next();
}

export default {
  authenticate,
  authorize,
  optionalAuthenticate
};

