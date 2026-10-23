import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * Validation middleware factory — validates req.body against a Zod schema.
 *
 * Why middleware instead of validating inside each controller?
 * Keeps controllers focused on business logic. Validation is a cross-cutting
 * concern — same pattern for every endpoint.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', details);
    }

    // Replace body with parsed data (applies transforms like .trim())
    req.body = result.data;
    next();
  };
}
