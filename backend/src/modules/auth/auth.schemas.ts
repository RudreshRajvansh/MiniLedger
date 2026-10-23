import { z } from 'zod';

export const requestOtpSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
