import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';

const isVercelRuntime = Boolean(process.env['VERCEL']);

// Local development: prefer .env.local values even if shell has stale vars.
if (!isVercelRuntime) {
  dotenv.config({ path: '.env.local', override: true });
  if (!process.env['DATABASE_URL']) {
    dotenv.config({ path: '.env' });
  }
}

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, {
  prepare: false,
  max: 1, // Limit to 1 connection for serverless/local dev to avoid issues
  idle_timeout: 20, // Close idle connections after 20s
  connect_timeout: 10,
  ssl: connectionString.includes('supabase.com') ? 'require' : undefined,
});
export const db = drizzle(client, { schema });
