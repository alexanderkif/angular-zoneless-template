import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local if not already set
if (!process.env['DATABASE_URL']) {
  dotenv.config({ path: '.env.local' });
  // Fallback to .env if .env.local doesn't exist or doesn't have the var
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
});
export const db = drizzle(client, { schema });
