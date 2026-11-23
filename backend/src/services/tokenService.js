import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { generateRandomToken, hashToken } from './passwordService.js';

export const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * Signs a short-lived access JWT (default 15 minutes)
 * @param {Object} user 
 * @returns {string}
 */
export function generateAccessToken(user) {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRATION || '15m'
  });
}

/**
 * Generates an opaque cryptographically random refresh token with composite session tracking
 * @returns {{ token: string, hashedToken: string, sessionId: string }}
 */
export function generateRefreshToken() {
  const secret = generateRandomToken(32);
  const sessionId = generateRandomToken(16);
  const hashedToken = hashToken(secret);
  const compositeToken = `${sessionId}.${secret}`;

  return {
    token: compositeToken,
    secret,
    hashedToken,
    sessionId
  };
}

/**
 * Parses composite refresh token string into sessionId and secret
 * @param {string} token 
 * @returns {{ sessionId: string, secret: string } | null}
 */
export function parseRefreshToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return {
    sessionId: parts[0],
    secret: parts[1]
  };
}

/**
 * Verifies and decodes an access token
 * @param {string} token 
 * @returns {Object}
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/**
 * Attach secure HttpOnly refresh cookie to response
 * @param {Object} res - Express response
 * @param {string} refreshToken - Raw refresh token string
 */
export function setRefreshCookie(res, refreshToken) {
  const isProd = env.NODE_ENV === 'production';
  const sameSite = isProd ? (env.COOKIE_SAME_SITE || 'none') : 'lax';

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {})
  });
}

/**
 * Clear the refresh cookie from response
 * @param {Object} res - Express response
 */
export function clearRefreshCookie(res) {
  const isProd = env.NODE_ENV === 'production';
  const sameSite = isProd ? (env.COOKIE_SAME_SITE || 'none') : 'lax';

  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {})
  });
}

export default {
  REFRESH_COOKIE_NAME,
  generateAccessToken,
  generateRefreshToken,
  parseRefreshToken,
  verifyAccessToken,
  setRefreshCookie,
  clearRefreshCookie
};
