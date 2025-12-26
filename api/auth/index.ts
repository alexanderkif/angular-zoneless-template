import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { handleCors } from '../_lib/cors';
import { verifyPassword, hashPassword } from '../_lib/password';
import { getEnv } from '../_lib/env';
import { rateLimit, setSecurityHeaders } from '../_lib/security';
import { cleanupAndLimitSessions } from '../_lib/session-manager';
import { sendVerificationEmail, sendWelcomeEmail } from '../_lib/email';

// Schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(2).max(100),
});

const resendSchema = z.object({
  email: z.string().email().optional(),
  token: z.string().optional(),
}).refine(data => data.email || data.token, {
  message: "Either email or token must be provided",
});

const cancelRegistrationSchema = z.object({
  token: z.string(),
});

// Handlers
async function handleLogin(req: VercelRequest, res: VercelResponse) {
  // Rate limiting: max 5 login attempts per minute
  if (rateLimit(req, res, 5, 60000)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const env = getEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    // Validate input
    const body = loginSchema.parse(req.body);

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, password_hash, provider, email_verified')
      .eq('email', body.email)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user registered with OAuth
    if (user.provider !== 'email') {
      return res.status(400).json({ 
        error: `Please sign in with ${user.provider}` 
      });
    }

    // Verify password with Argon2id
    const isValidPassword = await verifyPassword(user.password_hash, body.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check email verification (only for email provider)
    if (!user.email_verified) {
      return res.status(403).json({ 
        error: 'Email not verified',
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
    );

    // Clean up old/expired sessions and enforce limit
    await cleanupAndLimitSessions(user.id, supabase);

    // Store new refresh token and update last login in parallel
    await Promise.all([
      supabase.from('refresh_tokens').insert({
        user_id: user.id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)
    ]);

    // Set httpOnly cookies with SameSite=Lax for better OAuth compatibility
    res.setHeader('Set-Cookie', [
      `access_token=${accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${15 * 60}`,
      `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
    ]);

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
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
    const env = getEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    // Validate input
    const body = registerSchema.parse(req.body);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', body.email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password with Argon2id (2025 best practice)
    const passwordHash = await hashPassword(body.password);

    // Generate verification token (24-hour validity)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        email: body.email,
        name: body.name,
        password_hash: passwordHash,
        provider: 'email',
        email_verified: false,
        verification_token: verificationToken,
        token_expires_at: tokenExpiresAt.toISOString(),
      })
      .select('id, email, name, created_at')
      .single();

    if (createError || !user) {
      console.error('Create user error:', createError);
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
      },
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('Register error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
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
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const refreshToken = req.cookies.refresh_token;

    // Delete refresh token from database (don't wait for it)
    if (refreshToken) {
      supabase.from('refresh_tokens')
        .delete()
        .eq('token', refreshToken)
        .then(
          () => {}, // Success - ignore
          (err: unknown) => console.error('Failed to delete token:', err)
        );
    }

    // Clear cookies
    res.setHeader('Set-Cookie', [
      'access_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
      'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
    ]);

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleRefresh(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const env = getEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    // Get refresh token from cookies
    const refreshToken = req.cookies.refresh_token;

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
    const { data: storedToken, error: tokenError } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token', refreshToken)
      .eq('user_id', decoded.userId)
      .single();

    if (tokenError || !storedToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if token is expired
    if (new Date(storedToken.expires_at) < new Date()) {
      // Delete expired token
      await supabase.from('refresh_tokens').delete().eq('token', refreshToken);
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens (token rotation)
    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions
    );

    const newRefreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
    );

    // Delete old refresh token and store new one (rotation) in parallel
    await Promise.all([
      supabase.from('refresh_tokens').delete().eq('token', refreshToken),
      supabase.from('refresh_tokens').insert({
        user_id: user.id,
        token: newRefreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
    ]);

    // Set new cookies
    res.setHeader('Set-Cookie', [
      `access_token=${newAccessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${15 * 60}`,
      `refresh_token=${newRefreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
    ]);

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      // Clear invalid cookies
      res.setHeader('Set-Cookie', [
        'access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
        'refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
      ]);
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
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    // Find user with this verification token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, email_verified, token_expires_at')
      .eq('verification_token', token)
      .single();

    if (userError || !user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Check if token expired
    if (user.token_expires_at && new Date(user.token_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // Update user: mark as verified, clear token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        verification_token: null,
        token_expires_at: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update user error:', updateError);
      return res.status(500).json({ error: 'Failed to verify email' });
    }

    // Generate tokens for automatic login
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
    );

    // Clean up old sessions and enforce limit
    await cleanupAndLimitSessions(user.id, supabase);

    // Store refresh token
    await supabase.from('refresh_tokens').insert({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Set httpOnly cookies
    res.setHeader('Set-Cookie', [
      `access_token=${accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${15 * 60}`,
      `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
    ]);

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
    const env = getEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Validate input
    const body = resendSchema.parse(req.body);

    let user;
    
    if (body.token) {
      // Find user by verification token
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, email_verified, provider')
        .eq('verification_token', body.token)
        .single();
        
      if (!error && data) {
        user = data;
      }
    } else if (body.email) {
      // Find user by email
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, email_verified, provider')
        .eq('email', body.email)
        .single();
        
      if (!error && data) {
        user = data;
      }
    }

    if (!user) {
      // Don't reveal if user exists (security best practice)
      return res.status(200).json({
        message: 'If the email exists, a verification link has been sent.',
      });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Only allow resend for email provider
    if (user.provider !== 'email') {
      return res.status(400).json({ 
        error: 'Email verification is only for email registrations' 
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        verification_token: verificationToken,
        token_expires_at: tokenExpiresAt.toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update user error:', updateError);
      return res.status(500).json({ error: 'Failed to resend verification email' });
    }

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
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
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
    const env = getEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Validate input
    const body = cancelRegistrationSchema.parse(req.body);

    // Find user by verification token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email_verified')
      .eq('verification_token', body.token)
      .single();

    if (userError || !user) {
      // If user not found, maybe already deleted or invalid token. 
      // Return success to not leak info.
      return res.status(200).json({ message: 'Registration cancelled.' });
    }

    // Only allow deleting unverified users
    if (user.email_verified) {
      return res.status(400).json({ error: 'Cannot cancel registration for verified user' });
    }

    // Delete user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return res.status(500).json({ error: 'Failed to cancel registration' });
    }

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
