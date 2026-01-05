import { eq, gt, desc, and, lt, inArray } from 'drizzle-orm';
import { db } from '../db';
import { refreshTokens } from '../db/schema';

const MAX_ACTIVE_SESSIONS = 5;

/**
 * Clean up expired tokens and enforce session limit
 * @param userId - User ID
 */
export async function cleanupAndLimitSessions(userId: string): Promise<void> {
  // Get active tokens sorted by creation time (newest first)
  const existingTokens = await db.query.refreshTokens.findMany({
    where: and(eq(refreshTokens.userId, userId), gt(refreshTokens.expiresAt, new Date())),
    orderBy: [desc(refreshTokens.createdAt)],
    columns: {
      id: true,
      createdAt: true,
    },
  });

  // If user has max sessions, delete oldest ones
  if (existingTokens && existingTokens.length >= MAX_ACTIVE_SESSIONS) {
    const tokensToDelete = existingTokens.slice(MAX_ACTIVE_SESSIONS - 1);
    await db.delete(refreshTokens).where(
      inArray(
        refreshTokens.id,
        tokensToDelete.map((t) => t.id),
      ),
    );
  }

  // Clean up expired tokens (don't await, fire-and-forget)
  void db
    .delete(refreshTokens)
    .where(and(eq(refreshTokens.userId, userId), lt(refreshTokens.expiresAt, new Date())));
}

/**
 * Get active sessions count for user
 */
export async function getActiveSessionsCount(userId: string): Promise<number> {
  const sessions = await db.query.refreshTokens.findMany({
    where: and(eq(refreshTokens.userId, userId), gt(refreshTokens.expiresAt, new Date())),
    columns: {
      id: true,
    },
  });

  return sessions.length;
}

/**
 * Revoke all sessions for user (useful for security incidents)
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}
