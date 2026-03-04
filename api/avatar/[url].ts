import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';

/**
 * Avatar proxy endpoint
 * Caches external avatars (Google, GitHub) to avoid rate limits
 *
 * Usage: /api/avatar/[base64_encoded_url]
 */
export default async (req: VercelRequest, res: VercelResponse) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors(req, res);
  }

  // Apply CORS headers
  handleCors(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid url parameter' });
    }

    // Decode base64 URL
    const decodedUrl = Buffer.from(url, 'base64').toString('utf-8');

    // Validate URL is from allowed domains
    const allowedDomains = [
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'github.com',
    ];

    const urlObj = new URL(decodedUrl);
    if (!allowedDomains.some((domain) => urlObj.hostname.endsWith(domain))) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    // Fetch image from external source
    const imageResponse = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Angular-Zoneless-Template/1.0',
      },
    });

    if (!imageResponse.ok) {
      return res.status(imageResponse.status).json({ error: 'Failed to fetch image' });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Cache for 1 hour
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Cache-Control',
      'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    );
    res.setHeader('CDN-Cache-Control', 'public, max-age=86400');

    return res.send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error('Avatar proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
