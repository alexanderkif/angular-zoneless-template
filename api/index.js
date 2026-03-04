let cachedRenderApp = null;

const CONTENT_SECURITY_POLICY =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; form-action 'self'";

const extractHost = (value) => {
  if (!value) return null;
  const first = String(value).split(',')[0]?.trim();
  if (!first) return null;
  return first.split(':')[0]?.trim() || null;
};

const buildAllowedHosts = (req) => {
  const hosts = new Set();

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

export default async function handler(req, res) {
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
    const serverModule = await import('../dist/angular-test-app/server/server.mjs');
    cachedRenderApp = serverModule.reqHandler;
  }

  return cachedRenderApp(req, res);
}
