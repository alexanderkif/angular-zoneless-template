import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../_lib/cors';
import { cleanupAndLimitSessions } from '../_lib/session-manager';
import { getFrontendUrl, getApiUrl } from '../_lib/env';

async function handleGithub(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const callbackUrl = `${getApiUrl()}/api/auth/callback-github`;
  console.log('[OAuth] GitHub Callback URL:', callbackUrl);

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID!);
  githubAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  githubAuthUrl.searchParams.set('scope', 'user:email');

  return res.redirect(302, githubAuthUrl.toString());
}

async function handleGoogle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const callbackUrl = `${getApiUrl()}/api/auth/callback-google`;
  console.log('[OAuth] Google Callback URL:', callbackUrl);

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  googleAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'consent');

  return res.redirect(302, googleAuthUrl.toString());
}

async function handleCallbackGithub(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { code } = req.query;
  const frontendUrl = getFrontendUrl();
  const callbackUrl = `${getApiUrl()}/api/auth/callback-github`;

  if (!code || typeof code !== 'string') {
    return res.redirect(`${frontendUrl}/login?error=no_code`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = await tokenResponse.json() as {
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

    const githubUser = await userResponse.json() as {
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
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('provider_id', String(githubUser.id))
      .eq('provider', 'github')
      .single();

    let userId: string;
    let userEmail: string;
    let userName: string;

    if (existingUser) {
      // Update existing user
      userId = existingUser.id;
      userEmail = existingUser.email;
      userName = existingUser.name;

      await supabase
        .from('users')
        .update({
          avatar_url: githubUser.avatar_url,
          last_login: new Date().toISOString(),
        })
        .eq('id', userId);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: githubUser.email || `${githubUser.login}@github.com`,
          name: githubUser.name || githubUser.login,
          avatar_url: githubUser.avatar_url,
          provider: 'github',
          provider_id: String(githubUser.id),
          email_verified: true,
        })
        .select('id, email, name')
        .single();

      if (createError || !newUser) {
        console.error('Create user error:', createError);
        return res.redirect(`${frontendUrl}/login?error=user_creation_failed`);
      }

      userId = newUser.id;
      userEmail = newUser.email;
      userName = newUser.name;
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId, email: userEmail },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    // Clean up old/expired sessions and enforce limit
    await cleanupAndLimitSessions(userId, supabase);

    // Store new refresh token
    await supabase.from('refresh_tokens').insert({
      user_id: userId,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Set cookies
    res.setHeader('Set-Cookie', [
      `access_token=${accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${15 * 60}`,
      `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
    ]);

    // Redirect to frontend
    return res.redirect(`${frontendUrl}/auth/callback?provider=github`);
  } catch (error) {
    console.error('GitHub callback error:', error);
    return res.redirect(`${frontendUrl}/login?error=auth_failed`);
  }
}

async function handleCallbackGoogle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { code } = req.query;
  const frontendUrl = getFrontendUrl();
  const callbackUrl = `${getApiUrl()}/api/auth/callback-google`;

  if (!code || typeof code !== 'string') {
    return res.redirect(`${frontendUrl}/login?error=no_code`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenData.error || !tokenData.access_token) {
      return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    // Get user info from Google
    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`
    );

    const googleUser = await userResponse.json() as {
      id: string;
      email: string;
      name: string;
      picture?: string;
      verified_email?: boolean;
    };

    if (!googleUser.id) {
      return res.redirect(`${frontendUrl}/login?error=no_user_info`);
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('provider_id', googleUser.id)
      .eq('provider', 'google')
      .single();

    let userId: string;
    let userEmail: string;
    let userName: string;

    if (existingUser) {
      // Update existing user
      userId = existingUser.id;
      userEmail = existingUser.email;
      userName = existingUser.name;

      await supabase
        .from('users')
        .update({
          avatar_url: googleUser.picture,
          last_login: new Date().toISOString(),
        })
        .eq('id', userId);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: googleUser.email,
          name: googleUser.name,
          avatar_url: googleUser.picture,
          provider: 'google',
          provider_id: googleUser.id,
          email_verified: googleUser.verified_email,
        })
        .select('id, email, name')
        .single();

      if (createError || !newUser) {
        console.error('Create user error:', createError);
        return res.redirect(`${frontendUrl}/login?error=user_creation_failed`);
      }

      userId = newUser.id;
      userEmail = newUser.email;
      userName = newUser.name;
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId, email: userEmail },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    // Clean up old/expired sessions and enforce limit
    await cleanupAndLimitSessions(userId, supabase);

    // Store new refresh token
    await supabase.from('refresh_tokens').insert({
      user_id: userId,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Set cookies
    res.setHeader('Set-Cookie', [
      `access_token=${accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${15 * 60}`,
      `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
    ]);

    // Redirect to frontend
    return res.redirect(`${frontendUrl}/auth/callback?provider=google`);
  } catch (error) {
    console.error('Google callback error:', error);
    return res.redirect(`${frontendUrl}/login?error=auth_failed`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const { action } = req.query;

  switch (action) {
    case 'github':
      return handleGithub(req, res);
    case 'google':
      return handleGoogle(req, res);
    case 'callback-github':
      return handleCallbackGithub(req, res);
    case 'callback-google':
      return handleCallbackGoogle(req, res);
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}
