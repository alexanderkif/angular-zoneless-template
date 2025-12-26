import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

const MAX_ACTIVE_SESSIONS = 5;

/**
 * Clean up expired tokens and enforce session limit
 * @param userId - User ID
 * @param supabaseClient - Optional Supabase client (if not provided, creates new one)
 */
export async function cleanupAndLimitSessions(
  userId: string,
  supabaseClient?: any
): Promise<void> {
  const env = getEnv();
  const supabase = supabaseClient || createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Get active tokens sorted by creation time (newest first)
  const { data: existingTokens } = await supabase
    .from('refresh_tokens')
    .select('id, created_at')
    .eq('user_id', userId)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  // If user has max sessions, delete oldest ones
  if (existingTokens && existingTokens.length >= MAX_ACTIVE_SESSIONS) {
    const tokensToDelete = existingTokens.slice(MAX_ACTIVE_SESSIONS - 1);
    await supabase
      .from('refresh_tokens')
      .delete()
      .in('id', tokensToDelete.map((t: any) => t.id));
  }

  // Clean up expired tokens (don't await, fire-and-forget)
  void supabase
    .from('refresh_tokens')
    .delete()
    .eq('user_id', userId)
    .lt('expires_at', new Date().toISOString());
}

/**
 * Get active sessions count for user
 */
export async function getActiveSessionsCount(userId: string): Promise<number> {
  const env = getEnv();
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { count } = await supabase
    .from('refresh_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('expires_at', new Date().toISOString());

  return count || 0;
}

/**
 * Revoke all sessions for user (useful for security incidents)
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  const env = getEnv();
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  await supabase
    .from('refresh_tokens')
    .delete()
    .eq('user_id', userId);
}
