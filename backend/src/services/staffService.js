import { User } from '../models/User.js';
import { ROLES, ADMIN_ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from './passwordService.js';
import { auditService } from './auditService.js';

export const staffService = {
  /**
   * List all administrative staff members
   */
  async listStaff({ page = 1, limit = 20, role, status } = {}) {
    const query = { role: { $in: ADMIN_ROLES } };
    if (role && ADMIN_ROLES.includes(role)) {
      query.role = role;
    }
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const [staff, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash -refreshSessions')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    return {
      staff,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Create a new staff account (Super Admin only)
   */
  async createStaff({ firstName, lastName, email, phone, password, role }, superAdminUser) {
    if (role === ROLES.SUPER_ADMIN) {
      throw ApiError.badRequest('Super Admin accounts cannot be created via staff management. Use initial registration.');
    }

    const ASSIGNABLE_STAFF_ROLES = [ROLES.STORE_MANAGER, ROLES.ORDER_MANAGER, ROLES.SUPPORT_STAFF];
    if (!ASSIGNABLE_STAFF_ROLES.includes(role)) {
      throw ApiError.badRequest(`Invalid staff role. Allowed: ${ASSIGNABLE_STAFF_ROLES.join(', ')}`);
    }

    // Privilege escalation prevention: only Super Admin can create other staff
    if (superAdminUser.role !== ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden('Only Super Administrators can create staff accounts');
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      throw ApiError.badRequest('An account with this email address already exists');
    }

    const passwordHash = await hashPassword(password);
    const newStaff = await User.create({
      firstName: firstName.trim(),
      lastName: (lastName || '').trim(),
      email: email.toLowerCase().trim(),
      phone: (phone || '').trim(),
      passwordHash,
      role,
      status: 'active',
      isEmailVerified: true // Administrative accounts are pre-verified by Super Admin
    });

    await auditService.log({
      actorId: superAdminUser._id,
      actorRole: superAdminUser.role,
      actorEmail: superAdminUser.email,
      action: 'STAFF_ACCOUNT_CREATED',
      resourceType: 'User',
      resourceId: newStaff._id,
      changes: { created: { email: newStaff.email, role: newStaff.role } },
      notes: `Staff account created with role ${role}`
    });

    return newStaff.toJSON();
  },

  /**
   * Update staff member role or status
   */
  async updateStaffRole(staffId, { role, status }, superAdminUser) {
    if (superAdminUser.role !== ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden('Only Super Administrators can update staff roles');
    }

    const targetStaff = await User.findById(staffId);
    if (!targetStaff || !ADMIN_ROLES.includes(targetStaff.role)) {
      throw ApiError.notFound('Staff member not found');
    }

    // Prevent modifying oneself
    if (targetStaff._id.toString() === superAdminUser._id.toString()) {
      throw ApiError.badRequest('Cannot modify your own Super Admin role or status');
    }

    if (role === ROLES.SUPER_ADMIN) {
      throw ApiError.badRequest('Cannot elevate a staff member to Super Admin');
    }

    if (targetStaff.role === ROLES.SUPER_ADMIN) {
      const activeSuperAdmins = await User.countDocuments({
        role: ROLES.SUPER_ADMIN,
        status: 'active'
      });
      if (activeSuperAdmins <= 1 && ((status && status !== 'active') || (role && role !== ROLES.SUPER_ADMIN))) {
        throw ApiError.badRequest('Cannot demote, deactivate, or suspend the last active Super Administrator');
      }
    }

    const before = { role: targetStaff.role, status: targetStaff.status };

    if (role) {
      if (!ADMIN_ROLES.includes(role)) {
        throw ApiError.badRequest(`Invalid staff role. Allowed: ${ADMIN_ROLES.join(', ')}`);
      }
      targetStaff.role = role;
    }

    if (status) {
      if (!['active', 'suspended', 'deactivated'].includes(status)) {
        throw ApiError.badRequest('Invalid status. Allowed: active, suspended, deactivated');
      }
      targetStaff.status = status;
      if (status !== 'active') {
        targetStaff.tokenVersion += 1;
        targetStaff.refreshSessions = [];
      }
    }

    await targetStaff.save();

    await auditService.log({
      actorId: superAdminUser._id,
      actorRole: superAdminUser.role,
      actorEmail: superAdminUser.email,
      action: 'STAFF_ROLE_UPDATED',
      resourceType: 'User',
      resourceId: targetStaff._id,
      changes: { before, after: { role: targetStaff.role, status: targetStaff.status } },
      notes: `Staff ${targetStaff.email} updated to role ${targetStaff.role}, status ${targetStaff.status}`
    });

    return targetStaff.toJSON();
  },

  /**
   * Revoke active sessions for a staff member
   */
  async revokeStaffSessions(staffId, superAdminUser) {
    const targetStaff = await User.findById(staffId);
    if (!targetStaff || !ADMIN_ROLES.includes(targetStaff.role)) {
      throw ApiError.notFound('Staff member not found');
    }

    targetStaff.tokenVersion += 1;
    targetStaff.refreshSessions = [];
    await targetStaff.save();

    await auditService.log({
      actorId: superAdminUser._id,
      actorRole: superAdminUser.role,
      actorEmail: superAdminUser.email,
      action: 'STAFF_SESSIONS_REVOKED',
      resourceType: 'User',
      resourceId: targetStaff._id,
      notes: `All active sessions revoked for ${targetStaff.email}`
    });

    return { success: true, message: 'All active sessions have been revoked' };
  }
};

export default staffService;
