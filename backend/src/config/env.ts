import "dotenv/config";
import { z } from "zod";

const schema = z
  .object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(16),
  NEON_AUTH_BASE_URL: z.string().url().optional(),
  NEON_AUTH_JWKS_URL: z.string().url().optional(),
  ORGANIZER_EMAILS: z.string().default("organizer@example.com,admin@admin.com"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1).default(""),
  HOLD_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  QUEUE_ADMIT_BATCH_SIZE: z.coerce.number().int().positive().default(25),
  QUEUE_ADMIT_INTERVAL_MS: z.coerce.number().int().positive().default(3000)
})
  .refine(
    (value) => Boolean(value.REDIS_URL) || Boolean(value.UPSTASH_REDIS_REST_URL && value.UPSTASH_REDIS_REST_TOKEN),
    "Set either REDIS_URL or both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN"
  );

export const env = schema.parse(process.env);
