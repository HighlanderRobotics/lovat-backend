import { z } from 'zod';

const EnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    API_VERSION: z.string().default('0.1.0'),
    AUTH0_DOMAIN: z.string().min(1),
    AUTH0_AUDIENCE: z.string().url().default('https://api.lovat.app'),
    TBA_KEY: z.string().min(1).optional(),
    DATABASE_URL: z.string().min(1).optional(),
    PGHOST: z.string().min(1).optional(),
    PGPORT: z.coerce.number().int().positive().optional(),
    PGUSER: z.string().min(1).optional(),
    PGPASSWORD: z.string().optional(),
    PGDATABASE: z.string().min(1).optional(),
  })
  .superRefine((environment, context) => {
    if (!environment.DATABASE_URL && !environment.PGHOST) {
      context.addIssue({
        code: 'custom',
        message: 'DATABASE_URL or PostgreSQL environment variables are required',
        path: ['DATABASE_URL'],
      });
    }
  });

export type Environment = z.infer<typeof EnvironmentSchema>;

export function loadEnvironment(
  input: Record<string, string | undefined> = process.env
): Environment {
  const result = EnvironmentSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}
