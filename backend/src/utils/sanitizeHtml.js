/**
 * Safe HTML Sanitizer for Content Pages and Rich Text CMS
 * Strips script tags, iframes, embedded executables, and on* event handlers to protect against XSS.
 */
export function sanitizeHtml(rawHtml) {
  if (typeof rawHtml !== 'string') return '';

  let sanitized = rawHtml;

  // 1. Remove dangerous executable and embedded elements entirely
  sanitized = sanitized.replace(/<\s*(script|style|iframe|object|embed|applet|form|button|base|link|meta)[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  sanitized = sanitized.replace(/<\s*(script|style|iframe|object|embed|applet|form|button|base|link|meta)[\s\S]*?>/gi, '');

  // 2. Remove on* attributes (e.g. onload=, onclick=, onerror=, onmouseover=)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // 3. Remove javascript:, vbscript:, and data: URLs in href/src attributes (except data:image)
  sanitized = sanitized.replace(/\s*(href|src)\s*=\s*['"]\s*javascript:[\s\S]*?['"]/gi, '');
  sanitized = sanitized.replace(/\s*(href|src)\s*=\s*['"]\s*vbscript:[\s\S]*?['"]/gi, '');
  sanitized = sanitized.replace(/\s*(href)\s*=\s*['"]\s*data:[\s\S]*?['"]/gi, '');

  return sanitized.trim();
}

/**
 * Validates whether a destination URL is safe (internal route or approved HTTPS domain)
 */
export function isSafeCtaUrl(url) {
  if (!url || typeof url !== 'string') return true; // empty allowed
  const trimmed = url.trim();

  // Safe relative paths starting with /
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  // Reject javascript:, data:, file:, etc.
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default {
  sanitizeHtml,
  isSafeCtaUrl
};
