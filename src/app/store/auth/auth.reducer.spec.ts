import { authReducer, AuthState } from './auth.reducer';
import { loginActions, registerActions, oauthActions, sessionActions, tokenActions } from './auth.actions';

describe('AuthReducer', () => {
  const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    sessionChecked: false,
    error: null,
  };

  it('should return the default state', () => {
    const action = { type: 'Unknown' };
    const state = authReducer(initialState, action);
    expect(state).toBe(initialState);
  });

  // Login
  it('should set loading on login', () => {
    const action = loginActions.login({ email: 'test@example.com', password: 'password' });
    const state = authReducer(initialState, action);
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should set user on loginSuccess', () => {
    const user = { id: '1', email: 'test@example.com', name: 'Test' };
    const action = loginActions.loginSuccess({ user });
    const state = authReducer(initialState, action);
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.sessionChecked).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should set error on loginFailure', () => {
    const error = 'Login failed';
    const action = loginActions.loginFailure({ error });
    const state = authReducer(initialState, action);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(error);
  });

  // Register
  it('should set loading on register', () => {
    const action = registerActions.register({ email: 'test@example.com', password: 'password', name: 'Test' });
    const state = authReducer(initialState, action);
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should reset state on registerSuccess', () => {
    const user = { id: '1', email: 'test@example.com', name: 'Test' };
    const action = registerActions.registerSuccess({ user });
    const state = authReducer(initialState, action);
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should set error on registerFailure', () => {
    const error = 'Registration failed';
    const action = registerActions.registerFailure({ error });
    const state = authReducer(initialState, action);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(error);
  });

  // OAuth
  it('should set loading on githubLogin', () => {
    const action = oauthActions.githubLogin();
    const state = authReducer(initialState, action);
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should set loading on googleLogin', () => {
    const action = oauthActions.googleLogin();
    const state = authReducer(initialState, action);
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should set user on oAuthSuccess', () => {
    const user = { id: '1', email: 'test@example.com', name: 'Test' };
    const action = oauthActions.oAuthSuccess({ user });
    const state = authReducer(initialState, action);
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.sessionChecked).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should set error on oAuthFailure', () => {
    const error = 'OAuth failed';
    const action = oauthActions.oAuthFailure({ error });
    const state = authReducer(initialState, action);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(error);
  });

  // Session
  it('should set loading on checkSession', () => {
    const action = sessionActions.checkSession();
    const state = authReducer(initialState, action);
    expect(state.isLoading).toBe(true);
  });

  it('should set user on sessionValid', () => {
    const user = { id: '1', email: 'test@example.com', name: 'Test' };
    const action = sessionActions.sessionValid({ user });
    const state = authReducer(initialState, action);
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.sessionChecked).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should reset state on sessionInvalid', () => {
    const action = sessionActions.sessionInvalid();
    const state = authReducer(initialState, action);
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.sessionChecked).toBe(true);
    expect(state.error).toBeNull();
  });

  // Logout
  it('should reset state on logout', () => {
    const loggedInState: AuthState = {
      ...initialState,
      user: { id: '1', email: 'test@example.com', name: 'Test' },
      isAuthenticated: true,
      sessionChecked: true,
      isLoading: false
    };
    const action = sessionActions.logout();
    const state = authReducer(loggedInState, action);
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.sessionChecked).toBe(true);
    expect(state.error).toBeNull();
  });

  // Token Refresh
  it('should return state on refreshToken', () => {
    const action = tokenActions.refreshToken();
    const state = authReducer(initialState, action);
    expect(state).toBe(initialState);
  });

  it('should update user on refreshTokenSuccess', () => {
    const user = { id: '1', email: 'test@example.com', name: 'Test' };
    const action = tokenActions.refreshTokenSuccess({ user });
    const state = authReducer(initialState, action);
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should reset state on refreshTokenFailure', () => {
    const error = 'Session expired';
    const action = tokenActions.refreshTokenFailure({ error });
    const state = authReducer(initialState, action);
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe(error);
  });
});
