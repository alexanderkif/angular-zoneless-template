import { getAvatarProxyBaseUrl, proxyAvatarUrl } from './avatar-proxy';

describe('proxyAvatarUrl', () => {
  it('should return null for null input', () => {
    expect(proxyAvatarUrl(null)).toBeNull();
  });

  it('should return original URL for non-external domains', () => {
    const url = 'https://example.com/avatar.png';
    expect(proxyAvatarUrl(url)).toBe(url);
  });

  it('should proxy Google avatar URLs', () => {
    const url = 'https://lh3.googleusercontent.com/a/example-avatar';
    const result = proxyAvatarUrl(url);

    expect(result).toBeTruthy();
    expect(result).toContain('/api/avatar/');
  });

  it('should proxy GitHub avatar URLs', () => {
    const url = 'https://avatars.githubusercontent.com/u/123456?v=4';
    const result = proxyAvatarUrl(url);

    expect(result).toBeTruthy();
    expect(result).toContain('/api/avatar/');
  });

  it('should return original input if URL is invalid', () => {
    const invalidUrl = 'not-a-valid-url';
    expect(proxyAvatarUrl(invalidUrl)).toBe(invalidUrl);
  });

  it('should return dev proxy base URL for development environment', () => {
    expect(getAvatarProxyBaseUrl(true)).toBe('http://localhost:3000');
  });

  it('should return empty proxy base URL for production environment', () => {
    expect(getAvatarProxyBaseUrl(false)).toBe('');
  });
});
