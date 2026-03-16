import type { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '../db';
import { refreshTokens, users } from '../db/schema';
import { getEnv } from './env';
import { hashRefreshToken } from './auth-session';

type AccessSessionType = 'persistent' | 'session';

export type AuthResult = {
  userId: string | null;
  error?: 'UNAUTHORIZED' | 'INVALID_TOKEN';
};

export const resolveAuthenticatedUser = async (
  req: VercelRequest,
  allowAnonymous = false,
): Promise<AuthResult> => {
  const accessToken = req.cookies?.['access_token'];
  const refreshToken = req.cookies?.['refresh_token'];
  const refreshTokenHash = refreshToken ? hashRefreshToken(refreshToken) : null;
  const env = getEnv();

  const unauthorized = (error: AuthResult['error']): AuthResult =>
    allowAnonymous ? { userId: null } : { userId: null, error };

  const resolveUserFromRefreshSession = async (): Promise<string | null> => {
    if (!refreshToken || !refreshTokenHash) return null;

    let decodedRefresh: { userId: string; type?: string };
    try {
      decodedRefresh = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        userId: string;
        type?: string;
      };
    } catch {
      return null;
    }

    if (decodedRefresh.type !== 'refresh') return null;

    const refreshSession = await db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.userId, decodedRefresh.userId),
        gt(refreshTokens.expiresAt, new Date()),
        eq(refreshTokens.token, refreshTokenHash),
      ),
      columns: {
        userId: true,
      },
    });

    return refreshSession?.userId ?? null;
  };

  if (!accessToken) {
    if (allowAnonymous) {
      return { userId: null };
    }

    const refreshUserId = await resolveUserFromRefreshSession();
    if (refreshUserId) return { userId: refreshUserId };
    return unauthorized('UNAUTHORIZED');
  }

  let decoded: { userId: string; sessionVersion?: number; sessionType?: AccessSessionType };
  try {
    decoded = jwt.verify(accessToken, env.JWT_SECRET) as { userId: string };
  } catch {
    if (allowAnonymous) {
      return { userId: null };
    }

    const refreshUserId = await resolveUserFromRefreshSession();
    if (refreshUserId) return { userId: refreshUserId };
    return unauthorized('INVALID_TOKEN');
  }

  if (!refreshToken || !refreshTokenHash) {
    return unauthorized('UNAUTHORIZED');
  }

  const session = await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.userId, decoded.userId),
      gt(refreshTokens.expiresAt, new Date()),
      eq(refreshTokens.token, refreshTokenHash),
    ),
    columns: {
      userId: true,
    },
  });

  if (!session) {
    return unauthorized('UNAUTHORIZED');
  }

  if (typeof decoded.sessionVersion === 'number') {
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
      columns: {
        sessionVersion: true,
      },
    });

    if (!user || user.sessionVersion !== decoded.sessionVersion) {
      return unauthorized('UNAUTHORIZED');
    }
  }

  return { userId: decoded.userId };
};
