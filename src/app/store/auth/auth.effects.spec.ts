import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { AuthEffects } from './auth.effects';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { loginActions, registerActions, oauthActions, sessionActions, tokenActions } from './auth.actions';
import { PLATFORM_ID, TransferState, makeStateKey, provideZonelessChangeDetection } from '@angular/core';

describe('AuthEffects', () => {
  let actions$: Observable<any>;
  let effects: AuthEffects;
  let authServiceMock: any;
  let routerMock: any;
  let transferStateMock: any;

  beforeEach(() => {
    authServiceMock = {
      login: vi.fn(),
      register: vi.fn(),
      loginWithGithub: vi.fn(),
      loginWithGoogle: vi.fn(),
      getCurrentUser: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn()
    };

    routerMock = {
      navigateByUrl: vi.fn(),
      navigate: vi.fn(),
      parseUrl: vi.fn(),
      _url: '/login',
      get url() { return this._url; }
    };

    transferStateMock = {
      hasKey: vi.fn(),
      get: vi.fn(),
      remove: vi.fn(),
      set: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthEffects,
        provideMockActions(() => actions$),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: TransferState, useValue: transferStateMock },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });

    effects = TestBed.inject(AuthEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });

  describe('login$', () => {
    it('should return loginSuccess on success', async () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      const action = loginActions.login({ email: 'test@example.com', password: 'password' });
      const outcome = loginActions.loginSuccess({ user, returnUrl: undefined });

      actions$ = of(action);
      authServiceMock.login.mockReturnValue(of(user));

      const result = await firstValueFrom(effects.login$);
      expect(result).toEqual(outcome);
    });

    it('should return loginFailure on error', async () => {
      const error = 'Login failed';
      const action = loginActions.login({ email: 'test@example.com', password: 'password' });
      const outcome = loginActions.loginFailure({ error });

      actions$ = of(action);
      authServiceMock.login.mockReturnValue(throwError(() => new Error(error)));

      const result = await firstValueFrom(effects.login$);
      expect(result).toEqual(outcome);
    });

    it('should return loginFailure with default message on error without message', async () => {
      const action = loginActions.login({ email: 'test@example.com', password: 'password' });
      const outcome = loginActions.loginFailure({ error: 'Login failed' });

      actions$ = of(action);
      authServiceMock.login.mockReturnValue(throwError(() => ({})));

      const result = await firstValueFrom(effects.login$);
      expect(result).toEqual(outcome);
    });
  });

  describe('loginSuccess$', () => {
    it('should navigate to returnUrl', async () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      const action = loginActions.loginSuccess({ user, returnUrl: '/dashboard' });

      actions$ = of(action);

      await firstValueFrom(effects.loginSuccess$);
      expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to root if no returnUrl', async () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      const action = loginActions.loginSuccess({ user });

      actions$ = of(action);

      await firstValueFrom(effects.loginSuccess$);
      expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
    });
  });

  describe('register$', () => {
    it('should return registerSuccess on success', async () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      const action = registerActions.register({ email: 'test@example.com', password: 'password', name: 'Test' });
      const outcome = registerActions.registerSuccess({ user });

      actions$ = of(action);
      authServiceMock.register.mockReturnValue(of(user));

      const result = await firstValueFrom(effects.register$);
      expect(result).toEqual(outcome);
    });

    it('should return registerFailure on error', async () => {
      const error = 'Registration failed';
      const action = registerActions.register({ email: 'test@example.com', password: 'password', name: 'Test' });
      const outcome = registerActions.registerFailure({ error });

      actions$ = of(action);
      authServiceMock.register.mockReturnValue(throwError(() => new Error(error)));

      const result = await firstValueFrom(effects.register$);
      expect(result).toEqual(outcome);
    });

    it('should return registerFailure with default message on error without message', async () => {
      const action = registerActions.register({ email: 'test@example.com', password: 'password', name: 'Test' });
      const outcome = registerActions.registerFailure({ error: 'Registration failed' });

      actions$ = of(action);
      authServiceMock.register.mockReturnValue(throwError(() => ({})));

      const result = await firstValueFrom(effects.register$);
      expect(result).toEqual(outcome);
    });
  });

  describe('oauth$', () => {
    it('should call loginWithGithub', async () => {
      const action = oauthActions.githubLogin();
      actions$ = of(action);

      await firstValueFrom(effects.githubLogin$);
      expect(authServiceMock.loginWithGithub).toHaveBeenCalled();
    });

    it('should call loginWithGoogle', async () => {
      const action = oauthActions.googleLogin();
      actions$ = of(action);

      await firstValueFrom(effects.googleLogin$);
      expect(authServiceMock.loginWithGoogle).toHaveBeenCalled();
    });
  });

  describe('checkSession$', () => {
    it('should use TransferState if available (browser)', async () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      const action = sessionActions.checkSession();
      const outcome = sessionActions.sessionValid({ user });

      actions$ = of(action);
      transferStateMock.hasKey.mockReturnValue(true);
      transferStateMock.get.mockReturnValue(user);

      const result = await firstValueFrom(effects.checkSession$);
      expect(result).toEqual(outcome);
      expect(transferStateMock.remove).toHaveBeenCalled();
      expect(authServiceMock.getCurrentUser).not.toHaveBeenCalled();
    });

    it('should return sessionInvalid if TransferState has null (browser)', async () => {
      const action = sessionActions.checkSession();
      const outcome = sessionActions.sessionInvalid();

      actions$ = of(action);
      transferStateMock.hasKey.mockReturnValue(true);
      transferStateMock.get.mockReturnValue(null);

      const result = await firstValueFrom(effects.checkSession$);
      expect(result).toEqual(outcome);
      expect(transferStateMock.remove).toHaveBeenCalled();
      expect(authServiceMock.getCurrentUser).not.toHaveBeenCalled();
    });

    it('should call API if TransferState missing (browser)', async () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      const action = sessionActions.checkSession();
      const outcome = sessionActions.sessionValid({ user });

      actions$ = of(action);
      transferStateMock.hasKey.mockReturnValue(false);
      authServiceMock.getCurrentUser.mockReturnValue(of(user));

      const result = await firstValueFrom(effects.checkSession$);
      expect(result).toEqual(outcome);
      expect(authServiceMock.getCurrentUser).toHaveBeenCalled();
    });

    it('should return sessionInvalid on API error (browser)', async () => {
      const action = sessionActions.checkSession();
      const outcome = sessionActions.sessionInvalid();

      actions$ = of(action);
      transferStateMock.hasKey.mockReturnValue(false);
      authServiceMock.getCurrentUser.mockReturnValue(throwError(() => new Error('Error')));

      const result = await firstValueFrom(effects.checkSession$);
      expect(result).toEqual(outcome);
    });
  });

  describe('redirectIfAuthenticated$', () => {
    it('should navigate to returnUrl if on login page', async () => {
      const action = sessionActions.sessionValid({ user: { id: '1', email: 'test', name: 'Test' } });
      actions$ = of(action);

      routerMock._url = '/login?returnUrl=/dashboard';
      routerMock.parseUrl.mockReturnValue({ queryParams: { returnUrl: '/dashboard' } });

      await firstValueFrom(effects.redirectIfAuthenticated$);
      expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to root if on register page without returnUrl', async () => {
      const action = sessionActions.sessionValid({ user: { id: '1', email: 'test', name: 'Test' } });
      actions$ = of(action);

      routerMock._url = '/register';
      routerMock.parseUrl.mockReturnValue({ queryParams: {} });

      await firstValueFrom(effects.redirectIfAuthenticated$);
      expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('should NOT navigate if not on auth page', async () => {
      const action = sessionActions.sessionValid({ user: { id: '1', email: 'test', name: 'Test' } });
      actions$ = of(action);

      routerMock._url = '/dashboard';

      await firstValueFrom(effects.redirectIfAuthenticated$);
      expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  describe('logout$', () => {
    it('should call logout API and navigate if protected', async () => {
      const action = sessionActions.logout();
      actions$ = of(action);
      
      // Mock protected route
      routerMock._url = '/posts';
      authServiceMock.logout.mockReturnValue(of(void 0));

      await firstValueFrom(effects.logout$);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
      expect(authServiceMock.logout).toHaveBeenCalled();
    });

    it('should call logout API and navigate if protected (nested route)', async () => {
      const action = sessionActions.logout();
      actions$ = of(action);
      
      // Mock protected route
      routerMock._url = '/posts/123';
      authServiceMock.logout.mockReturnValue(of(void 0));

      await firstValueFrom(effects.logout$);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
      expect(authServiceMock.logout).toHaveBeenCalled();
    });

    it('should call logout API and NOT navigate if public', async () => {
      const action = sessionActions.logout();
      actions$ = of(action);
      
      // Mock public route
      routerMock._url = '/';
      authServiceMock.logout.mockReturnValue(of(void 0));

      await firstValueFrom(effects.logout$);
      expect(routerMock.navigate).not.toHaveBeenCalled();
      expect(authServiceMock.logout).toHaveBeenCalled();
    });
  });

    it('should log error if logout API fails', async () => {
      const action = sessionActions.logout();
      actions$ = of(action);
      
      routerMock._url = '/';
      authServiceMock.logout.mockReturnValue(throwError(() => new Error('Logout failed')));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await firstValueFrom(effects.logout$);
      
      expect(authServiceMock.logout).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Logout API error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

  describe('refreshToken$', () => {
    it('should return refreshTokenSuccess on success', async () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      const action = tokenActions.refreshToken();
      const outcome = tokenActions.refreshTokenSuccess({ user });

      actions$ = of(action);
      authServiceMock.refreshToken.mockReturnValue(of(user));

      const result = await firstValueFrom(effects.refreshToken$);
      expect(result).toEqual(outcome);
    });

    it('should return refreshTokenFailure on error', async () => {
      const error = 'Token refresh failed';
      const action = tokenActions.refreshToken();
      const outcome = tokenActions.refreshTokenFailure({ error });

      actions$ = of(action);
      authServiceMock.refreshToken.mockReturnValue(throwError(() => new Error(error)));

      const result = await firstValueFrom(effects.refreshToken$);
      expect(result).toEqual(outcome);
    });

    it('should return refreshTokenFailure with default message on error without message', async () => {
      const action = tokenActions.refreshToken();
      const outcome = tokenActions.refreshTokenFailure({ error: 'Token refresh failed' });

      actions$ = of(action);
      authServiceMock.refreshToken.mockReturnValue(throwError(() => ({})));

      const result = await firstValueFrom(effects.refreshToken$);
      expect(result).toEqual(outcome);
    });
  });
});