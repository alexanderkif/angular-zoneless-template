import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import {
  ApplicationConfig,
  InjectionToken,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { routes } from './app.routes';
import { ssrCookieInterceptor } from './interceptors/ssr-cookie.interceptor';
import { tokenRefreshInterceptor } from './interceptors/token-refresh.interceptor';

/**
 * Application Config (Best Practice 2026 - SSR Ready)
 *
 * Ключевые особенности для SSR авторизации:
 *
 * 1. provideClientHydration() - включает гидратацию SSR
 * 2. withFetch() - использует Fetch API с автоматическим transfer cache
 * 3. ssrCookieInterceptor - на сервере перекладывает cookies в API запросы
 * 4. withFetchWithXsrfConfiguration - защита от CSRF атак
 * 5. provideTanStackQuery - TanStack Query для серверных данных (user, posts)
 * 6. Signal Store - для UI состояния (открытие меню, модалки и т.д.)
 *
 * Логика работы:
 * - SSR: cookies из браузера → API → получение user → рендер с данными
 * - Client: гидратация с SSR данными → избегаем повторных запросов
 * - TanStack Query: кеширование, автоматический refetch, оптимистичные обновления
 */

// TypeScript declaration for TanStack Query DevTools browser extension
declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: QueryClient;
  }
}

const TANSTACK_QUERY_CLIENT = new InjectionToken<QueryClient>('TANSTACK_QUERY_CLIENT');

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
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
    {
      provide: TANSTACK_QUERY_CLIENT,
      useFactory: createQueryClient,
    },
    provideTanStackQuery(TANSTACK_QUERY_CLIENT),
    provideAppInitializer(() => {
      // Connect to TanStack Query DevTools browser extension (in development only)
      if (isDevMode() && typeof window !== 'undefined') {
        const queryClient = inject(QueryClient);
        window.__TANSTACK_QUERY_CLIENT__ = queryClient;
      }
    }),
    // TODO: Add devtools when @tanstack/angular-query-devtools package becomes available
  ],
};
