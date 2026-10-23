import { Request, Response } from 'express';
import { normalizePhone } from '../../utils/phone';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import * as authService from './auth.service';

export const handleRequestOtp = asyncHandler(async (req: Request, res: Response) => {
  const phone = normalizePhone(req.body.phone);

  if (!phone) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid Indian phone number. Use 10 digits or +91 format.');
  }

  const result = await authService.requestOtp(phone);

  res.json({
    message: 'OTP sent successfully (check server console)',
    expiresInSeconds: result.expiresInSeconds,
  });
});

export const handleVerifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const phone = normalizePhone(req.body.phone);

  if (!phone) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid Indian phone number');
  }

  const result = await authService.verifyOtp(phone, req.body.otp);

  res.json(result);
});
