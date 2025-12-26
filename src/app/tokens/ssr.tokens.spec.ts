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
});
