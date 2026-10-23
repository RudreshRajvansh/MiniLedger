import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../../config/db';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';

/**
 * Hash an OTP using SHA-256.
 *
 * Why SHA-256 instead of bcrypt? The OTP is 6 digits with a 5-minute expiry
 * and max 5 attempts — brute-force is already mitigated. SHA-256 is fast and
 * sufficient here. Bcrypt's slow hashing is valuable for passwords (which have
 * long lifespans and higher entropy), but overkill for short-lived OTPs.
 */
function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Constant-time comparison for OTP hashes.
 * Prevents timing attacks where an attacker measures response time
 * to guess how many characters of the hash matched.
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ─── Request OTP ──────────────────────────────────────────────

export async function requestOtp(phone: string): Promise<{ expiresInSeconds: number }> {
  // Check if there's a recent unconsumed OTP for this phone (rate limit per phone)
  const recent = await query(
    `SELECT id FROM otps
     WHERE phone = $1 AND consumed_at IS NULL
       AND created_at > now() - INTERVAL '30 seconds'
     LIMIT 1`,
    [phone],
  );

  if (recent.rows.length > 0) {
    throw new AppError(429, 'RATE_LIMITED', 'Please wait 30 seconds before requesting another OTP');
  }

  // Invalidate any older unconsumed OTPs for this phone
  await query(
    `UPDATE otps SET consumed_at = now()
     WHERE phone = $1 AND consumed_at IS NULL`,
    [phone],
  );

  // Generate a 6-digit OTP using crypto.randomInt (cryptographically secure)
  const otp = crypto.randomInt(100000, 999999).toString();
  const hash = hashOtp(otp);
  const ttl = env.OTP_TTL_SECONDS;

  await query(
    `INSERT INTO otps (phone, code_hash, expires_at)
     VALUES ($1, $2, now() + $3 * INTERVAL '1 second')`,
    [phone, hash, ttl],
  );

  // Print OTP to console — this is the "mock SMS" for development
  console.log(`\n${'='.repeat(50)}`);
  console.log(`[MOCK OTP] ${phone} -> ${otp} (valid for ${Math.floor(ttl / 60)} minutes)`);
  console.log(`${'='.repeat(50)}\n`);

  return { expiresInSeconds: ttl };
}

// ─── Verify OTP ───────────────────────────────────────────────

interface VerifyResult {
  token: string;
  user: { id: string; phone: string };
}

export async function verifyOtp(phone: string, otp: string): Promise<VerifyResult> {
  // Get the latest unconsumed, unexpired OTP for this phone
  const result = await query<{
    id: string;
    code_hash: string;
    attempts: number;
    expires_at: Date;
  }>(
    `SELECT id, code_hash, attempts, expires_at
     FROM otps
     WHERE phone = $1 AND consumed_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone],
  );

  if (result.rows.length === 0) {
    throw new AppError(400, 'INVALID_OTP', 'No valid OTP found. Please request a new one.');
  }

  const otpRow = result.rows[0];

  // Lock after 5 failed attempts
  if (otpRow.attempts >= 5) {
    throw new AppError(400, 'OTP_LOCKED', 'Too many failed attempts. Please request a new OTP.');
  }

  // Constant-time hash comparison
  const inputHash = hashOtp(otp);
  const isValid = safeCompare(inputHash, otpRow.code_hash);

  if (!isValid) {
    // Increment attempt counter
    await query('UPDATE otps SET attempts = attempts + 1 WHERE id = $1', [otpRow.id]);
    throw new AppError(400, 'INVALID_OTP', 'Incorrect OTP');
  }

  // Mark OTP as consumed (can't be reused)
  await query('UPDATE otps SET consumed_at = now() WHERE id = $1', [otpRow.id]);

  // Upsert user: create if new, return existing if already registered
  const userResult = await query<{ id: string; phone: string }>(
    `INSERT INTO users (phone)
     VALUES ($1)
     ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
     RETURNING id, phone`,
    [phone],
  );

  const user = userResult.rows[0];

  // Sign JWT with 7-day expiry; payload contains only the user ID
  const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: '7d' });

  return { token, user: { id: user.id, phone: user.phone } };
}
