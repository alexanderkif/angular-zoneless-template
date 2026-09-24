import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../core/auth/session.service';

/**
 * Guard for public routes (login, register).
 * Redirects to home if user is already authenticated.
 *
 * Замена TanStack `ensureQueryData` на `SessionService.ensureUser()`.
 */
export const publicGuard: CanActivateFn = async (route) => {
  const router = inject(Router);
  const session = inject(SessionService);

  try {
    const user = await session.ensureUser();

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
