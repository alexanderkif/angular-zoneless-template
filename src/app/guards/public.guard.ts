import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectIsAuthenticated } from '../store/auth/auth.selectors';

/**
 * Guard for public routes (login, register)
 * Redirects to home if user is already authenticated
 */
export const publicGuard: CanActivateFn = () => {
  const router = inject(Router);
  const store = inject(Store);
  const isAuthenticated = store.selectSignal(selectIsAuthenticated);

  if (isAuthenticated()) {
    return router.createUrlTree(['/']);
  }

  return true;
};
