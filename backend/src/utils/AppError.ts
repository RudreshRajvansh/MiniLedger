/**
 * Custom error class that carries an HTTP status code and a machine-readable error code.
 * The centralized error handler uses these to build a consistent API response.
 *
 * Why a custom class? Express doesn't have a built-in way to attach status codes to errors.
 * This lets us throw `new AppError(404, 'NOT_FOUND', 'Loan not found')` from anywhere
 * and have it automatically become a proper JSON error response.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown[];

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown[],
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Fix prototype chain (needed when extending built-in classes in TS)
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
