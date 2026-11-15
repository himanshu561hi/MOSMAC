import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

/**
 * Formats a successful response envelope
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default 200)
 * @param {string} message - Human-readable success message
 * @param {any} data - Response payload
 * @param {Object|null} meta - Optional pagination or auxiliary metadata
 */
export function sendSuccess(res, statusCode = HTTP_STATUS.OK, message = 'Success', data = {}, meta = null) {
  const payload = {
    success: true,
    statusCode,
    message,
    data
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

/**
 * Formats an error response envelope
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Stable error code string
 * @param {string} message - Safe error message
 * @param {any} details - Field-level details or array
 * @param {string} requestId - Tracking request id
 */
export function sendError(res, statusCode, code, message, details = null, requestId = null) {
  const payload = {
    success: false,
    statusCode,
    code,
    message
  };

  if (details && (Array.isArray(details) ? details.length > 0 : Object.keys(details).length > 0)) {
    payload.details = details;
  }

  if (requestId) {
    payload.requestId = requestId;
  }

  return res.status(statusCode).json(payload);
}

export default {
  sendSuccess,
  sendError
};

