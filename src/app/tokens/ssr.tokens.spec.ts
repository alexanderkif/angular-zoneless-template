import { InjectionToken } from '@angular/core';
import { REQUEST } from './ssr.tokens';

describe('SSR Tokens', () => {
  it('should export REQUEST token', () => {
    expect(REQUEST).toBeInstanceOf(InjectionToken);
    expect(REQUEST.toString()).toContain('REQUEST');
  });

  it('should be a singleton', () => {
    const KEY = Symbol.for('NG_SSR_REQUEST_TOKEN');
    const globalObj = globalThis as any;
    expect(globalObj[KEY]).toBe(REQUEST);
  });

  it('should export REQUEST when already defined on globalObj', async () => {
    const KEY = Symbol.for('NG_SSR_REQUEST_TOKEN');
    const globalObj = globalThis as any;
    globalObj[KEY] = {};
    const mod = await import('./ssr.tokens');
    expect(mod.REQUEST).toBeDefined();
    // cleanup
    delete globalObj[KEY];
  });

  it('should create and reuse singleton token on repeated calls', async () => {
    const mod = await import('./ssr.tokens');
    const token1 = mod.getRequestToken();
    const token2 = mod.getRequestToken();
    expect(token1).toBe(token2);
    expect(token1).toBeInstanceOf(InjectionToken);
  });
});
