import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env before validation so process.env is populated
dotenv.config();

/**
 * Validate ALL required env vars at startup using zod.
 * If any are missing or invalid, the server crashes immediately
 * with a clear error message — much better than a cryptic runtime error later.
 */
const envSchema = z.object({
  PORT: z
    .string()
    .default('3000')
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535)),

  DATABASE_URL: z
    .string()
    .url()
    .startsWith('postgresql://', 'Must be a PostgreSQL connection string'),

  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters for security'),

  OTP_TTL_SECONDS: z
    .string()
    .default('300')
    .transform(Number)
    .pipe(z.number().int().min(60).max(600)),

  UPLOAD_DIR: z.string().default('uploads'),

  PUBLIC_BASE_URL: z
    .string()
    .url()
    .default('http://localhost:3000'),
});

// Parse and export — throws with details if validation fails
function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();

// Re-export the inferred type so other files can use it
export type Env = z.infer<typeof envSchema>;
