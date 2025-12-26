import { createFeature, createReducer, on } from '@ngrx/store';
import { AuthUser, loginActions, registerActions, oauthActions, sessionActions, tokenActions } from './auth.actions';

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionChecked: boolean; // Track if initial session check completed
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading - will be set to false after session check
  sessionChecked: false, // Session check not yet performed
  error: null,
};

export const authFeature = createFeature({
  name: 'auth',
  reducer: createReducer(
    initialState,

    // Login
    on(loginActions.login, (state) => ({
      ...state,
      isLoading: true,
      error: null,
    })),
    on(loginActions.loginSuccess, (state, { user }) => ({
      ...state,
      user,
      isAuthenticated: true,
      isLoading: false,
      sessionChecked: true,
      error: null,
    })),
    on(loginActions.loginFailure, (state, { error }) => ({
      ...state,
      isLoading: false,
      error,
    })),

    // Register
    on(registerActions.register, (state) => ({
      ...state,
      isLoading: true,
      error: null,
    })),
    on(registerActions.registerSuccess, (state) => ({
      ...state,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })),
    on(registerActions.registerFailure, (state, { error }) => ({
      ...state,
      isLoading: false,
      error,
    })),

    // OAuth
    on(oauthActions.githubLogin, oauthActions.googleLogin, (state) => ({
      ...state,
      isLoading: true,
      error: null,
    })),
    on(oauthActions.oAuthSuccess, (state, { user }) => ({
      ...state,
      user,
      isAuthenticated: true,
      isLoading: false,
      sessionChecked: true,
      error: null
    })),
    on(oauthActions.oAuthFailure, (state, { error }) => ({
      ...state,
      isLoading: false,
      error,
    })),

    // Session
    on(sessionActions.checkSession, (state) => ({
      ...state,
      isLoading: true,
    })),
    on(sessionActions.sessionValid, (state, { user }) => ({
      ...state,
      user,
      isAuthenticated: true,
      isLoading: false,
      sessionChecked: true,
      error: null,
    })),
    on(sessionActions.sessionInvalid, (state) => ({
      ...state,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      sessionChecked: true,
      error: null,
    })),

    // Logout - immediate state reset (optimistic)
    on(sessionActions.logout, (state) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false, // Important: Set to false to not block guards
      sessionChecked: true, // Keep true - we know user is logged out
      error: null,
    })),

    // Token refresh
    on(tokenActions.refreshToken, (state) => state),
    on(tokenActions.refreshTokenSuccess, (state, { user }) => ({
      ...state,
      user,
      isAuthenticated: true,
      error: null,
    })),
    on(tokenActions.refreshTokenFailure, (state) => ({
      ...state,
      user: null,
      isAuthenticated: false,
      error: 'Session expired',
    }))
  ),
});

export const {
  name: authFeatureKey,
  reducer: authReducer,
  selectAuthState,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectSessionChecked,
  selectError,
} = authFeature;
