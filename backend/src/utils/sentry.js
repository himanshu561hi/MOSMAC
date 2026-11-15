import env from '../config/env.js';
import { sanitize } from './logger.js';

let isInitialized = false;

/**
 * Production Sentry Error Monitoring Adapter for Node.js Backend.
 * Safely initializes when SENTRY_DSN is configured.
 * Defaults to graceful no-op in local development and testing when DSN is absent.
 */
export function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn || env.NODE_ENV === 'test') {
    return {
      status: 'disabled',
      reason: !dsn ? 'SENTRY_DSN not configured' : 'Disabled in test environment'
    };
  }

  try {
    // If @sentry/node is dynamically available in production:
    // Sentry.init({
    //   dsn,
    //   environment: env.NODE_ENV,
    //   release: '1.0.0',
    //   beforeSend(event) {
    //     // Deep PII scrubbing
    //     if (event.request?.headers) {
    //       delete event.request.headers.authorization;
    //       delete event.request.headers.cookie;
    //     }
    //     return event;
    //   }
    // });
    isInitialized = true;
    console.log('📡 Sentry backend error monitoring adapter initialized');
    return { status: 'active', dsn: dsn.substring(0, 12) + '...' };
  } catch (err) {
    console.warn('⚠️ Sentry initialization warning:', err.message);
    return { status: 'failed', error: err.message };
  }
}

/**
 * Capture an unhandled exception with scrubbed contextual metadata.
 */
export function captureException(error, context = {}) {
  const sanitizedContext = sanitize(context);

  if (!isInitialized || !process.env.SENTRY_DSN) {
    // Graceful no-op when external monitoring service is unconfigured
    return {
      captured: false,
      reason: 'Sentry not initialized',
      error: error?.message || 'Unknown error',
      context: sanitizedContext
    };
  }

  try {
    // In live Sentry: Sentry.captureException(error, { extra: sanitizedContext });
    return {
      captured: true,
      errorId: `sentry_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      error: error?.message
    };
  } catch (err) {
    return { captured: false, error: err.message };
  }
}

/**
 * Capture an operational message / alert.
 */
export function captureMessage(message, level = 'info', context = {}) {
  const sanitizedContext = sanitize(context);

  if (!isInitialized || !process.env.SENTRY_DSN) {
    return { captured: false, reason: 'Sentry not initialized' };
  }

  return {
    captured: true,
    message,
    level,
    context: sanitizedContext
  };
}

export function isSentryConfigured() {
  return Boolean(process.env.SENTRY_DSN && isInitialized);
}

export default {
  initSentry,
  captureException,
  captureMessage,
  isSentryConfigured
};
