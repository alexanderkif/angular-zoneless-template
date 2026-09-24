import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

const stubMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn(() => ({ matches })) as unknown as typeof window.matchMedia;
};

describe('ThemeService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    stubMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createService = () => TestBed.inject(ThemeService);

  it('defaults to system/light and applies data-theme', () => {
    const service = createService();

    expect(service.preference()).toBe('system');
    expect(service.resolved()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('follows a dark system preference', () => {
    stubMatchMedia(true);

    const service = createService();

    expect(service.resolved()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('defaults to light when matchMedia is unavailable', () => {
    (window as { matchMedia?: unknown }).matchMedia = undefined;

    const service = createService();

    expect(service.resolved()).toBe('light');
  });

  it('restores a stored dark preference', () => {
    window.localStorage.setItem('themePreference', 'dark');

    const service = createService();

    expect(service.preference()).toBe('dark');
    expect(service.resolved()).toBe('dark');
  });

  it('restores a stored light preference', () => {
    window.localStorage.setItem('themePreference', 'light');

    const service = createService();

    expect(service.preference()).toBe('light');
    expect(service.resolved()).toBe('light');
  });

  it('falls back to system for an unknown stored value', () => {
    window.localStorage.setItem('themePreference', 'sepia');

    const service = createService();

    expect(service.preference()).toBe('system');
  });

  it('persists an explicit preference and applies it', () => {
    const service = createService();

    service.setPreference('dark');

    expect(window.localStorage.getItem('themePreference')).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(service.resolved()).toBe('dark');
  });

  it('clears storage when switching back to system', () => {
    const service = createService();
    service.setPreference('dark');

    service.setPreference('system');

    expect(window.localStorage.getItem('themePreference')).toBeNull();
  });

  it('toggles from light to dark and back', () => {
    const service = createService();

    service.toggle();
    expect(service.resolved()).toBe('dark');

    service.toggle();
    expect(service.resolved()).toBe('light');
  });

  describe('on the server', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
    });

    it('does not touch the DOM and still tracks the preference', () => {
      const service = createService();

      expect(service.preference()).toBe('system');

      service.setPreference('dark');

      expect(service.preference()).toBe('dark');
      expect(document.documentElement.dataset['theme']).toBeUndefined();
    });
  });
});
