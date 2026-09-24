import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { throwError, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../tokens/api-url.token';
import {
  SessionService,
  type AuthUser,
  type LoginCredentials,
  type RegisterPayload,
  type SessionActionState,
} from './session.service';

const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
  avatarUrl: null,
  provider: 'local',
  emailVerified: true,
  role: 'user',
  ...overrides,
});

interface ServiceInternals {
  http: { get: (...args: unknown[]) => Observable<unknown> };
  loadCurrentUser: () => Promise<AuthUser | null>;
  run: <T>(state: SessionActionState, operation: () => Promise<T>) => Promise<T>;
}

describe('SessionService', () => {
  let service: SessionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });

    service = TestBed.inject(SessionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const internals = (): ServiceInternals => service as unknown as ServiceInternals;

  const loadInitialUser = async (user: AuthUser): Promise<void> => {
    TestBed.tick();
    const req = httpMock.expectOne('/api/user/me');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ user });
    await vi.waitFor(() => expect(service.currentUser.status()).toBe('resolved'));
  };

  describe('currentUser resource', () => {
    it('loads the current user from /user/me', async () => {
      const user = makeUser();

      await loadInitialUser(user);

      expect(service.currentUser.value()).toEqual(user);
    });

    it('resolves to null on a 401 response', async () => {
      TestBed.tick();
      const req = httpMock.expectOne('/api/user/me');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      await vi.waitFor(() => expect(service.currentUser.status()).toBe('resolved'));

      expect(service.currentUser.value()).toBeNull();
    });

    it('resolves to null for a non-401 response (no error state)', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      TestBed.tick();
      const req = httpMock.expectOne('/api/user/me');
      req.flush('Server error', { status: 500, statusText: 'Server Error' });

      await vi.waitFor(() => expect(service.currentUser.status()).toBe('resolved'));

      expect(service.currentUser.value()).toBeNull();
      expect(service.currentUser.error()).toBeUndefined();
    });
  });

  describe('ensureUser', () => {
    it('returns the cached user when the resource is already resolved', async () => {
      const user = makeUser();
      await loadInitialUser(user);

      await expect(service.ensureUser()).resolves.toEqual(user);

      httpMock.expectNone('/api/user/me');
    });

    it('returns the local value without HTTP when set locally', async () => {
      const user = makeUser({ id: 'local-user' });
      service.currentUser.value.set(user);

      await expect(service.ensureUser()).resolves.toEqual(user);

      httpMock.expectNone('/api/user/me');
    });

    it('loads the user over HTTP when the resource is still loading', async () => {
      const user = makeUser();

      const promise = service.ensureUser();
      const req = httpMock.expectOne('/api/user/me');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ user });

      await expect(promise).resolves.toEqual(user);
      expect(service.currentUser.value()).toEqual(user);
      expect(service.currentUser.status()).toBe('local');
    });

    it('deduplicates concurrent calls into a single request', async () => {
      const user = makeUser();

      const first = service.ensureUser();
      const second = service.ensureUser();

      expect(second).toBe(first);

      const req = httpMock.expectOne('/api/user/me');
      req.flush({ user });

      await expect(Promise.all([first, second])).resolves.toEqual([user, user]);
      expect(httpMock.match('/api/user/me')).toHaveLength(0);
    });

    it('resolves null when /user/me answers 401', async () => {
      const promise = service.ensureUser();
      const req = httpMock.expectOne('/api/user/me');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      await expect(promise).resolves.toBeNull();
      expect(service.currentUser.value()).toBeNull();
    });

    it('resolves null for a non-401 HTTP error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const promise = service.ensureUser();
      const req = httpMock.expectOne('/api/user/me');
      req.flush('Server error', { status: 500, statusText: 'Server Error' });

      await expect(promise).resolves.toBeNull();
      expect(httpMock.match('/api/user/me')).toHaveLength(0);
    });

    it('returns null for a non-HTTP error from the loader', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const plain = new Error('plain failure');
      const serviceInternals = internals();
      serviceInternals.http = { get: () => throwError(() => plain) };

      await expect(serviceInternals.loadCurrentUser()).resolves.toBeNull();
    });
  });

  describe('reloadCurrentUser', () => {
    it('reloads the user and returns a boolean', async () => {
      await loadInitialUser(makeUser());
      const updated = makeUser({ id: 'updated' });

      expect(service.reloadCurrentUser()).toBe(true);

      TestBed.tick();
      const req = httpMock.expectOne('/api/user/me');
      req.flush({ user: updated });

      await vi.waitFor(() => expect(service.currentUser.value()).toEqual(updated));
    });
  });

  describe('login', () => {
    it('stores the user and clears the pending state on success', async () => {
      const user = makeUser();
      const credentials: LoginCredentials = {
        email: 'user@example.com',
        password: 'secret',
        rememberMe: true,
      };

      const promise = service.login(credentials);
      expect(service.loginState.isPending()).toBe(true);

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      expect(req.request.withCredentials).toBe(true);
      req.flush({ user });

      await expect(promise).resolves.toEqual(user);
      expect(service.currentUser.value()).toEqual(user);
      expect(service.loginState.isPending()).toBe(false);
      expect(service.loginState.error()).toBeNull();
    });

    it('records the error and rethrows on failure', async () => {
      const promise = service.login({ email: 'user@example.com', password: 'bad' });
      const assertion = expect(promise).rejects.toBeInstanceOf(Error);

      const req = httpMock.expectOne('/api/auth/login');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      await assertion;
      expect(service.loginState.error()).toBeInstanceOf(Error);
      expect(service.loginState.isPending()).toBe(false);
    });
  });

  describe('register', () => {
    it('stores the user and clears the pending state on success', async () => {
      const user = makeUser();
      const payload: RegisterPayload = {
        email: 'user@example.com',
        password: 'secret',
        name: 'Test User',
      };

      const promise = service.register(payload);
      expect(service.registerState.isPending()).toBe(true);

      const req = httpMock.expectOne('/api/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ user });

      await expect(promise).resolves.toEqual(user);
      expect(service.currentUser.value()).toEqual(user);
      expect(service.registerState.isPending()).toBe(false);
      expect(service.registerState.error()).toBeNull();
    });

    it('records the error and rethrows on failure', async () => {
      const promise = service.register({
        email: 'user@example.com',
        password: 'bad',
        name: 'Test User',
      });
      const assertion = expect(promise).rejects.toBeInstanceOf(Error);

      const req = httpMock.expectOne('/api/auth/register');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });

      await assertion;
      expect(service.registerState.error()).toBeInstanceOf(Error);
      expect(service.registerState.isPending()).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears the current user on success', async () => {
      service.currentUser.value.set(makeUser());

      const promise = service.logout();

      const req = httpMock.expectOne('/api/auth/logout');
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);

      await expect(promise).resolves.toBeUndefined();
      expect(service.currentUser.value()).toBeNull();
      expect(service.logoutState.error()).toBeNull();
    });

    it('still clears the current user and records the error on failure', async () => {
      service.currentUser.value.set(makeUser());

      const promise = service.logout();
      const assertion = expect(promise).rejects.toBeInstanceOf(Error);

      const req = httpMock.expectOne('/api/auth/logout');
      req.flush('Server error', { status: 500, statusText: 'Server Error' });

      await assertion;
      expect(service.currentUser.value()).toBeNull();
      expect(service.logoutState.error()).toBeInstanceOf(Error);
    });
  });

  describe('verifyEmail', () => {
    it('verifies the email, stores the user and returns the payload', async () => {
      const user = makeUser({ emailVerified: true });
      const result = { message: 'verified', user };

      const promise = service.verifyEmail('a b/c');

      const req = httpMock.expectOne('/api/auth/verify-email?token=a%20b%2Fc');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(result);

      await expect(promise).resolves.toEqual(result);
      expect(service.currentUser.value()).toEqual(user);
      expect(service.verifyEmailState.error()).toBeNull();
    });

    it('records the error and rethrows on failure', async () => {
      const promise = service.verifyEmail('token-1');
      const assertion = expect(promise).rejects.toBeInstanceOf(Error);

      const req = httpMock.expectOne('/api/auth/verify-email?token=token-1');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });

      await assertion;
      expect(service.verifyEmailState.error()).toBeInstanceOf(Error);
      expect(service.verifyEmailState.isPending()).toBe(false);
    });
  });

  describe('resendVerification', () => {
    it('sends the payload and returns the message', async () => {
      const promise = service.resendVerification({ email: 'user@example.com' });
      expect(service.resendState.isPending()).toBe(true);

      const req = httpMock.expectOne('/api/auth/resend-verification');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'user@example.com' });
      req.flush({ message: 'sent' });

      await expect(promise).resolves.toEqual({ message: 'sent' });
      expect(service.resendState.error()).toBeNull();
      expect(service.resendState.isPending()).toBe(false);
    });

    it('records the error and rethrows on failure', async () => {
      const promise = service.resendVerification({ token: 'token-1' });
      const assertion = expect(promise).rejects.toBeInstanceOf(Error);

      const req = httpMock.expectOne('/api/auth/resend-verification');
      expect(req.request.body).toEqual({ token: 'token-1' });
      req.flush('Server error', { status: 500, statusText: 'Server Error' });

      await assertion;
      expect(service.resendState.error()).toBeInstanceOf(Error);
    });
  });

  describe('refreshSession', () => {
    it('stores the user and returns it on success', async () => {
      const user = makeUser();

      const promise = service.refreshSession();

      const req = httpMock.expectOne('/api/auth/refresh');
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ user });

      await expect(promise).resolves.toEqual(user);
      expect(service.currentUser.value()).toEqual(user);
    });

    it('coalesces concurrent calls into a single request', async () => {
      const user = makeUser();

      const first = service.refreshSession();
      const second = service.refreshSession();

      expect(second).toBe(first);

      const req = httpMock.expectOne('/api/auth/refresh');
      req.flush({ user });

      await expect(Promise.all([first, second])).resolves.toEqual([user, user]);
      expect(httpMock.match('/api/auth/refresh')).toHaveLength(0);
    });

    it('clears the current user and rethrows on failure', async () => {
      service.currentUser.value.set(makeUser());

      const promise = service.refreshSession();
      const assertion = expect(promise).rejects.toBeInstanceOf(Error);

      const req = httpMock.expectOne('/api/auth/refresh');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      await assertion;
      expect(service.currentUser.value()).toBeNull();
      expect(service.currentUser.status()).toBe('local');
    });
  });

  describe('run error normalization', () => {
    it('passes an Error instance through unchanged', async () => {
      const { run } = internals();
      const original = new Error('original');

      await expect(run(service.loginState, () => Promise.reject(original))).rejects.toBe(original);

      expect(service.loginState.error()).toBe(original);
      expect(service.loginState.isPending()).toBe(false);
    });

    it('wraps a string rejection into an Error', async () => {
      const { run } = internals();

      await expect(run(service.loginState, () => Promise.reject('boom'))).rejects.toThrow('boom');

      expect(service.loginState.error()?.message).toBe('boom');
      expect(service.loginState.isPending()).toBe(false);
    });

    it('wraps an unknown rejection into a generic Error', async () => {
      const { run } = internals();

      await expect(run(service.loginState, () => Promise.reject(42))).rejects.toThrow(
        'Unknown error',
      );

      expect(service.loginState.error()?.message).toBe('Unknown error');
    });
  });
});
