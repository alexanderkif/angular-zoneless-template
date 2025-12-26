import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectIsAuthenticated, selectSessionChecked } from '../store/auth/auth.selectors';
import { map, filter, take, timeout, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * Auth Guard (Best Practice 2025 - SSR Compatible)
 * 
 * Защищает роуты, требующие авторизации.
 * Работает как на клиенте, так и на сервере (SSR).
 * 
 * SSR поведение:
 * - Guard ждет завершения checkSession() через selectSessionChecked
 * - Cookies автоматически передаются через ssrCookieInterceptor
 * - При неавторизованном доступе router.createUrlTree() вызовет HTTP 302 редирект
 * 
 * Client поведение:
 * - Guard проверяет состояние из store (гидратированное из SSR или обновленное на клиенте)
 * - Выполняет client-side навигацию при редиректе
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const store = inject(Store);

  // Wait for initial session check to complete
  return store.select(selectSessionChecked).pipe(
    filter(checked => checked === true), // Wait until session was checked
    take(1), // Take only the first emission after check completes
    switchMap(() => store.select(selectIsAuthenticated).pipe(take(1))), // Get current auth state
    timeout(5000), // Max 5 seconds wait
    map((isAuthenticated) => {
      if (!isAuthenticated) {
        // На SSR это вызовет HTTP 302 редирект
        // На клиенте - обычную навигацию
        return router.createUrlTree(['/login'], { 
          queryParams: { returnUrl: state.url } 
        });
      }
      
      return true;
    }),
    catchError(() => {
      // Timeout or error - redirect to login
      console.error('Auth guard timeout - redirecting to login');
      return of(router.createUrlTree(['/login'], { 
        queryParams: { returnUrl: state.url } 
      }));
    })
  );
};
