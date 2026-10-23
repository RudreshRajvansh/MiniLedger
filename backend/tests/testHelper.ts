import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { pool as testPool } from '../src/config/db';
import { env } from '../src/config/env';

export { testPool };

/**
 * Runs all migrations on the test database.
 */
export async function migrateTestDb(): Promise<void> {
  const migrationsDir = path.join(__dirname, '../src/db/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    await testPool.query(sql);
  }
}

/**
 * Truncates all tables in the test database to ensure a clean slate between test runs.
 */
export async function cleanTestDb(): Promise<void> {
  await testPool.query(`
    TRUNCATE TABLE loans, otps, users CASCADE;
  `);
}

/**
 * Helper to create a user directly in DB and generate a valid JWT token.
 */
export async function createTestUser(phone: string = '+919876543210'): Promise<{
  id: string;
  phone: string;
  token: string;
}> {
  const res = await testPool.query<{ id: string; phone: string }>(
    `INSERT INTO users (phone)
     VALUES ($1)
     ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
     RETURNING id, phone`,
    [phone],
  );

  const user = res.rows[0];
  const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: '7d' });

  return { id: user.id, phone: user.phone, token };
}

/**
 * Helper to fetch the latest unconsumed OTP code_hash for a phone.
 */
export async function getLatestOtpRow(phone: string) {
  const res = await testPool.query(
    `SELECT * FROM otps WHERE phone = $1 ORDER BY created_at DESC LIMIT 1`,
    [phone],
  );
  return res.rows[0];
}
