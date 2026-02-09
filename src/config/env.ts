import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive(),

  BASE_URL: z.string().url(),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),

  AUTH0_DOMAIN: z.string().min(1),

  LOVAT_WEBSITE: z.string().url(),

  TBA_KEY: z.string().min(1),

  RESEND_KEY: z.string().min(1),

  LOVAT_SIGNING_KEY: z.string().length(32), // 16 bytes hex → 32 chars

  SLACK_CLIENT_SECRET: z.string().min(1),
  SLACK_CLIENT_ID: z.string().min(1),
  SLACK_VERIFICATION_KEY: z.string().min(1),
  SLACK_APP_ID: z.string().min(1),

  POSTHOG_PROJECT_API_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
