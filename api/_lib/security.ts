import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Rate limiting store (in-memory for serverless)
 * For production, use Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple rate limiter (2025 best practice)
 * Prevents brute force attacks
 */
export function rateLimit(req: VercelRequest, res: VercelResponse, maxRequests = 5, windowMs = 60000): boolean {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
             (req.headers['x-real-ip'] as string) || 
             'unknown';
  
  const now = Date.now();
  const key = `${ip}:${req.url}`;
  
  // Clean up old entries
  if (Math.random() < 0.1) { // 10% chance to clean up
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }
  
  const record = rateLimitStore.get(key);
  
  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  
  if (record.count >= maxRequests) {
    res.status(429).json({ 
      error: 'Too many requests', 
      retryAfter: Math.ceil((record.resetAt - now) / 1000) 
    });
    return true;
  }
  
  record.count++;
  return false;
}

/**
 * Security headers (2025 best practice)
 */
export function setSecurityHeaders(res: VercelResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );
}
