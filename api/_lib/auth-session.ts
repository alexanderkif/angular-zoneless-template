import crypto from 'crypto';

export type SessionType = 'persistent' | 'session';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export const SESSION_IDLE_TIMEOUT_MS = 2 * HOUR_MS;

const SESSION_POLICY: Record<SessionType, { expiresMs: number }> = {
  persistent: {
    expiresMs: 30 * DAY_MS,
  },
  session: {
    expiresMs: DAY_MS,
  },
};

export const sessionTypeFromRememberMe = (rememberMe: boolean): SessionType =>
  rememberMe ? 'persistent' : 'session';

export const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const createRefreshTokenExpiresAt = (sessionType: SessionType, now = Date.now()) => {
  const policy = SESSION_POLICY[sessionType];
  return new Date(now + policy.expiresMs);
};

export const getRefreshTokenTtlSeconds = (sessionType: SessionType): number =>
  Math.floor(SESSION_POLICY[sessionType].expiresMs / 1000);

export const isSessionIdleExpired = (
  createdAt: Date | string,
  now = Date.now(),
  idleTimeoutMs = SESSION_IDLE_TIMEOUT_MS,
): boolean => now - new Date(createdAt).getTime() > idleTimeoutMs;

export const isRefreshTokenExpired = (expiresAt: Date | string, now = Date.now()): boolean =>
  now > new Date(expiresAt).getTime();

export const buildAuthCookies = (
  accessToken: string,
  refreshToken: string | null,
  sessionType: SessionType,
): string[] => {
  const isSecureEnv =
    process.env['VERCEL_ENV'] === 'production' || process.env['VERCEL_ENV'] === 'preview';
  const securePart = isSecureEnv ? 'Secure; ' : '';

  if (sessionType === 'persistent') {
    return [
      `access_token=${accessToken}; HttpOnly; ${securePart}SameSite=Lax; Path=/; Max-Age=${15 * 60}`,
      `refresh_token=${refreshToken ?? ''}; HttpOnly; ${securePart}SameSite=Lax; Path=/; Max-Age=${(30 * DAY_MS) / 1000}`,
    ];
  }

  return [
    `access_token=${accessToken}; HttpOnly; ${securePart}SameSite=Lax; Path=/`,
    `refresh_token=${refreshToken ?? ''}; HttpOnly; ${securePart}SameSite=Lax; Path=/`,
  ];
};

export const buildClearedAuthCookies = (): string[] => {
  const isSecureEnv =
    process.env['VERCEL_ENV'] === 'production' || process.env['VERCEL_ENV'] === 'preview';
  const securePart = isSecureEnv ? 'Secure; ' : '';
  const expired = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0';

  const cookieNames = ['access_token', 'refresh_token'] as const;
  const paths = ['/', '/api'] as const;

  const clearedCookies: string[] = [];
  for (const cookieName of cookieNames) {
    for (const path of paths) {
      clearedCookies.push(`${cookieName}=; HttpOnly; SameSite=Lax; Path=${path}; ${expired}`);
      clearedCookies.push(
        `${cookieName}=; HttpOnly; ${securePart}SameSite=Lax; Path=${path}; ${expired}`,
      );
    }
  }

  return clearedCookies;
};

export const buildAuthCookiesWithCleanup = (
  accessToken: string,
  refreshToken: string | null,
  sessionType: SessionType,
): string[] => [
  ...buildClearedAuthCookies(),
  ...buildAuthCookies(accessToken, refreshToken, sessionType),
];
