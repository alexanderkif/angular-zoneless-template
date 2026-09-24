import { IncomingMessage } from 'node:http';
import { isPlatformServer } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../core/auth/session.service';

/**
 * Auth Guard (Angular 22 - SSR Compatible)
 *
 * Защищает роуты, требующие авторизации. Работает на клиенте и на сервере (SSR).
 *
 * Замена TanStack `ensureQueryData` на `SessionService.ensureUser()`.
 * Cookies на сервере прокидываются `ssrCookieInterceptor`.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const session = inject(SessionService);
  const platformId = inject(PLATFORM_ID);

  try {
    const user = await session.ensureUser();

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
        await session.refreshSession();
        const refreshedUser = await session.ensureUser();

        if (refreshedUser) {
          return true;
        }
      } catch {
        // no-op: fallback to login redirect below
      }

      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    return true;
  } catch {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }
};
