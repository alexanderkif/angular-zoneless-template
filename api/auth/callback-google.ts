import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import {
  buildAuthCookies,
  buildAuthCookiesWithCleanup,
  createRefreshTokenExpiresAt,
  getRefreshTokenTtlSeconds,
  hashRefreshToken,
} from '../_lib/auth-session';
import { handleCors } from '../_lib/cors';
import { cleanupAndLimitSessions } from '../_lib/session-manager';
import { getFrontendUrl, getApiUrl, getEnv } from '../_lib/env';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;
  const frontendUrl = getFrontendUrl();
  const callbackUrl = `${getApiUrl()}/api/auth/callback-google`;

  if (!code || typeof code !== 'string') {
    return res.redirect(`${frontendUrl}/login?error=no_code`);
  }

  try {
    const env = getEnv();

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env['GOOGLE_CLIENT_ID']!,
        client_secret: process.env['GOOGLE_CLIENT_SECRET']!,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenData.error || !tokenData.access_token) {
      console.error('Token exchange error:', tokenData.error_description);
      return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const googleUser = (await userResponse.json()) as {
      id: string;
      email: string;
      name: string;
      picture?: string;
    };

    if (!googleUser.id || !googleUser.email) {
      return res.redirect(`${frontendUrl}/login?error=no_user_info`);
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: and(eq(users.providerId, googleUser.id), eq(users.provider, 'google')),
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
          avatarUrl: googleUser.picture,
          lastLogin: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          provider: 'google',
          providerId: googleUser.id,
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

    // Store refresh token
    const oauthExpiresAt = createRefreshTokenExpiresAt('persistent');

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
    return res.redirect(`${frontendUrl}/auth/callback?provider=google`);
  } catch (error) {
    console.error('Google callback error:', error);
    return res.redirect(`${frontendUrl}/login?error=auth_failed`);
  }
}
