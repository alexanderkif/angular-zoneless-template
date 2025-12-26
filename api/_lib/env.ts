import { z } from 'zod';

/**
 * Environment variables validation (2025 best practice)
 * Fail fast if required env vars are missing
 */
const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  // Use optional for URLs with runtime fallbacks
  FRONTEND_URL: z.string().url().optional(),
  API_URL: z.string().url().optional(),
  // VERCEL_ENV is the source of truth (set by Vercel automatically)
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  VERCEL: z.string().optional(), // Present when running on Vercel
  VERCEL_URL: z.string().optional(), // Auto-set by Vercel
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(), // Auto-set by Vercel
  NODE_ENV: z.string().optional(), // Ignore this, Vercel overwrites it
  // Gmail SMTP
  SMTP_USER: z.string().email('SMTP_USER must be a valid Gmail address'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS (App Password) is required'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  try {
    cachedEnv = envSchema.parse(process.env);
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
}

/**
 * Helper functions for environment detection
 */
export function isLocal(): boolean {
  return !process.env.VERCEL;
}

export function isProduction(): boolean {
  return process.env.VERCEL_ENV === 'production';
}

export function isPreview(): boolean {
  return process.env.VERCEL_ENV === 'preview';
}

export function getFrontendUrl(): string {
  if (isLocal()) {
    return 'http://localhost:4200';
  }
  
  const env = getEnv();
  return env.FRONTEND_URL 
    || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : '')
    || 'http://localhost:4200';
}

export function getApiUrl(): string {
  if (isLocal()) {
    return 'http://localhost:3000';
  }
  
  const env = getEnv();
  return env.API_URL 
    || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : '')
    || 'http://localhost:3000';
}
