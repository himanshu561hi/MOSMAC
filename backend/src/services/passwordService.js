import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt with cost factor 12
 * @param {string} plainPassword 
 * @returns {Promise<string>}
 */
export async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(plainPassword, salt);
}

/**
 * Compare plaintext password with stored hash
 * @param {string} plainPassword 
 * @param {string} hashedPassword 
 * @returns {Promise<boolean>}
 */
export async function comparePassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Generate a cryptographically secure random token (hex string)
 * @param {number} bytes 
 * @returns {string}
 */
export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Create a SHA-256 hash of a string (used for stored reset and verification tokens)
 * @param {string} token 
 * @returns {string}
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export default {
  hashPassword,
  comparePassword,
  generateRandomToken,
  hashToken
};

