import { IncomingMessage } from 'node:http';
import { isPlatformServer } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { QueryClient } from '@tanstack/angular-query-experimental';
import type { AuthUser } from '../services/auth-query.service';
import { AuthQueryService } from '../services/auth-query.service';
import { AuthRefreshCoordinatorService } from '../services/auth-refresh-coordinator.service';

/**
 * Auth Guard (Best Practice 2026 - SSR Compatible with TanStack Query)
 *
 * Защищает роуты, требующие авторизации.
 * Работает как на клиенте, так и на сервере (SSR).
 *
 * SSR поведение:
 * - Guard проверяет кеш TanStack Query
 * - Cookies автоматически передаются через ssrCookieInterceptor
 * - При неавторизованном доступе router.createUrlTree() вызовет HTTP 302 редирект
 *
 * Client поведение:
 * - Guard ждет завершения запроса currentUser перед принятием решения
 * - Выполняет client-side навигацию при редиректе
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const queryClient = inject(QueryClient);
  const authQueryService = inject(AuthQueryService);
  const refreshCoordinator = inject(AuthRefreshCoordinatorService);
  const platformId = inject(PLATFORM_ID);

  try {
    // Получаем данные пользователя из кеша или загружаем
    // ensureQueryData ждет завершения запроса, если он еще не выполнен
    const user = await queryClient.ensureQueryData<AuthUser | null>({
      queryKey: ['auth', 'currentUser'],
      queryFn: async (): Promise<AuthUser | null> => {
        try {
          // Используем метод из сервиса для единообразия
          return await authQueryService.fetchCurrentUser();
        } catch (error: any) {
          if (error.status === 401) {
            return null; // Not authenticated
          }
          throw error;
        }
      },
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    });

    if (!user) {
      if (isPlatformServer(platformId)) {
        try {
          const storage = (globalThis as any).requestStorage;
          const request = storage?.getStore() as IncomingMessage | undefined;
          const cookieHeader = Array.isArray(request?.headers?.cookie)
            ? request?.headers?.cookie.join('; ')
            : request?.headers?.cookie;

          if (typeof cookieHeader === 'string' && cookieHeader.includes('refresh_token=')) {
            return true;
          }
        } catch {
          // no-op: continue with normal auth flow
        }
      }

      try {
        await refreshCoordinator.refreshSession();
        const refreshedUser = await authQueryService.fetchCurrentUser();

        if (refreshedUser) {
          queryClient.setQueryData(['auth', 'currentUser'], refreshedUser);
          return true;
        }
      } catch {
        // no-op: fallback to login redirect below
      }

      // Clear all authenticated data if user is not logged in
      queryClient.removeQueries({ queryKey: ['posts'] });
      queryClient.removeQueries({ queryKey: ['comments'] });

      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    return true;
  } catch {
    // Ошибка или пользователь не авторизован
    // Clear all authenticated data
    queryClient.removeQueries({ queryKey: ['posts'] });
    queryClient.removeQueries({ queryKey: ['comments'] });

    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }
};
