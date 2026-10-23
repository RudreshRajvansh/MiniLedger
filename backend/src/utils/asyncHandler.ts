import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler so we don't need try/catch in every route.
 *
 * Without this, an unhandled promise rejection in an async handler
 * would crash the process instead of reaching our error middleware.
 *
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
