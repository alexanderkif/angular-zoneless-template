import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { handleCors } from '../_lib/cors';
import { cleanupAndLimitSessions } from '../_lib/session-manager';
import { getFrontendUrl, getApiUrl, getEnv } from '../_lib/env';
import {
  buildAuthCookies,
  buildAuthCookiesWithCleanup,
  createRefreshTokenExpiresAt,
  getRefreshTokenTtlSeconds,
  hashRefreshToken,
} from '../_lib/auth-session';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;
  const frontendUrl = getFrontendUrl();
  const callbackUrl = `${getApiUrl()}/api/auth/callback-github`;

  if (!code || typeof code !== 'string') {
    return res.redirect(`${frontendUrl}/login?error=no_code`);
  }

  try {
    const env = getEnv();

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env['GITHUB_CLIENT_ID'],
        client_secret: process.env['GITHUB_CLIENT_SECRET'],
        code,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenData.error || !tokenData.access_token) {
      return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    const githubUser = (await userResponse.json()) as {
      id: number;
      login: string;
      email?: string;
      name?: string;
      avatar_url?: string;
    };

    if (!githubUser.id) {
      return res.redirect(`${frontendUrl}/login?error=no_user_info`);
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: and(eq(users.providerId, String(githubUser.id)), eq(users.provider, 'github')),
      columns: {
        id: true,
        email: true,
        name: true,
        sessionVersion: true,
      },
    });

    let userId: string;
    let userEmail: string;
    let userSessionVersion = 0;

    if (existingUser) {
      // Update existing user
      userId = existingUser.id;
      userEmail = existingUser.email;
      userSessionVersion = existingUser.sessionVersion ?? 0;

      await db
        .update(users)
        .set({
          avatarUrl: githubUser.avatar_url,
          lastLogin: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email: githubUser.email || `${githubUser.login}@github.com`,
          name: githubUser.name || githubUser.login,
          avatarUrl: githubUser.avatar_url,
          provider: 'github',
          providerId: String(githubUser.id),
          emailVerified: true,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          sessionVersion: users.sessionVersion,
        });

      if (!newUser) {
        return res.redirect(`${frontendUrl}/login?error=user_creation_failed`);
      }

      userId = newUser.id;
      userEmail = newUser.email;
      userSessionVersion = newUser.sessionVersion ?? 0;
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId, email: userEmail, sessionVersion: userSessionVersion, sessionType: 'persistent' },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      } as jwt.SignOptions,
    );

    const refreshToken = jwt.sign({ userId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
      expiresIn: getRefreshTokenTtlSeconds('persistent'),
    } as jwt.SignOptions);

    // Clean up old/expired sessions
    await cleanupAndLimitSessions(userId);

    const oauthExpiresAt = createRefreshTokenExpiresAt('persistent');

    // Store refresh token
    await db.insert(refreshTokens).values({
      userId,
      token: hashRefreshToken(refreshToken),
      sessionType: 'persistent',
      expiresAt: oauthExpiresAt,
    });

    // Set cookies
    res.setHeader(
      'Set-Cookie',
      buildAuthCookiesWithCleanup(accessToken, refreshToken, 'persistent'),
    );

    // Redirect to frontend
    return res.redirect(`${frontendUrl}/auth/callback?provider=github`);
  } catch (error) {
    console.error('GitHub callback error:', error);
    return res.redirect(`${frontendUrl}/login?error=auth_failed`);
  }
}
