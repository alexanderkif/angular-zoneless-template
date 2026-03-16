import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthRefreshCoordinatorService } from '../services/auth-refresh-coordinator.service';

export const tokenRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const refreshCoordinator = inject(AuthRefreshCoordinatorService);
  const platformId = inject(PLATFORM_ID);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 and not already refreshing and not a refresh endpoint
      if (
        error.status === 401 &&
        isPlatformBrowser(platformId) &&
        !req.headers.has('X-Skip-Refresh') &&
        !req.url.includes('/auth/refresh') &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/register') &&
        !req.url.includes('/auth/logout')
      ) {
        const retryReq = req.clone({ setHeaders: { 'X-Skip-Refresh': '1' } });
        return from(refreshCoordinator.refreshSession()).pipe(switchMap(() => next(retryReq)));
      }

      return throwError(() => error);
    }),
  );
};
