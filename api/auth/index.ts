import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { and, eq, or, sql } from 'drizzle-orm';
import { db } from '../../server/db';
import { users, refreshTokens } from '../../server/db/schema';
import { handleCors } from '../../server/_lib/cors';
import { verifyPassword, hashPassword } from '../../server/_lib/password';
import { getEnv } from '../../server/_lib/env';
import { rateLimit, setSecurityHeaders } from '../../server/_lib/security';
import { cleanupAndLimitSessions, revokeAllSessions } from '../../server/_lib/session-manager';
import { sendVerificationEmail, sendWelcomeEmail } from '../../server/_lib/email';
import {
  buildAuthCookies,
  buildAuthCookiesWithCleanup,
  buildClearedAuthCookies,
  createRefreshTokenExpiresAt,
  getRefreshTokenTtlSeconds,
  hashRefreshToken,
  isSessionIdleExpired,
  isRefreshTokenExpired,
  sessionTypeFromRememberMe,
  type SessionType,
} from '../../server/_lib/auth-session';

// Schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(true), // Default true for better UX
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(2).max(100),
});

const resendSchema = z
  .object({
    email: z.string().email().optional(),
    token: z.string().optional(),
  })
  .refine((data) => data.email || data.token, {
    message: 'Either email or token must be provided',
  });

const cancelRegistrationSchema = z.object({
  token: z.string(),
});

function getDbErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const maybeError = error as { cause?: unknown; code?: unknown };

  if (typeof maybeError.code === 'string') {
    return maybeError.code;
  }

  if (maybeError.cause && typeof maybeError.cause === 'object') {
    const cause = maybeError.cause as { code?: unknown };
    if (typeof cause.code === 'string') {
      return cause.code;
    }
  }

  return undefined;
}

function isDbAuthFailure(error: unknown): boolean {
  const code = getDbErrorCode(error);
  if (code === '28P01') {
    return true;
  }

  if (error instanceof Error) {
    return error.message.toLowerCase().includes('password authentication failed');
  }

  return false;
}

function isDbUnavailable(error: unknown): boolean {
  const code = getDbErrorCode(error);

  if (code === 'CONNECT_TIMEOUT' || code === 'XX000') {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('connect_timeout') ||
      message.includes('circuit breaker open') ||
      message.includes('unable to establish connection to upstream database')
    );
  }

  return false;
}

function logDatabaseFailure(context: string, error: unknown): void {
  const code = getDbErrorCode(error) ?? 'unknown';
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';

  console.error(`❌ [API] ${context} DB error (${code}): ${message}`);
}

