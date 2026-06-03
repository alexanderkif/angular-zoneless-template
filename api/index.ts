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

const buildAllowedHosts = (req: VercelRequest): string => {
  const hosts = new Set<string>();

  const existing = process.env.NG_ALLOWED_HOSTS || '';
  for (const item of existing.split(',')) {
    const host = item.trim();
    if (host) hosts.add(host);
  }

  const hostHeader = extractHost(req?.headers?.host);
  const forwardedHostHeader = extractHost(req?.headers?.['x-forwarded-host']);
  const vercelUrl = extractHost(process.env.VERCEL_URL);
  const vercelProdUrl = extractHost(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (hostHeader) hosts.add(hostHeader);
  if (forwardedHostHeader) hosts.add(forwardedHostHeader);
  if (vercelUrl) hosts.add(vercelUrl);
  if (vercelProdUrl) hosts.add(vercelProdUrl);

  // Allow Vercel preview and production aliases.
  hosts.add('*.vercel.app');

  return Array.from(hosts).join(',');
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<unknown> {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);

  if (!cachedRenderApp) {
    const allowedHosts = buildAllowedHosts(req);
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
