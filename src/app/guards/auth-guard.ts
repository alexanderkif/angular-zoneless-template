import { CanActivateFn, Router } from '@angular/router';
import { selectUserName } from '../store/users/users.selector';
import { GUEST } from '../types/user';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { UserState } from '../store/users/users.reducer';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const userStore = inject(Store<UserState>);

  return userStore.selectSignal(selectUserName)() !== GUEST || router.createUrlTree(['/']);
};
