import type { VercelRequest, VercelResponse } from '@vercel/node';

let cachedRenderApp: any = null;

const CONTENT_SECURITY_POLICY =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'nonce-angular-ssr-safe-v21' 'strict-dynamic'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; form-action 'self'";

const extractHost = (value: unknown): string | null => {
  if (!value) return null;
  const first = String(value).split(',')[0]?.trim();
  if (!first) return null;
  return first.split(':')[0]?.trim() || null;
};

/**
 * Allow-list is built ONLY from trusted configuration — never from the incoming
 * `Host` / `X-Forwarded-Host` headers (otherwise the first request to a cold
 * instance could poison it). For custom domains set `NG_ALLOWED_HOSTS`.
 */
const buildAllowedHosts = (): string => {
  const hosts = new Set<string>();

  for (const item of (process.env.NG_ALLOWED_HOSTS || '').split(',')) {
    const host = item.trim();
    if (host) hosts.add(host);
  }

  const trustedSources = [
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.FRONTEND_URL,
  ];
  for (const source of trustedSources) {
    const host = extractHost(source);
    if (host) hosts.add(host);
  }

  return Array.from(hosts).join(',');
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<unknown> {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);

  if (!cachedRenderApp) {
    const allowedHosts = buildAllowedHosts();
    process.env.NG_ALLOWED_HOSTS = allowedHosts;
    console.log('[SSR] init hosts', {
      host: req?.headers?.host,
      forwardedHost: req?.headers?.['x-forwarded-host'],
      ngAllowedHosts: allowedHosts,
      vercelUrl: process.env.VERCEL_URL,
      vercelProdUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    });
    
    // Приведение к 'as any' нужно, чтобы TS не ругался на отсутствие билда Angular при первом старте
    // @ts-ignore
    const serverModule = await import('../dist/angular-test-app/server/server.mjs') as any;
    cachedRenderApp = serverModule.reqHandler;
  }

  return cachedRenderApp(req, res);
}
