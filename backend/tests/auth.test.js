import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import env from '../src/config/env.js';
import { hashPassword } from '../src/services/passwordService.js';
import { generateAccessToken } from '../src/services/tokenService.js';
import { ROLES } from '../src/constants/roles.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Phase 2 — Authentication & Authorization Test Suite', () => {
  const validUserData = {
    email: 'testcustomer@example.in',
    password: 'SecurePassword123!',
    firstName: 'Aarav',
    lastName: 'Patel',
    phone: '9876543210'
  };

  describe('1. Customer Registration', () => {
    it('should successfully register a customer with valid payload and return access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(validUserData.email);
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Never expose password hash
      expect(res.body.data.accessToken).toBeDefined();

      // Check HttpOnly refresh cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('should reject registration with duplicate email with 409 Conflict', async () => {
      await request(app).post('/api/v1/auth/register').send(validUserData);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('RESOURCE_CONFLICT');
      expect(res.body.message).toContain('already exists');
    });

    it('should reject registration with invalid email format with 422 Unprocessable', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUserData, email: 'not-an-email' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'email' })])
      );
    });

    it('should reject registration with weak password (missing symbols/digits/uppercase)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUserData, email: 'valid@example.in', password: 'weak' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'password' })])
      );
    });
  });

  describe('2. Customer & Staff Login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUserData);
    });

    it('should successfully login with correct credentials and rotate refresh cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUserData.email);
      expect(res.body.data.accessToken).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies[0]).toContain('refreshToken=');
    });

    it('should reject login with incorrect password with 401 Invalid Credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUserData.email,
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login for non-existent email with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'ghost@example.in',
          password: 'AnyPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('3. Token Authentication & Access Control', () => {
    let accessToken;
    let registeredUser;

    beforeEach(async () => {
      const res = await request(app).post('/api/v1/auth/register').send(validUserData);
      accessToken = res.body.data.accessToken;
      registeredUser = res.body.data.user;
    });

    it('should allow customer to access GET /api/v1/auth/me with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUserData.email);
    });

    it('should reject access without Authorization header with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should reject expired access token with 401 TOKEN_EXPIRED', async () => {
      // Craft an expired JWT signed with same key
      const expiredToken = jwt.sign(
        { sub: registeredUser._id, role: registeredUser.role, tokenVersion: 1 },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('4. Refresh Token Rotation & Reuse Detection', () => {
    it('should rotate refresh token and issue new access token on POST /api/v1/auth/refresh', async () => {
      const registerRes = await request(app).post('/api/v1/auth/register').send(validUserData);
      const refreshCookie = registerRes.headers['set-cookie'];

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();

      // Ensure a NEW refresh token cookie was set (rotation)
      const newCookie = refreshRes.headers['set-cookie'];
      expect(newCookie).toBeDefined();
      expect(newCookie[0]).not.toEqual(refreshCookie[0]);
    });

    it('should detect refresh token reuse, revoke all sessions, and reject with 401', async () => {
      const registerRes = await request(app).post('/api/v1/auth/register').send(validUserData);
      const originalCookie = registerRes.headers['set-cookie'];

      // First refresh: Legitimate rotation
      const firstRefresh = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', originalCookie);
      expect(firstRefresh.status).toBe(200);

      // Second refresh using the ALREADY ROTATED originalCookie (Simulating attacker replay)
      const replayAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', originalCookie);

      expect(replayAttempt.status).toBe(401);
      expect(replayAttempt.body.success).toBe(false);
      expect(replayAttempt.body.message).toContain('Token reuse detected');

      // Verify that ALL sessions for this user were wiped
      const user = await User.findOne({ email: validUserData.email });
      expect(user.refreshSessions.length).toBe(0);
      expect(user.tokenVersion).toBeGreaterThan(1);
    });

    it('should clear refresh session and cookie on POST /api/v1/auth/logout', async () => {
      const loginRes = await request(app).post('/api/v1/auth/register').send(validUserData);
      const cookie = loginRes.headers['set-cookie'];

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', cookie);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Verify cookie cleared
      const setCookie = logoutRes.headers['set-cookie'][0];
      expect(setCookie).toMatch(/refreshToken=;.*Expires=/i);
    });

    it('should invalidate all active tokens and sessions on POST /api/v1/auth/logout-all', async () => {
      const loginRes = await request(app).post('/api/v1/auth/register').send(validUserData);
      const token = loginRes.body.data.accessToken;

      const logoutAllRes = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutAllRes.status).toBe(200);

      // Subsequent call with old access token must fail because tokenVersion incremented
      const subsequentCall = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(subsequentCall.status).toBe(401);
      expect(subsequentCall.body.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('5. Password Reset Flow', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUserData);
    });

    it('should generate single-use reset token and reset password successfully', async () => {
      // 1. Forgot password request
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: validUserData.email });
      expect(forgotRes.status).toBe(200);

      // 2. Fetch user to get raw token from method for test validation
      const user = await User.findOne({ email: validUserData.email });
      const rawToken = user.createPasswordResetToken();
      await user.save();

      // 3. Reset password with valid token
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: rawToken,
          password: 'NewStrongPassword123!'
        });
      expect(resetRes.status).toBe(200);
      expect(resetRes.body.message).toContain('Password has been reset successfully');

      // 4. Test single-use: Using the same token again must fail
      const reuseRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: rawToken,
          password: 'AnotherPassword123!'
        });
      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.code).toBe('INVALID_TOKEN');

      // 5. Verify login with NEW password
      const newLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUserData.email,
          password: 'NewStrongPassword123!'
        });
      expect(newLoginRes.status).toBe(200);
    });

    it('should reject expired password reset token with 400', async () => {
      const user = await User.findOne({ email: validUserData.email });
      const rawToken = user.createPasswordResetToken();
      user.passwordResetExpires = new Date(Date.now() - 1000); // Set in past
      await user.save();

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: rawToken,
          password: 'NewStrongPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });
  });

  describe('6. Role-Based Access Control & Admin Protection', () => {
    let customerToken;
    let adminToken;
    let superAdminUser;

    beforeEach(async () => {
      // Create Customer
      const custRes = await request(app).post('/api/v1/auth/register').send(validUserData);
      customerToken = custRes.body.data.accessToken;

      // Create Super Admin in DB
      const hashedPassword = await hashPassword('AdminSecurePass123!');
      superAdminUser = await User.create({
        email: 'superadmin@example.in',
        passwordHash: hashedPassword,
        firstName: 'System',
        lastName: 'Admin',
        role: ROLES.SUPER_ADMIN,
        status: 'active'
      });
      adminToken = generateAccessToken(superAdminUser);
    });

    it('should reject customer accessing /api/v1/admin/me with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(res.body.message).toContain('do not have permissions');
    });

    it('should allow Super Admin accessing /api/v1/admin/me with 200 OK', async () => {
      const res = await request(app)
        .get('/api/v1/admin/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(ROLES.SUPER_ADMIN);
      expect(res.body.data.isSuperAdmin).toBe(true);
    });

    it('should allow Super Admin to list users via /api/v1/admin/users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('should prevent non-admin from modifying another user status (IDOR protection)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${superAdminUser._id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'suspended' });

      expect(res.status).toBe(403);
    });
  });

  describe('7. Rate Limiting Protection', () => {
    it('should block repeated auth requests after threshold with 429 Too Many Requests', async () => {
      let lastStatus = 200;
      // Trigger requests with x-test-rate-limit header active
      for (let i = 0; i < 7; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .set('x-test-rate-limit', 'true')
          .send({ email: 'ratelimit@example.in', password: 'Password123!' });
        lastStatus = res.status;
      }

      expect(lastStatus).toBe(429);
    });
  });
});
