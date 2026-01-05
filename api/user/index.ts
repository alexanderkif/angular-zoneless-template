import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { eq, gt, desc, and } from 'drizzle-orm';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { handleCors } from '../_lib/cors';
import { getEnv } from '../_lib/env';
import { setSecurityHeaders } from '../_lib/security';

async function handleMe(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const env = getEnv();
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = jwt.verify(accessToken, env.JWT_SECRET) as {
      userId: string;
      email: string;
    };

    // Drizzle Query
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
      columns: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        provider: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleSessions(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const env = getEnv();
    const accessToken = req.cookies?.access_token;

    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(accessToken, env.JWT_SECRET) as { userId: string };
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Drizzle Query
    const sessions = await db.query.refreshTokens.findMany({
      where: and(eq(refreshTokens.userId, decoded.userId), gt(refreshTokens.expiresAt, new Date())),
      orderBy: [desc(refreshTokens.createdAt)],
      columns: {
        id: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return res.status(200).json({
      sessions: sessions.map((s) => ({
        ...s,
        isCurrent: false,
      })),
      total: sessions.length,
    });
  } catch (error) {
    console.error('Sessions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleRevokeSession(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const env = getEnv();
    const accessToken = req.cookies?.access_token;

    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(accessToken, env.JWT_SECRET) as { userId: string };
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Drizzle Query
    await db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.id, sessionId), eq(refreshTokens.userId, decoded.userId)));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Revoke session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  // Security headers
  setSecurityHeaders(res);

  const { action } = req.query;

  switch (action) {
    case 'me':
      return handleMe(req, res);
    case 'sessions':
      return handleSessions(req, res);
    case 'revoke-session':
      return handleRevokeSession(req, res);
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}
