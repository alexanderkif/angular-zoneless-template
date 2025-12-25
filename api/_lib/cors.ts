import { VercelRequest, VercelResponse } from '@vercel/node';
import { isLocal, getFrontendUrl } from './env';

export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  let allowedOrigin = getFrontendUrl();

  if (isLocal()) {
    // Allow both dev server (4200) and SSR server (4000)
    if (origin === 'http://localhost:4200' || origin === 'http://localhost:4000') {
      allowedOrigin = origin;
    } else {
      allowedOrigin = 'http://localhost:4200'; // Default fallback
    }
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}
