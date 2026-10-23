import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { AppError } from '../utils/AppError';

/**
 * Centralized error handler — the ONE place where all errors become JSON responses.
 *
 * Maps AppErrors, Multer upload errors, and unexpected errors to the unified
 * error response contract: { "error": { "code": "...", "message": "...", "details": [...] } }
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 1. Handled application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // 2. Multer file upload errors (e.g., file size exceeds 5 MB)
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds maximum allowed limit of 5 MB',
        },
      });
      return;
    }

    res.status(400).json({
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message,
      },
    });
    return;
  }

  // 3. Unknown/unexpected error — log for debugging, hide stack in production
  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled error:', err);
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'An unexpected error occurred' : err.message,
    },
  });
}
