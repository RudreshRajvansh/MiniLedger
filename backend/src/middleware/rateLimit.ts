import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

/**
 * IP-level rate limiter — prevents brute-force attacks.
 * 100 requests per 15 minutes per IP for general endpoints.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
    },
  },
});

/**
 * Stricter rate limit for OTP requests — 1 request per 30 seconds per IP.
 * Prevents OTP spam across IPs.
 */
export const otpLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 1,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Please wait 30 seconds before requesting another OTP',
    },
  },
});
