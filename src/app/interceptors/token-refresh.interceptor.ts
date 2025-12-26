import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { tokenActions } from '../store/auth/auth.actions';

let isRefreshing = false;

export const tokenRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const store = inject(Store);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 and not already refreshing and not a refresh endpoint
      if (
        error.status === 401 &&
        !isRefreshing &&
        !req.url.includes('/auth/refresh') &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/register')
      ) {
        isRefreshing = true;

        // Try to refresh token
        return authService.refreshToken().pipe(
          switchMap((user) => {
            isRefreshing = false;
            store.dispatch(tokenActions.refreshTokenSuccess({ user }));
            
            // Retry original request
            return next(req);
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            // Don't dispatch failure action if it's just a missing refresh token
            // This is normal for logged-out users
            if (refreshError?.message !== 'Session expired') {
              store.dispatch(tokenActions.refreshTokenFailure({ error: 'Session expired' }));
            }
            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};
