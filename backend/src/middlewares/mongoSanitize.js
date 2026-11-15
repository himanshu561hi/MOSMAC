/**
 * Recursively sanitizes an object against MongoDB query operator injection.
 * Removes keys starting with '$' or containing '.' from untrusted user inputs.
 * @param {any} target
 * @returns {any}
 */
export function sanitizeInput(target) {
  if (!target || typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    return target.map(sanitizeInput);
  }

  for (const key of Object.keys(target)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete target[key];
    } else {
      target[key] = sanitizeInput(target[key]);
    }
  }

  return target;
}

/**
 * Express middleware to prevent NoSQL operator injection in body, query, and params.
 */
export function mongoSanitize(req, res, next) {
  if (req.body) sanitizeInput(req.body);
  if (req.query) sanitizeInput(req.query);
  if (req.params) sanitizeInput(req.params);
  next();
}

export default mongoSanitize;

