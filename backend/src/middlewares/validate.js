/**
 * Higher-order middleware function to validate incoming requests against Zod schemas.
 * Accepts either:
 * - A ZodObject with shape { body, query, params }
 * - A plain object { body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }
 * 
 * @param {Object|import('zod').ZodObject<any>} schemas
 */
export function validate(schemas) {
  return async (req, res, next) => {
    try {
      const bodySchema = schemas.shape?.body || schemas.body;
      const querySchema = schemas.shape?.query || schemas.query;
      const paramsSchema = schemas.shape?.params || schemas.params;

      if (bodySchema) {
        req.body = await bodySchema.parseAsync(req.body);
      }
      if (querySchema) {
        req.query = await querySchema.parseAsync(req.query);
      }
      if (paramsSchema) {
        req.params = await paramsSchema.parseAsync(req.params);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export default validate;
