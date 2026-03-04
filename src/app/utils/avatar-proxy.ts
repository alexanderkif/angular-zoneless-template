import { isDevMode } from '@angular/core';

export const getAvatarProxyBaseUrl = (isDevEnvironment: boolean): string =>
  isDevEnvironment ? 'http://localhost:3000' : '';

/**
 * Proxies external avatar URLs through our API to enable caching
 * and avoid rate limits from Google/GitHub
 */
export const proxyAvatarUrl = (url: string | null): string | null => {
  if (!url) return null;

  try {
    const urlObj = new URL(url);

    // Only proxy external domains
    const externalDomains = ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'];

    if (!externalDomains.some((domain) => urlObj.hostname.includes(domain))) {
      return url;
    }

    // Encode URL in base64 (browser-safe)
    const encodedUrl = btoa(url);
    const baseUrl = getAvatarProxyBaseUrl(isDevMode());

    return `${baseUrl}/api/avatar/${encodedUrl}`;
  } catch {
    return url;
  }
};
