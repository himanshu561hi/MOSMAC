import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { AdminSetupLock } from '../src/models/AdminSetupLock.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { ROLES } from '../src/constants/roles.js';
import { hashPassword } from '../src/services/passwordService.js';
import { generateAccessToken } from '../src/services/tokenService.js';

let mongoServer;
const TEST_SETUP_SECRET = 'super_secure_test_setup_secret_32_characters_long';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  process.env.INITIAL_ADMIN_SETUP_SECRET = TEST_SETUP_SECRET;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await AdminSetupLock.deleteMany({});
  await AuditLog.deleteMany({});
  process.env.INITIAL_ADMIN_SETUP_SECRET = TEST_SETUP_SECRET;
});

describe('Admin Panel Finalization — Complete Admin Login, First Super Admin & Dashboard Access', () => {
  const validAdminPayload = {
    firstName: 'Master',
    lastName: 'Admin',
    email: 'superadmin@example.in',
    password: 'MasterAdmin2026!#Strong',
    confirmPassword: 'MasterAdmin2026!#Strong',
    setupSecret: TEST_SETUP_SECRET
  };

  describe('1. First Super Admin Setup Availability & Status Check', () => {
    it('should report isAvailable: true when no Super Admin exists and secret is set', async () => {
      const res = await request(app).get('/api/v1/admin/initial-registration/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isAvailable).toBe(true);
    });

    it('should report isAvailable: false when INITIAL_ADMIN_SETUP_SECRET is not configured', async () => {
      delete process.env.INITIAL_ADMIN_SETUP_SECRET;
      const res = await request(app).get('/api/v1/admin/initial-registration/status');
      expect(res.status).toBe(200);
      expect(res.body.data.isAvailable).toBe(false);
      expect(res.body.data.reason).toBe('SETUP_SECRET_NOT_CONFIGURED');
    });

    it('should report isAvailable: false when a Super Admin already exists in DB', async () => {
      const passwordHash = await hashPassword('ExistingPass123!');
      await User.create({
        firstName: 'Existing',
        email: 'existing@admin.in',
        passwordHash,
        role: ROLES.SUPER_ADMIN,
        status: 'active'
      });

      const res = await request(app).get('/api/v1/admin/initial-registration/status');
      expect(res.status).toBe(200);
      expect(res.body.data.isAvailable).toBe(false);
      expect(res.body.data.reason).toBe('SUPER_ADMIN_ALREADY_EXISTS');
    });
  });

  describe('2. Browser-Based Initial Super Admin Registration', () => {
    it('should reject registration when setup authorization secret is missing', async () => {
      const { setupSecret, ...payloadWithoutSecret } = validAdminPayload;
      const res = await request(app)
        .post('/api/v1/admin/initial-registration')
        .send(payloadWithoutSecret);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration when setup secret is incorrect (timing-safe check)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/initial-registration')
        .send({
          ...validAdminPayload,
          setupSecret: 'wrong_secret_key_provided'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid setup authorization secret/i);
    });

    it('should reject registration when password does not satisfy complexity requirements', async () => {
      const res = await request(app)
        .post('/api/v1/admin/initial-registration')
        .send({
          ...validAdminPayload,
          password: 'simple',
          confirmPassword: 'simple'
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration when confirmPassword does not match password', async () => {
      const res = await request(app)
        .post('/api/v1/admin/initial-registration')
        .send({
          ...validAdminPayload,
          confirmPassword: 'MismatchPassword123!'
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body.details)).toMatch(/passwords do not match/i);
    });

    it('should successfully create the initial Super Admin account and record audit log', async () => {
      const res = await request(app)
        .post('/api/v1/admin/initial-registration')
        .send(validAdminPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(validAdminPayload.email);
      expect(res.body.data.user.role).toBe(ROLES.SUPER_ADMIN);
      expect(res.body.data.accessToken).toBeUndefined(); // Does not issue automatic session
      expect(res.headers['set-cookie']).toBeUndefined(); // Does not issue refresh cookie

      // Verify in DB
      const dbUser = await User.findOne({ email: validAdminPayload.email });
      expect(dbUser).toBeDefined();
      expect(dbUser.role).toBe(ROLES.SUPER_ADMIN);
      expect(dbUser.status).toBe('active');
      expect(dbUser.isEmailVerified).toBe(true);

      // Verify lock created and locked
      const lock = await AdminSetupLock.findOne({ _id: 'initial_super_admin_setup' });
      expect(lock).toBeDefined();
      expect(lock.isLocked).toBe(true);
      expect(lock.superAdminId.toString()).toBe(dbUser._id.toString());

      // Verify Audit Log
      const audit = await AuditLog.findOne({ action: 'INITIAL_SUPER_ADMIN_REGISTERED' });
      expect(audit).toBeDefined();
      expect(audit.actorEmail).toBe(validAdminPayload.email);
    });
  });

  describe('3. Permanent Closure & Concurrency Prevention', () => {
    it('should permanently close initial registration once the first Super Admin is created', async () => {
      // 1. Create first admin
      const firstRes = await request(app)
        .post('/api/v1/admin/initial-registration')
        .send(validAdminPayload);
      expect(firstRes.status).toBe(201);

      // 2. Attempt second registration
      const secondRes = await request(app)
        .post('/api/v1/admin/initial-registration')
        .send({
          ...validAdminPayload,
          email: 'secondadmin@example.in'
        });

      expect([403, 409]).toContain(secondRes.status);
      expect(secondRes.body.success).toBe(false);
      expect(secondRes.body.message).toMatch(/closed|already exists/i);
    });

    it('should prevent concurrent requests from creating multiple Super Admins', async () => {
      // Fire two parallel registration requests
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/v1/admin/initial-registration')
          .send({
            ...validAdminPayload,
            email: 'concurrent1@example.in'
          }),
        request(app)
          .post('/api/v1/admin/initial-registration')
          .send({
            ...validAdminPayload,
            email: 'concurrent2@example.in'
          })
      ]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(201);
      // The other request must fail with 409 Conflict
      expect(statuses).toContain(409);

      // Verify only 1 Super Admin exists in the database
      const adminCount = await User.countDocuments({ role: ROLES.SUPER_ADMIN });
      expect(adminCount).toBe(1);
    });
  });

  describe('4. Dedicated Admin Portal Login & Session Life-Cycle', () => {
    let superAdminUser;
    let customerUser;
    let suspendedStaff;

    beforeEach(async () => {
      const pass = await hashPassword('AdminPass123!');
      superAdminUser = await User.create({
        firstName: 'Boss',
        email: 'boss@admin.in',
        passwordHash: pass,
        role: ROLES.SUPER_ADMIN,
        status: 'active'
      });

      customerUser = await User.create({
        firstName: 'Regular',
        email: 'shopper@customer.in',
        passwordHash: pass,
        role: ROLES.CUSTOMER,
        status: 'active'
      });

      suspendedStaff = await User.create({
        firstName: 'Suspended',
        email: 'suspended@admin.in',
        passwordHash: pass,
        role: ROLES.STORE_MANAGER,
        status: 'suspended'
      });
    });

    it('should reject admin login with invalid password (401)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/login')
        .send({
          email: 'boss@admin.in',
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject customer accounts attempting to log into the admin portal (403)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/login')
        .send({
          email: 'shopper@customer.in',
          password: 'AdminPass123!'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/staff privileges/i);
    });

    it('should reject suspended staff members attempting to log into the admin portal (403)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/login')
        .send({
          email: 'suspended@admin.in',
          password: 'AdminPass123!'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/suspended/i);
    });

    it('should successfully authenticate Super Admin and issue accessToken & HttpOnly refresh cookie', async () => {
      const res = await request(app)
        .post('/api/v1/admin/login')
        .send({
          email: 'boss@admin.in',
          password: 'AdminPass123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('boss@admin.in');
      expect(res.body.data.user.role).toBe(ROLES.SUPER_ADMIN);
      expect(res.body.data.accessToken).toBeDefined();

      // Check HttpOnly refresh cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
    });

    it('should allow Super Admin to access protected /api/v1/admin/me', async () => {
      const token = generateAccessToken(superAdminUser);
      const res = await request(app)
        .get('/api/v1/admin/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('boss@admin.in');
      expect(res.body.data.isSuperAdmin).toBe(true);
    });

    it('should successfully log out and invalidate the session', async () => {
      const loginRes = await request(app)
        .post('/api/v1/admin/login')
        .send({
          email: 'boss@admin.in',
          password: 'AdminPass123!'
        });

      const cookies = loginRes.headers['set-cookie'];

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);
    });

    it('should automatically provision and authenticate Super Admin using ADMIN_EMAIL and ADMIN_PASSWORD from environment', async () => {
      process.env.ADMIN_EMAIL = 'env_admin@aurora.com';
      process.env.ADMIN_PASSWORD = 'EnvSuperAdmin@2026!';

      const loginRes = await request(app)
        .post('/api/v1/admin/login')
        .send({
          email: 'env_admin@aurora.com',
          password: 'EnvSuperAdmin@2026!'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.user.email).toBe('env_admin@aurora.com');
      expect(loginRes.body.data.user.role).toBe(ROLES.SUPER_ADMIN);
      expect(loginRes.body.data.accessToken).toBeDefined();

      const createdUser = await User.findOne({ email: 'env_admin@aurora.com' });
      expect(createdUser).toBeDefined();
      expect(createdUser.role).toBe(ROLES.SUPER_ADMIN);
      expect(createdUser.isEmailVerified).toBe(true);
    });

    it('should update password and authenticate when ADMIN_PASSWORD in environment is updated', async () => {
      process.env.ADMIN_EMAIL = 'env_admin@aurora.com';
      process.env.ADMIN_PASSWORD = 'NewEnvPassword@2026!';

      // Old password should fail
      const failedRes = await request(app)
        .post('/api/v1/admin/login')
        .send({
          email: 'env_admin@aurora.com',
          password: 'OldWrongPassword!'
        });
      expect(failedRes.status).toBe(401);

      // New password matches updated env
      const successRes = await request(app)
        .post('/api/v1/admin/login')
        .send({
          email: 'env_admin@aurora.com',
          password: 'NewEnvPassword@2026!'
        });
      expect(successRes.status).toBe(200);
      expect(successRes.body.success).toBe(true);
    });
  });

  describe('5. Staff Management Defenses & Role Protections', () => {
    let superAdmin;
    let superAdminToken;
    let storeManager;
    let storeManagerToken;

    beforeEach(async () => {
      const pass = await hashPassword('AdminPass123!');
      superAdmin = await User.create({
        firstName: 'Owner',
        email: 'owner@admin.in',
        passwordHash: pass,
        role: ROLES.SUPER_ADMIN,
        status: 'active'
      });
      superAdminToken = generateAccessToken(superAdmin);

      storeManager = await User.create({
        firstName: 'Manager',
        email: 'manager@admin.in',
        passwordHash: pass,
        role: ROLES.STORE_MANAGER,
        status: 'active'
      });
      storeManagerToken = generateAccessToken(storeManager);
    });

    it('should reject creating another Super Admin via staff management API', async () => {
      const res = await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          firstName: 'Illegal',
          email: 'illegal@superadmin.in',
          password: 'StrongPassword123!',
          role: ROLES.SUPER_ADMIN
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot be created via staff management/i);
    });

    it('should allow Super Admin to create a store_manager account', async () => {
      const res = await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          firstName: 'New',
          lastName: 'Manager',
          email: 'newmanager@store.in',
          password: 'StrongPassword123!',
          role: ROLES.STORE_MANAGER
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.staff.role).toBe(ROLES.STORE_MANAGER);
    });

    it('should reject demoting or suspending the last active Super Admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/staff/${superAdmin._id}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          role: ROLES.STORE_MANAGER,
          status: 'suspended'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should prevent store_manager from accessing staff management (/admin/staff)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${storeManagerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should prevent store_manager from accessing audit logs (/admin/audit-logs)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${storeManagerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
