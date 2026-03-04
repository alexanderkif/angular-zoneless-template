import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { AuthQueryService, AuthUser } from '../services/auth-query.service';

/**
 * Guard for public routes (login, register)
 * Redirects to home if user is already authenticated
 */
export const publicGuard: CanActivateFn = async (route) => {
  const router = inject(Router);
  const queryClient = inject(QueryClient);
  const authQueryService = inject(AuthQueryService);

  try {
    const user = await queryClient.ensureQueryData<AuthUser | null>({
      queryKey: ['auth', 'currentUser'],
      queryFn: () => authQueryService.fetchCurrentUser(),
      retry: 1,
      staleTime: 1000 * 60 * 5,
    });

    if (user) {
      const returnUrl = route.queryParams?.['returnUrl'];
      if (typeof returnUrl === 'string' && returnUrl.startsWith('/')) {
        return router.parseUrl(returnUrl);
      }

      return router.createUrlTree(['/']);
    }

    return true;
  } catch {
    // Пользователь не авторизован - можно показать публичную страницу
    return true;
  }
};
