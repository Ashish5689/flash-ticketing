import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65_535).default(4000),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://postgres:postgres@localhost:5433/movie_ticketing'),
  DATABASE_MIGRATION_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().default('redis://localhost:6380'),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  AWS_REGION: z.string().min(1).default('ap-south-1'),
  AWS_PROFILE: z.string().min(1).optional(),
  AWS_S3_BUCKET: z.string().min(3).optional(),
  MEDIA_PUBLIC_BASE_URL: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_test_').optional(),
  ADMIN_SEED_EMAIL: z.string().email().optional(),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60),
  JWT_REFRESH_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(30 * 24 * 60 * 60),
  REFRESH_COOKIE_NAME: z.string().min(1).default('bms_refresh'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
}

if (
  parsedEnv.data.NODE_ENV === 'production' &&
  (!parsedEnv.data.JWT_ACCESS_SECRET || !parsedEnv.data.JWT_REFRESH_SECRET)
) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required in production');
}

export const env = parsedEnv.data;
export type Environment = typeof env;
