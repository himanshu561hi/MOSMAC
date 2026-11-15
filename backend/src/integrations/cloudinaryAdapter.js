import crypto from 'crypto';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validates image metadata before client upload
 * @param {string} mimeType 
 * @param {number} sizeBytes 
 */
export function validateImageUploadRequest(mimeType, sizeBytes) {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw ApiError.badRequest(
      `Invalid image MIME type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw ApiError.badRequest(
      `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`
    );
  }
}

/**
 * Generates Cloudinary signed upload credentials for secure direct browser-to-Cloudinary upload.
 * Secrets never leave the server.
 * @param {string} folder 
 * @returns {{ signature: string, timestamp: number, folder: string, apiKey: string, cloudName: string }}
 */
export function generateSignedUploadParams(folder = 'ecommerce/products') {
  const timestamp = Math.round(new Date().getTime() / 1000);

  // If in mock or test without credentials, provide predictable mock params
  if (!env.CLOUDINARY_API_SECRET || !env.CLOUDINARY_API_KEY) {
    logger.info('[Cloudinary Adapter] Generating mock signed upload params');
    return {
      timestamp,
      signature: `mock_sig_${timestamp}`,
      folder,
      apiKey: env.CLOUDINARY_API_KEY || 'mock_api_key',
      cloudName: env.CLOUDINARY_CLOUD_NAME || 'mock_cloud'
    };
  }

  // Cloudinary signature calculation:
  // Sort parameters alphabetically, join with '=', '&', append API secret, compute SHA-1
  const paramsToSign = {
    folder,
    timestamp
  };

  const serialized = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join('&');

  const stringToSign = `${serialized}${env.CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

  return {
    timestamp,
    signature,
    folder,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME
  };
}

/**
 * Deletes an image asset from Cloudinary
 * @param {string} publicId 
 * @returns {Promise<{ success: boolean, result?: string }>}
 */
export async function deleteCloudinaryAsset(publicId) {
  if (!publicId) return { success: false, message: 'Missing publicId' };

  if (!env.CLOUDINARY_API_SECRET || !env.CLOUDINARY_API_KEY || env.NODE_ENV === 'test') {
    logger.info(`[Cloudinary Adapter Mock] Deleting asset: ${publicId}`);
    return { success: true, result: 'ok' };
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    const formData = new URLSearchParams({
      public_id: publicId,
      timestamp: timestamp.toString(),
      api_key: env.CLOUDINARY_API_KEY,
      signature
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      }
    );

    const data = await response.json();
    logger.info(`[Cloudinary Adapter Destroy] Result:`, data);
    return { success: data.result === 'ok', result: data.result };
  } catch (err) {
    logger.error('Failed to destroy Cloudinary image:', err);
    return { success: false, error: err.message };
  }
}

export default {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  validateImageUploadRequest,
  generateSignedUploadParams,
  deleteCloudinaryAsset
};