// Handlers
async function handleLogin(req: VercelRequest, res: VercelResponse) {
  // Rate limiting: max 5 login attempts per minute
  if (rateLimit(req, res, 5, 60000)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const env = getEnv();
    // Validate input
    const body = loginSchema.parse(req.body);

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, body.email),
      columns: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        passwordHash: true,
        provider: true,
        emailVerified: true,
        role: true,
        sessionVersion: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user registered with OAuth
    if (user.provider !== 'email') {
      return res.status(400).json({
        error: `Please sign in with ${user.provider}`,
      });
    }

    // Verify password with Argon2id
    const isValidPassword = await verifyPassword(user.passwordHash || '', body.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check email verification (only for email provider)
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Email not verified',
        message:
          'Please verify your email before logging in. Check your inbox for the verification link.',
      });
    }

    const sessionType = sessionTypeFromRememberMe(body.rememberMe);

    // Generate access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        sessionVersion: user.sessionVersion ?? 0,
        sessionType,
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      } as jwt.SignOptions,
    );

    const refreshTokenTtlSeconds = getRefreshTokenTtlSeconds(sessionType);
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
      expiresIn: refreshTokenTtlSeconds,
    } as jwt.SignOptions);

    // Clean up old/expired sessions and enforce limit
    await cleanupAndLimitSessions(user.id);

    const expiresAt = createRefreshTokenExpiresAt(sessionType);

    await db.insert(refreshTokens).values({
      userId: user.id,
      token: hashRefreshToken(refreshToken),
      sessionType,
      expiresAt,
    });

    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

    // Set cookies
    res.setHeader(
      'Set-Cookie',
      buildAuthCookiesWithCleanup(accessToken, refreshToken, sessionType),
    );

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        emailVerified: user.emailVerified,
        role: user.role,
      },
    });
  } catch (error) {
    if (isDbUnavailable(error)) {
      logDatabaseFailure('Login', error);
      return res.status(503).json({
        error: 'Database unavailable. Check Supabase connectivity and DATABASE_URL.',
      });
    }

    if (isDbAuthFailure(error)) {
      logDatabaseFailure('Login', error);
      return res.status(503).json({
        error: 'Database authentication failed. Update DATABASE_URL and restart API server.',
      });
    }

    console.error('❌ [API] Login error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  // Rate limiting: max 3 registration attempts per minute
  if (rateLimit(req, res, 3, 60000)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate input
    const body = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, body.email),
      columns: { id: true },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password with Argon2id (2025 best practice)
    const passwordHash = await hashPassword(body.password);

    // Generate verification token (24-hour validity)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: body.email,
        name: body.name,
        passwordHash: passwordHash,
        provider: 'email',
        emailVerified: false,
        verificationToken: verificationToken,
        tokenExpiresAt: tokenExpiresAt,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
      });

    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Send verification email
    try {
      await sendVerificationEmail({
        to: user.email,
        name: body.name,
        verificationToken,
      });
    } catch (error) {
      console.error('Email send error:', error instanceof Error ? error.message : 'Unknown error');
      // Continue even if email fails, user can request resend later
    }

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: null,
        provider: 'email',
        emailVerified: false,
        role: 'user',
      },
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('Register error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleLogout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const env = getEnv();
    const refreshToken = req.cookies['refresh_token'];
    const accessToken = req.cookies['access_token'];
    const refreshTokenHash = refreshToken ? hashRefreshToken(refreshToken) : null;

    let userIdFromAccessToken: string | null = null;
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, env.JWT_SECRET, {
          ignoreExpiration: true,
        } as jwt.VerifyOptions) as {
          userId: string;
        };
        userIdFromAccessToken = decoded.userId;
      } catch (_err: unknown) {}
    }

    if (!userIdFromAccessToken && refreshToken) {
      try {
        const decodedRefresh = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, {
          ignoreExpiration: true,
        } as jwt.VerifyOptions) as {
          userId: string;
          type?: string;
        };

        if (decodedRefresh.type === 'refresh' && decodedRefresh.userId) {
          userIdFromAccessToken = decodedRefresh.userId;
        }
      } catch (_err: unknown) {}
    }

    if (!userIdFromAccessToken && refreshTokenHash) {
      try {
        const storedSession = await db.query.refreshTokens.findFirst({
          where: or(
            eq(refreshTokens.token, refreshTokenHash),
            eq(refreshTokens.token, refreshToken ?? ''),
          ),
          columns: {
            userId: true,
          },
        });

        if (storedSession?.userId) {
          userIdFromAccessToken = storedSession.userId;
        }
      } catch (_err: unknown) {}
    }

    // CRITICAL: Must await deletion of refresh token from database
    // This prevents security issue where user can reuse old tokens after logout
    if (refreshToken) {
      try {
        await db
          .delete(refreshTokens)
          .where(
            or(
              eq(refreshTokens.token, refreshToken),
              eq(refreshTokens.token, refreshTokenHash ?? ''),
            ),
          );
      } catch (err: unknown) {
        console.error('❌ [API] Failed to delete token from DB:', err);
        // Continue to clear cookies even if DB delete fails
      }
    }

    // Defense-in-depth: if access token is available, revoke all user sessions.
    // This guarantees logout takes priority over remember-me persistence.
    if (userIdFromAccessToken) {
      try {
        await Promise.all([
          revokeAllSessions(userIdFromAccessToken),
          db
            .update(users)
            .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
            .where(eq(users.id, userIdFromAccessToken)),
        ]);
      } catch (err: unknown) {
        console.error('❌ [API] Failed to revoke all sessions during logout:', err);
      }
    }

    // Clear cookies with Max-Age=0 (best practice for deletion)
    res.setHeader('Set-Cookie', buildClearedAuthCookies());

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ [API] Logout error:', error);
    // Even if error, try to clear cookies
    res.setHeader('Set-Cookie', buildClearedAuthCookies());
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleRefresh(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const env = getEnv();
    // Get refresh token from cookies
    const refreshToken = req.cookies['refresh_token'];
    const refreshTokenHash = refreshToken ? hashRefreshToken(refreshToken) : null;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
      userId: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Check if refresh token exists in database
    const storedToken = await db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.userId, decoded.userId),
        or(eq(refreshTokens.token, refreshToken), eq(refreshTokens.token, refreshTokenHash ?? '')),
      ),
      columns: {
        token: true,
        userId: true,
        sessionType: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if token is expired
    if (isRefreshTokenExpired(storedToken.expiresAt)) {
      // Delete expired token
      await db
        .delete(refreshTokens)
        .where(
          and(
            eq(refreshTokens.userId, decoded.userId),
            or(
              eq(refreshTokens.token, refreshToken),
              eq(refreshTokens.token, refreshTokenHash ?? ''),
            ),
          ),
        );
      res.setHeader('Set-Cookie', buildClearedAuthCookies());
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    if (
      storedToken.sessionType === 'session' &&
      storedToken.createdAt &&
      isSessionIdleExpired(storedToken.createdAt)
    ) {
      await db
        .delete(refreshTokens)
        .where(
          and(
            eq(refreshTokens.userId, decoded.userId),
            or(
              eq(refreshTokens.token, refreshToken),
              eq(refreshTokens.token, refreshTokenHash ?? ''),
            ),
          ),
        );
      res.setHeader('Set-Cookie', buildClearedAuthCookies());
      return res.status(401).json({ error: 'Session expired due to inactivity' });
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
      columns: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        provider: true,
        emailVerified: true,
        role: true,
        sessionVersion: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens (token rotation)
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        sessionVersion: user.sessionVersion ?? 0,
        sessionType: (storedToken.sessionType as SessionType) || 'persistent',
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      } as jwt.SignOptions,
    );

    const sessionType = (storedToken.sessionType as SessionType) || 'persistent';
    const refreshTokenTtlSeconds = getRefreshTokenTtlSeconds(sessionType);
    const newRefreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
      expiresIn: refreshTokenTtlSeconds,
    } as jwt.SignOptions);
    const nextExpiresAt = createRefreshTokenExpiresAt(sessionType);

    // Delete old refresh token and store new one (rotation) in parallel
    await Promise.all([
      db
        .delete(refreshTokens)
        .where(
          and(
            eq(refreshTokens.userId, decoded.userId),
            or(
              eq(refreshTokens.token, refreshToken),
              eq(refreshTokens.token, refreshTokenHash ?? ''),
            ),
          ),
        ),
      db.insert(refreshTokens).values({
        userId: user.id,
        token: hashRefreshToken(newRefreshToken),
        sessionType,
        expiresAt: nextExpiresAt,
      }),
    ]);

    // Set new cookies
    res.setHeader(
      'Set-Cookie',
      buildAuthCookiesWithCleanup(newAccessToken, newRefreshToken, sessionType),
    );

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        emailVerified: user.emailVerified,
        role: user.role,
      },
    });
  } catch (error) {
    if (isDbUnavailable(error)) {
      logDatabaseFailure('Refresh', error);
      return res.status(503).json({
        error: 'Database unavailable. Check Supabase connectivity and DATABASE_URL.',
      });
    }

    if (isDbAuthFailure(error)) {
      logDatabaseFailure('Refresh', error);
      return res.status(503).json({
        error: 'Database authentication failed. Update DATABASE_URL and restart API server.',
      });
    }

    console.error('Refresh token error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      // Clear invalid cookies
      res.setHeader('Set-Cookie', buildClearedAuthCookies());
      return res.status(401).json({ error: 'Invalid token' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleVerifyEmail(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const env = getEnv();
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    // Find user with this verification token
    const user = await db.query.users.findFirst({
      where: eq(users.verificationToken, token),
      columns: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        emailVerified: true,
        tokenExpiresAt: true,
        provider: true,
        role: true,
        sessionVersion: true,
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Check if token expired
    if (user.tokenExpiresAt && new Date(user.tokenExpiresAt) < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // Update user: mark as verified, clear token
    await db
      .update(users)
      .set({
        emailVerified: true,
        verificationToken: null,
        tokenExpiresAt: null,
      })
      .where(eq(users.id, user.id));

    // Generate tokens for automatic login
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        sessionVersion: user.sessionVersion ?? 0,
        sessionType: 'persistent',
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      } as jwt.SignOptions,
    );

    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
      expiresIn: getRefreshTokenTtlSeconds('persistent'),
    } as jwt.SignOptions);

    // Clean up old sessions and enforce limit
    await cleanupAndLimitSessions(user.id);

    // Store refresh token
    const emailVerificationExpiresAt = createRefreshTokenExpiresAt('persistent');

    await db.insert(refreshTokens).values({
      userId: user.id,
      token: hashRefreshToken(refreshToken),
      sessionType: 'persistent',
      expiresAt: emailVerificationExpiresAt,
    });

    // Set httpOnly cookies
    res.setHeader(
      'Set-Cookie',
      buildAuthCookiesWithCleanup(accessToken, refreshToken, 'persistent'),
    );

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        emailVerified: user.emailVerified,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleResendVerification(req: VercelRequest, res: VercelResponse) {
  // Rate limiting: max 2 resend attempts per 5 minutes
  if (rateLimit(req, res, 2, 5 * 60000)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate input
    const body = resendSchema.parse(req.body);

    let user;

    if (body.token) {
      // Find user by verification token
      user = await db.query.users.findFirst({
        where: eq(users.verificationToken, body.token),
        columns: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          provider: true,
        },
      });
    } else if (body.email) {
      // Find user by email
      user = await db.query.users.findFirst({
        where: eq(users.email, body.email),
        columns: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          provider: true,
        },
      });
    }

    if (!user) {
      // Don't reveal if user exists (security best practice)
      return res.status(200).json({
        message: 'If the email exists, a verification link has been sent.',
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Only allow resend for email provider
    if (user.provider !== 'email') {
      return res.status(400).json({
        error: 'Email verification is only for email registrations',
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await db
      .update(users)
      .set({
        verificationToken: verificationToken,
        tokenExpiresAt: tokenExpiresAt,
      })
      .where(eq(users.id, user.id));

    // Send verification email
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationToken,
    });

    return res.status(200).json({
      message: 'Verification email sent. Please check your inbox.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }

    // Don't reveal email sending errors to user
    return res.status(200).json({
      message: 'If the email exists, a verification link has been sent.',
    });
  }
}

async function handleCancelRegistration(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate input
    const body = cancelRegistrationSchema.parse(req.body);

    // Find user by verification token
    const user = await db.query.users.findFirst({
      where: eq(users.verificationToken, body.token),
      columns: {
        id: true,
        emailVerified: true,
      },
    });

    if (!user) {
      // If user not found, maybe already deleted or invalid token.
      // Return success to not leak info.
      return res.status(200).json({ message: 'Registration cancelled.' });
    }

    // Only allow deleting unverified users
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Cannot cancel registration for verified user' });
    }

    // Delete user
    await db.delete(users).where(eq(users.id, user.id));

    return res.status(200).json({ message: 'Registration cancelled successfully.' });
  } catch (error) {
    console.error('Cancel registration error:', error);
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
    case 'login':
      return handleLogin(req, res);
    case 'register':
      return handleRegister(req, res);
    case 'logout':
      return handleLogout(req, res);
    case 'refresh':
      return handleRefresh(req, res);
    case 'verify-email':
      return handleVerifyEmail(req, res);
    case 'resend-verification':
      return handleResendVerification(req, res);
    case 'cancel-registration':
      return handleCancelRegistration(req, res);
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}
