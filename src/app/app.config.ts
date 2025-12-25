import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { provideEffects } from '@ngrx/effects';
import { provideStore, provideState, Store } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { tokenRefreshInterceptor } from './interceptors/token-refresh.interceptor';
import { ssrCookieInterceptor } from './interceptors/ssr-cookie.interceptor';
import { authFeature } from './store/auth/auth.reducer';
import { AuthEffects } from './store/auth/auth.effects';
import { sessionActions } from './store/auth/auth.actions';

/**
 * Application Config (Best Practice 2025 - SSR Ready)
 * 
 * Ключевые особенности для SSR авторизации:
 * 
 * 1. provideClientHydration(withEventReplay()) - включает гидратацию SSR
 * 2. withFetch() - использует Fetch API с автоматическим transfer cache
 * 3. ssrCookieInterceptor - на сервере перекладывает cookies в API запросы
 * 4. withFetchWithXsrfConfiguration - защита от CSRF атак
 * 5. provideAppInitializer - проверяет сессию на старте (и SSR, и клиент)
 * 
 * Логика работы:
 * - SSR: cookies из браузера → API → получение user → рендер с данными
 * - Client: гидратация с SSR данными → избегаем повторных запросов
 * - Публичные страницы: checkSession выполняется для отображения user в header
 * - Закрытые страницы: authGuard ждет checkSession, затем проверяет авторизацию
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({
        includePostRequests: false
      })
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([ssrCookieInterceptor, tokenRefreshInterceptor]),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      })
    ),
    provideStore(),
    provideState(authFeature),
    provideEffects([AuthEffects]),
    provideAppInitializer(() => {
      const store = inject(Store);
      // Best Practice 2025: Проверяем сессию даже на публичных страницах
      // - На SSR: получаем user с сервера через cookies
      // - На клиенте: используем гидратированные данные или делаем запрос
      // Это позволяет показать аватарку/имя пользователя в header сразу
      store.dispatch(sessionActions.checkSession());
    }),
    provideStoreDevtools({
      maxAge: 25, // Retains last 25 states
      logOnly: !isDevMode(), // Restrict extension to log-only mode
    }),
  ],
};
