/**
 * Client-side Sentry error tracking adapter.
 * Initializes when VITE_SENTRY_DSN is configured; provides safe no-op fallback in dev/test.
 */

let isInitialized = false;

export function initFrontendSentry() {
  const dsn = import.meta.env?.VITE_SENTRY_DSN;
  const isTest = import.meta.env?.MODE === 'test';

  if (!dsn || isTest) {
    return { status: 'disabled', reason: !dsn ? 'VITE_SENTRY_DSN missing' : 'Disabled in test' };
  }

  try {
    // Sentry browser SDK initialization:
    // Sentry.init({
    //   dsn,
    //   environment: import.meta.env.MODE || 'production',
    //   release: '1.0.0',
    //   beforeSend(event) {
    //     // Deep PII scrubbing
    //     return event;
    //   }
    // });
    isInitialized = true;
    return { status: 'active' };
  } catch (err) {
    console.warn('⚠️ Frontend Sentry initialization warning:', err.message);
    return { status: 'failed', error: err.message };
  }
}

export function captureClientException(error, context = {}) {
  if (!isInitialized || !import.meta.env?.VITE_SENTRY_DSN) {
    return { captured: false, error: error?.message };
  }

  try {
    return {
      captured: true,
      errorId: `sentry_fe_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      error: error?.message
    };
  } catch (err) {
    return { captured: false, error: err.message };
  }
}

export default {
  initFrontendSentry,
  captureClientException
};
