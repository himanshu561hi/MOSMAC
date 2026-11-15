import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Stable machine-readable error code
   * @param {string} message - Human-readable error message
   * @param {Array<Object>|Object|null} details - Optional field-level error details
   */
  constructor(
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code = ERROR_CODES.INTERNAL_SERVER_ERROR,
    message = 'An unexpected error occurred',
    details = null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Invalid request', code = ERROR_CODES.BAD_REQUEST, details = null) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, code, message, details);
  }

  static unauthorized(message = 'Authentication required', code = ERROR_CODES.UNAUTHORIZED) {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, code, message);
  }

  static forbidden(message = 'Access forbidden', code = ERROR_CODES.FORBIDDEN) {
    return new ApiError(HTTP_STATUS.FORBIDDEN, code, message);
  }

  static notFound(message = 'Resource not found', code = ERROR_CODES.NOT_FOUND) {
    return new ApiError(HTTP_STATUS.NOT_FOUND, code, message);
  }

  static conflict(message = 'Resource conflict', code = ERROR_CODES.CONFLICT, details = null) {
    return new ApiError(HTTP_STATUS.CONFLICT, code, message, details);
  }

  static unprocessable(message = 'Validation failed', details = null) {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, ERROR_CODES.VALIDATION_ERROR, message, details);
  }

  static tooManyRequests(message = 'Rate limit exceeded, please try again later', code = ERROR_CODES.RATE_LIMIT_EXCEEDED) {
    return new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, code, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_SERVER_ERROR, message);
  }
}

export default ApiError;

