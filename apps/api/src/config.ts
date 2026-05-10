import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  LOG_LEVEL: z.string().default('info'),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten())
  process.exit(1)
}

export const config = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(','),
  IS_PROD: parsed.data.NODE_ENV === 'production',
}
