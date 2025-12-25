import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../_lib/cors';
import { getEnv } from '../_lib/env';
import { setSecurityHeaders } from '../_lib/security';

async function handleMe(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const env = getEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Get access token from cookies
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify token
    const decoded = jwt.verify(accessToken, env.JWT_SECRET) as {
      userId: string;
      email: string;
    };

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, provider, created_at, last_login')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
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
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Get access token from cookie
    const accessToken = req.cookies?.access_token;

    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(accessToken, env.JWT_SECRET) as {
        userId: string;
        email: string;
      };
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get all active sessions
    const { data: sessions, error } = await supabase
      .from('refresh_tokens')
      .select('id, created_at, expires_at')
      .eq('user_id', decoded.userId)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get sessions error:', error);
      return res.status(500).json({ error: 'Failed to fetch sessions' });
    }

    return res.status(200).json({
      sessions: sessions?.map(s => ({
        id: s.id,
        createdAt: s.created_at,
        expiresAt: s.expires_at,
        isCurrent: false, // We can't reliably detect current session without storing token hash
      })) || [],
      total: sessions?.length || 0,
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
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Get access token from cookie
    const accessToken = req.cookies?.access_token;

    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(accessToken, env.JWT_SECRET) as {
        userId: string;
        email: string;
      };
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get session ID from query
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Delete session (only if it belongs to the user)
    const { error } = await supabase
      .from('refresh_tokens')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', decoded.userId);

    if (error) {
      console.error('Delete session error:', error);
      return res.status(500).json({ error: 'Failed to delete session' });
    }

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
