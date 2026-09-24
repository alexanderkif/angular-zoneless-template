import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'themePreference';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * ThemeService — светлая/тёмная тема в стиле angular.dev.
 *
 * Тема применяется как `data-theme="light|dark"` на `<html>` (см. `styles.css`,
 * токены на `light-dark()`). Предпочтение хранится в `localStorage.themePreference`
 * (как на angular.dev); `system` следует `prefers-color-scheme` на момент загрузки.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly preference = signal<ThemePreference>('system');
  private readonly systemTheme = signal<ResolvedTheme>('light');

  readonly resolved = computed<ResolvedTheme>(() => {
    const preference = this.preference();
    return preference === 'system' ? this.systemTheme() : preference;
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      this.preference.set(stored);
    }

    this.systemTheme.set(this.readSystemTheme());
    this.applyResolvedTheme();
  }

  setPreference = (preference: ThemePreference): void => {
    this.preference.set(preference);

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (preference === 'system') {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, preference);
    }

    this.applyResolvedTheme();
  };

  /** Переключение между светлой и тёмной темой (из user-menu). */
  toggle = (): void => {
    this.setPreference(this.resolved() === 'dark' ? 'light' : 'dark');
  };

  private readSystemTheme(): ResolvedTheme {
    if (typeof window.matchMedia !== 'function') {
      return 'light';
    }
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
  }

  private applyResolvedTheme(): void {
    document.documentElement.dataset['theme'] = this.resolved();
  }
}
