import crypto from 'crypto';
import { User } from '../models/User.js';
import { AdminSetupLock } from '../models/AdminSetupLock.js';
import { ROLES, ADMIN_ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { hashPassword } from '../services/passwordService.js';
import {
  generateAccessToken,
  generateRefreshToken,
  setRefreshCookie
} from '../services/tokenService.js';
import { auditService } from '../services/auditService.js';
import { syncSuperAdminFromEnv } from '../services/adminSyncService.js';
import env from '../config/env.js';

export const adminSetupController = {
  /**
   * Check if initial Super Admin browser registration is available
   */
  async checkStatus(req, res, next) {
    try {
      const superAdminExists = await User.exists({ role: ROLES.SUPER_ADMIN });
      const lockExists = await AdminSetupLock.findOne({
        _id: 'initial_super_admin_setup',
        isLocked: true
      });

      if (superAdminExists || lockExists) {
        return sendSuccess(res, HTTP_STATUS.OK, 'Initial Super Admin registration is closed', {
          isAvailable: false,
          reason: 'SUPER_ADMIN_ALREADY_EXISTS'
        });
      }

      const serverSecret = process.env.INITIAL_ADMIN_SETUP_SECRET || env.INITIAL_ADMIN_SETUP_SECRET;
      if (!serverSecret) {
        return sendSuccess(res, HTTP_STATUS.OK, 'Setup secret is not configured on the server', {
          isAvailable: false,
          reason: 'SETUP_SECRET_NOT_CONFIGURED'
        });
      }

      return sendSuccess(res, HTTP_STATUS.OK, 'Initial Super Admin registration is available', {
        isAvailable: true
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create initial Super Admin account through browser registration
   */
  async registerInitialSuperAdmin(req, res, next) {
    let lockAcquired = false;
    let userCreated = false;

    try {
      // 1. Verify that no Super Admin exists
      const existingSuperAdmin = await User.exists({ role: ROLES.SUPER_ADMIN });
      if (existingSuperAdmin) {
        throw ApiError.conflict(
          'Initial Super Admin registration is permanently closed. A Super Admin account already exists.',
          ERROR_CODES.FORBIDDEN
        );
      }

      // 2. Read server-side setup secret
      const serverSecret = process.env.INITIAL_ADMIN_SETUP_SECRET || env.INITIAL_ADMIN_SETUP_SECRET;
      if (!serverSecret) {
        throw ApiError.badRequest(
          'Initial Super Admin setup is not enabled. Missing server secret configuration.',
          ERROR_CODES.BAD_REQUEST
        );
      }

      // 3. Timing-safe verification of the setup secret (using SHA-256 digests)
      const submittedHash = crypto.createHash('sha256').update(String(req.body.setupSecret)).digest();
      const configuredHash = crypto.createHash('sha256').update(String(serverSecret)).digest();
      const isSecretValid = crypto.timingSafeEqual(submittedHash, configuredHash);

      if (!isSecretValid) {
        throw ApiError.forbidden('Invalid setup authorization secret', ERROR_CODES.FORBIDDEN);
      }

      // 4. Concurrency protection: Atomic upsert of setup lock
      try {
        const lock = await AdminSetupLock.findOneAndUpdate(
          { _id: 'initial_super_admin_setup' },
          { $setOnInsert: { _id: 'initial_super_admin_setup', isLocked: false, createdAt: new Date() } },
          { upsert: true, new: false }
        );

        if (lock) {
          throw ApiError.conflict(
            'Initial Super Admin registration has already been initiated or completed.',
            ERROR_CODES.RESOURCE_CONFLICT
          );
        }
        lockAcquired = true;
      } catch (lockErr) {
        if (lockErr instanceof ApiError) throw lockErr;
        if (lockErr.code === 11000) {
          throw ApiError.conflict(
            'Initial Super Admin registration has already been initiated or completed.',
            ERROR_CODES.RESOURCE_CONFLICT
          );
        }
        throw lockErr;
      }

      // 5. Double-check email uniqueness
      const email = req.body.email.toLowerCase().trim();
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        throw ApiError.conflict('An account with this email address already exists.', ERROR_CODES.RESOURCE_CONFLICT);
      }

      // 6. Hash password using existing password service
      const passwordHash = await hashPassword(req.body.password);

      // 7. Create Super Admin User
      const superAdmin = await User.create({
        firstName: req.body.firstName.trim(),
        lastName: (req.body.lastName || '').trim(),
        email,
        passwordHash,
        role: ROLES.SUPER_ADMIN,
        status: 'active',
        isEmailVerified: true
      });
      userCreated = true;

      // 8. Seal the setup lock permanently
      await AdminSetupLock.updateOne(
        { _id: 'initial_super_admin_setup' },
        { $set: { isLocked: true, superAdminId: superAdmin._id, completedAt: new Date() } }
      );

      // 9. Record immutable audit log (without credentials or secrets)
      await auditService.log({
        actorId: superAdmin._id,
        actorRole: ROLES.SUPER_ADMIN,
        actorEmail: superAdmin.email,
        action: 'INITIAL_SUPER_ADMIN_REGISTERED',
        resourceType: 'User',
        resourceId: superAdmin._id,
        changes: { email: superAdmin.email, role: ROLES.SUPER_ADMIN },
        notes: 'Initial Super Admin account registered via browser setup portal'
      });

      // 10. Return clean, non-sensitive success response (no access/refresh tokens issued)
      return sendSuccess(
        res,
        HTTP_STATUS.CREATED,
        'Initial Super Admin account created successfully. Please log in with your credentials.',
        {
          user: {
            id: superAdmin._id,
            email: superAdmin.email,
            firstName: superAdmin.firstName,
            lastName: superAdmin.lastName,
            role: superAdmin.role
          }
        }
      );
    } catch (error) {
      if (lockAcquired && !userCreated) {
        await AdminSetupLock.deleteOne({ _id: 'initial_super_admin_setup' }).catch(() => {});
      }
      next(error);
    }
  },

  /**
   * Dedicated Admin Portal Login
   * Restricts authentication strictly to staff accounts (super_admin, store_manager, order_manager, support_staff)
   */
  async adminLogin(req, res, next) {
    try {
      const { email, password } = req.body;
      const normalizedEmail = (email || '').toLowerCase().trim();
      const envAdminEmail = (process.env.ADMIN_EMAIL || env.ADMIN_EMAIL || '').toLowerCase().trim();

      // If logging in with the configured environment Super Admin email, synchronize credentials
      if (normalizedEmail && envAdminEmail && normalizedEmail === envAdminEmail) {
        await syncSuperAdminFromEnv();
      }

      const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash +refreshSessions');
      if (!user) {
        throw ApiError.unauthorized('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw ApiError.unauthorized('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
      }

      // Enforce administrative role requirement
      if (!ADMIN_ROLES.includes(user.role)) {
        throw ApiError.forbidden(
          'Access restricted: Your account does not have staff privileges to access the operations portal',
          ERROR_CODES.FORBIDDEN
        );
      }

      if (user.status !== 'active') {
        throw ApiError.forbidden(
          `Your account has been ${user.status}. Please contact the Super Administrator.`,
          ERROR_CODES.FORBIDDEN
        );
      }

      // Generate rotated refresh token session
      const { token: refreshToken, hashedToken, sessionId } = generateRefreshToken();
      user.addRefreshSession({
        sessionId,
        hashedToken,
        userAgent: req.headers['user-agent'] || 'Unknown',
        ipAddress: req.ip || req.connection?.remoteAddress || 'Unknown'
      });

      user.lastLoginAt = new Date();
      await user.save();

      setRefreshCookie(res, refreshToken);
      const accessToken = generateAccessToken(user);

      return sendSuccess(res, HTTP_STATUS.OK, 'Admin authentication successful', {
        user: user.toJSON(),
        accessToken
      });
    } catch (error) {
      next(error);
    }
  }
};

export default adminSetupController;
