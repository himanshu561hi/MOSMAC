import { User } from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import { hashPassword, comparePassword } from './passwordService.js';
import env from '../config/env.js';

/**
 * Synchronizes or provisions the Super Admin account configured via environment variables.
 * Enables zero-touch administrative setup using ADMIN_EMAIL and ADMIN_PASSWORD.
 */
export async function syncSuperAdminFromEnv() {
  const email = (process.env.ADMIN_EMAIL || env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  try {
    let admin = await User.findOne({ email }).select('+passwordHash');

    if (!admin) {
      const passwordHash = await hashPassword(password);
      admin = await User.create({
        firstName: 'Super',
        lastName: 'Admin',
        email,
        passwordHash,
        role: ROLES.SUPER_ADMIN,
        status: 'active',
        isEmailVerified: true
      });
      console.log(`[AdminSync] ✅ Super Admin account ensured from environment: ${email}`);
    } else {
      let isModified = false;
      const isMatch = await comparePassword(password, admin.passwordHash);

      if (!isMatch) {
        admin.passwordHash = await hashPassword(password);
        isModified = true;
      }
      if (admin.role !== ROLES.SUPER_ADMIN) {
        admin.role = ROLES.SUPER_ADMIN;
        isModified = true;
      }
      if (admin.status !== 'active') {
        admin.status = 'active';
        isModified = true;
      }
      if (!admin.isEmailVerified) {
        admin.isEmailVerified = true;
        isModified = true;
      }

      if (isModified) {
        await admin.save();
        console.log(`[AdminSync] 🔄 Super Admin credentials synchronized from environment: ${email}`);
      }
    }

    return admin;
  } catch (err) {
    console.error('[AdminSync] ❌ Error syncing Super Admin from environment:', err.message);
    return null;
  }
}

export default {
  syncSuperAdminFromEnv
};
