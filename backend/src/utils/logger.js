import env from '../config/env.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'authorization',
  'cookie',
  'cardnumber',
  'card_number',
  'cvv',
  'razorpay_signature',
  'secret',
  'key_secret',
  'webhook_secret',
  'smtp_pass',
  'client_secret',
  'apikey',
  'api_key'
]);

export function sanitize(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitize(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function buildLogEntry(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const environment = env.NODE_ENV || 'development';

  // Extract top-level standard fields if provided in meta
  const requestId = meta.requestId || meta.reqId || undefined;
  const route = meta.route || meta.path || meta.operation || undefined;
  const statusCode = meta.statusCode || meta.status || undefined;
  const durationMs = meta.durationMs || meta.duration || undefined;
  const errorCategory = meta.errorCategory || meta.code || undefined;

  // Filter extracted fields from remaining custom metadata
  const customMeta = { ...meta };
  delete customMeta.requestId;
  delete customMeta.reqId;
  delete customMeta.route;
  delete customMeta.path;
  delete customMeta.operation;
  delete customMeta.statusCode;
  delete customMeta.status;
  delete customMeta.durationMs;
  delete customMeta.duration;
  delete customMeta.errorCategory;
  delete customMeta.code;

  return {
    timestamp,
    level,
    environment,
    message,
    ...(requestId && { requestId }),
    ...(route && { route }),
    ...(statusCode && { statusCode }),
    ...(durationMs && { durationMs }),
    ...(errorCategory && { errorCategory }),
    ...(Object.keys(customMeta).length > 0 && { meta: sanitize(customMeta) })
  };
}

export const logger = {
  info: (message, meta = {}) => {
    if (env.NODE_ENV !== 'test') {
      console.log(JSON.stringify(buildLogEntry('INFO', message, meta)));
    }
  },
  warn: (message, meta = {}) => {
    if (env.NODE_ENV !== 'test') {
      console.warn(JSON.stringify(buildLogEntry('WARN', message, meta)));
    }
  },
  error: (message, error = {}) => {
    if (env.NODE_ENV !== 'test') {
      const errorMeta = error instanceof Error
        ? {
            errorMessage: error.message,
            stack: env.NODE_ENV === 'development' ? error.stack : undefined,
            name: error.name,
            code: error.code || error.statusCode
          }
        : error;

      console.error(JSON.stringify(buildLogEntry('ERROR', message, errorMeta)));
    }
  }
};

export default logger;
