import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { otpLimiter } from '../../middleware/rateLimit';
import { requestOtpSchema, verifyOtpSchema } from './auth.schemas';
import { handleRequestOtp, handleVerifyOtp } from './auth.controller';

const router = Router();

router.post('/request-otp', otpLimiter, validate(requestOtpSchema), handleRequestOtp);
router.post('/verify-otp', validate(verifyOtpSchema), handleVerifyOtp);

export default router;
