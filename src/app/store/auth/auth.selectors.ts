import { createSelector } from '@ngrx/store';
import { authFeature } from './auth.reducer';

export const selectAuthState = authFeature.selectAuthState;
export const selectUser = authFeature.selectUser;
export const selectIsAuthenticated = authFeature.selectIsAuthenticated;
export const selectIsLoading = authFeature.selectIsLoading;
export const selectSessionChecked = authFeature.selectSessionChecked;
export const selectError = authFeature.selectError;

export const selectUserName = createSelector(
  selectUser,
  (user) => user?.name || 'Guest'
);

export const selectUserEmail = createSelector(
  selectUser,
  (user) => user?.email || ''
);

export const selectUserAvatar = createSelector(
  selectUser,
  (user) => user?.avatar_url || null
);

export const selectIsEmailProvider = createSelector(
  selectUser,
  (user) => user?.provider === 'email' || !user?.provider
);
