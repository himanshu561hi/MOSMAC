import { ApiError } from '../utils/ApiError.js';
import { sendError } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import logger from '../utils/logger.js';
import { captureException } from '../utils/sentry.js';
import env from '../config/env.js';

export function errorHandler(err, req, res, next) {
  const requestId = req.headers['x-request-id'] || req.id || `req_${Date.now()}`;

  // Log and capture all non-operational and server errors
  if (!err.isOperational || err.statusCode >= 500) {
    logger.error(`Unhandled error during request [${req.method} ${req.originalUrl}]:`, {
      requestId,
      route: req.originalUrl,
      statusCode: err.statusCode || 500,
      errorCategory: err.code || 'UNHANDLED_ERROR',
      error: err
    });

    captureException(err, {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: err.statusCode || 500
    });
  }

  // 1. Handled Operational ApiError
  if (err instanceof ApiError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details, requestId);
  }

  // 2. Zod Validation Error
  if (err.name === 'ZodError') {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    const summaryMsg = details.length > 0
      ? `Validation failed: ${details.map((d) => (d.field ? `${d.field}: ${d.message}` : d.message)).join(', ')}`
      : 'Validation failed for incoming request data';
    return sendError(
      res,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      ERROR_CODES.VALIDATION_ERROR,
      summaryMsg,
      details,
      requestId
    );
  }

  // 3. Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const duplicateFields = Object.keys(err.keyValue || {});
    const field = duplicateFields[0] || 'field';
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      ERROR_CODES.RESOURCE_CONFLICT,
      `A record with this ${field} already exists`,
      [{ field, message: `${field} must be unique` }],
      requestId
    );
  }

  // 4. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message
    }));
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      'Database document validation failed',
      details,
      requestId
    );
  }

  // 5. Mongoose Cast Error (Invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.BAD_REQUEST,
      `Invalid format for resource identifier: ${err.path}`,
      null,
      requestId
    );
  }

  // 6. JSON Syntax Error in Body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.BAD_REQUEST,
      'Malformed JSON payload in request body',
      null,
      requestId
    );
  }

  // 7. Database Connection / Timeout Failures
  if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoTimeoutError' ||
    err.name === 'MongooseServerSelectionError'
  ) {
    return sendError(
      res,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      'Database service is temporarily unavailable. Please retry shortly.',
      null,
      requestId
    );
  }

  // 8. Generic Fallback
  const safeMessage = env.NODE_ENV === 'production'
    ? 'An unexpected internal error occurred. Please contact support.'
    : err.message || 'Internal server error';

  return sendError(
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    safeMessage,
    env.NODE_ENV === 'development' ? { stack: err.stack } : null,
    requestId
  );
}

export default errorHandler;

