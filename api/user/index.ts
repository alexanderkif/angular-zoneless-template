import { VercelRequest, VercelResponse } from '@vercel/node';
import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from '../../server/db';
import { users, refreshTokens } from '../../server/db/schema';
import { resolveAuthenticatedUser } from '../../server/_lib/auth-user';
import { handleCors } from '../../server/_lib/cors';
import { setSecurityHeaders } from '../../server/_lib/security';

async function handleMe(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await resolveAuthenticatedUser(req, true);

    if (!auth.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Drizzle Query
    const user = await db.query.users.findFirst({
      where: eq(users.id, auth.userId),
      columns: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        provider: true,
        emailVerified: true,
        role: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('❌ [API] Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleSessions(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await resolveAuthenticatedUser(req);
    if (!auth.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Drizzle Query
    const sessions = await db.query.refreshTokens.findMany({
      where: and(eq(refreshTokens.userId, auth.userId), gt(refreshTokens.expiresAt, new Date())),
      orderBy: [desc(refreshTokens.createdAt)],
      columns: {
        id: true,
        sessionType: true,
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
    const auth = await resolveAuthenticatedUser(req);
    if (!auth.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Drizzle Query
    await db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.id, sessionId), eq(refreshTokens.userId, auth.userId)));

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
