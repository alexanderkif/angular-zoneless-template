import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { ssrCookieInterceptor } from './interceptors/ssr-cookie.interceptor';
import { tokenRefreshInterceptor } from './interceptors/token-refresh.interceptor';

/**
 * Application Config (Angular 22 - SSR Ready)
 *
 * Ключевые особенности для SSR авторизации:
 *
 * 1. provideClientHydration() - гидратация SSR + HTTP transfer cache
 * 2. withFetch() - Fetch API
 * 3. ssrCookieInterceptor - на сервере перекладывает cookies в API запросы
 * 4. withXsrfConfiguration - защита от CSRF
 * 5. Серверное состояние - `resource()` / `httpResource()` в NgRx Signal Store
 *    (TanStack Query удалён); TransferState у ресурсов через опцию `id`
 *
 * Логика работы:
 * - SSR: cookies из браузера → API → получение user → рендер с данными
 * - Client: гидратация с SSR данными → избегаем повторных запросов
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includePostRequests: false,
      }),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([ssrCookieInterceptor, tokenRefreshInterceptor]),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      }),
    ),
  ],
};
