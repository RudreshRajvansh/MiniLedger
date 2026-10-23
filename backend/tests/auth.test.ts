import request from 'supertest';
import crypto from 'crypto';
import { app } from '../src/app';
import { testPool, migrateTestDb, cleanTestDb, getLatestOtpRow } from './testHelper';

describe('Auth Module (OTP & JWT)', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await migrateTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  afterAll(async () => {
    await testPool.end();
  });

  describe('POST /api/auth/request-otp', () => {
    it('generates an OTP and stores the hashed code with expiry', async () => {
      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: '9876543210' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('OTP sent');
      expect(res.body.expiresInSeconds).toBe(300);
      // Crucial: OTP itself must NEVER be returned in response!
      expect(res.body.otp).toBeUndefined();

      const otpRow = await getLatestOtpRow('+919876543210');
      expect(otpRow).toBeDefined();
      expect(otpRow.phone).toBe('+919876543210');
      expect(otpRow.code_hash).toHaveLength(64); // SHA-256 hex string
    });

    it('rejects invalid phone numbers', async () => {
      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: '123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('enforces 30-second cooldown between OTP requests for same phone', async () => {
      // First request
      const res1 = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: '9876543210' });
      expect(res1.status).toBe(200);

      // Immediate second request
      const res2 = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: '9876543210' });

      expect(res2.status).toBe(429);
      expect(res2.body.error.code).toBe('RATE_LIMITED');
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    const phone = '+919876543210';
    const rawOtp = '123456';
    const codeHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    beforeEach(async () => {
      // Insert a known unconsumed OTP
      await testPool.query(
        `INSERT INTO otps (phone, code_hash, expires_at)
         VALUES ($1, $2, now() + INTERVAL '5 minutes')`,
        [phone, codeHash],
      );
    });

    it('verifies valid OTP, creates user, and returns JWT', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: rawOtp });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.phone).toBe(phone);

      // Verify OTP is now marked consumed
      const row = await getLatestOtpRow(phone);
      expect(row.consumed_at).not.toBeNull();
    });

    it('rejects incorrect OTP', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: '999999' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OTP');

      // Verify attempts counter was incremented
      const row = await getLatestOtpRow(phone);
      expect(row.attempts).toBe(1);
    });

    it('rejects expired OTP', async () => {
      // Mark OTP as expired
      await testPool.query(
        `UPDATE otps SET expires_at = now() - INTERVAL '1 minute' WHERE phone = $1`,
        [phone],
      );

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: rawOtp });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OTP');
    });

    it('prevents OTP reuse', async () => {
      // First verification succeeds
      const res1 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: rawOtp });
      expect(res1.status).toBe(200);

      // Second verification attempt fails
      const res2 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: rawOtp });
      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe('INVALID_OTP');
    });

    it('locks OTP after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/auth/verify-otp')
          .send({ phone: '9876543210', otp: '000000' });
        expect(res.status).toBe(400);
      }

      // 6th attempt with correct OTP should be blocked because it is locked
      const resLocked = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: rawOtp });

      expect(resLocked.status).toBe(400);
      expect(resLocked.body.error.code).toBe('OTP_LOCKED');
    });
  });
});
