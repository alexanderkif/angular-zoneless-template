import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import {
  AuthQueryService,
  createCurrentUserQueryOptions,
  createCurrentUserQueryInjectionFactory,
  createLoginMutationOptions,
  createLoginMutationInjectionFactory,
  createLogoutMutationOptions,
  createLogoutMutationInjectionFactory,
  createRefreshTokenMutationOptions,
  createRefreshTokenMutationInjectionFactory,
  createRegisterMutationOptions,
  createRegisterMutationInjectionFactory,
  createResendVerificationMutationOptions,
  createResendVerificationMutationInjectionFactory,
  createVerifyEmailMutationOptions,
  createVerifyEmailMutationInjectionFactory,
} from './auth-query.service';

describe('AuthQueryService', () => {
  let service: AuthQueryService;
  let httpMock: HttpTestingController;
  let queryClient: QueryClient;
  let http: HttpClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthQueryService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTanStackQuery(queryClient),
      ],
    });

    service = TestBed.inject(AuthQueryService);
    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
    queryClient.clear();
  });

  it('should fetch current user', async () => {
    const promise = service.fetchCurrentUser();

    const req = httpMock.expectOne('http://localhost:3000/api/user/me');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({
      user: {
        id: 'u1',
        email: 'u1@example.com',
        name: 'User',
        avatarUrl: null,
        provider: 'local',
        emailVerified: true,
        role: 'user',
      },
    });

    const user = await promise;
    expect(user?.id).toBe('u1');
  });

  it('should return null on 401', async () => {
    const promise = service.fetchCurrentUser();

    const meReq = httpMock.expectOne('http://localhost:3000/api/user/me');
    meReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    const user = await promise;
    expect(user).toBeNull();
  });

  it('should not perform refresh in service layer', async () => {
    const promise = service.fetchCurrentUser();

    const meReq = httpMock.expectOne('http://localhost:3000/api/user/me');
    meReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    httpMock.expectNone('http://localhost:3000/api/auth/refresh');

    const user = await promise;
    expect(user).toBeNull();
  });

  it('should throw non-401 errors', async () => {
    const promise = service.fetchCurrentUser();

    const req = httpMock.expectOne('http://localhost:3000/api/user/me');
    req.flush('Server Error', { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toBeTruthy();
  });

  it('should invalidate current user query on refetchUser', async () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    await service.refetchUser();

    expect(spy).toHaveBeenCalledWith({ queryKey: ['auth', 'currentUser'] });
  });

  it('should create currentUser query options', () => {
    const fetchCurrentUser = vi.fn(async () => null);
    const options = createCurrentUserQueryOptions(fetchCurrentUser);

    expect(options.queryKey).toEqual(['auth', 'currentUser']);
    expect(options.retry).toBe(1);
    expect(options.staleTime).toBe(1000 * 60 * 5);
    expect(options.refetchOnMount).toBe('always');
  });

  it('should call queryFn from currentUser options', async () => {
    const fetchCurrentUser = vi.fn(async () => ({
      id: 'u-callback',
      email: 'u@example.com',
      name: 'U',
      avatarUrl: null,
      provider: 'local',
      emailVerified: true,
      role: 'user' as const,
    }));
    const options = createCurrentUserQueryOptions(fetchCurrentUser);

    const result = await options.queryFn();

    expect(fetchCurrentUser).toHaveBeenCalled();
    expect(result.id).toBe('u-callback');
  });

  it('should execute login mutation and onSuccess cache updates', async () => {
    const setDataSpy = vi.spyOn(queryClient, 'setQueryData');
    const cancelSpy = vi.spyOn(queryClient, 'cancelQueries');

    const options = createLoginMutationOptions(http, 'http://localhost:3000/api', queryClient);
    const promise = options.mutationFn({
      email: 'user@example.com',
      password: 'secret',
      rememberMe: true,
    });

    const req = httpMock.expectOne('http://localhost:3000/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({
      user: {
        id: 'u-login',
        email: 'user@example.com',
        name: 'User',
        avatarUrl: null,
        provider: 'local',
        emailVerified: true,
        role: 'user',
      },
    });

    const user = await promise;
    await options.onSuccess(user);

    expect(cancelSpy).toHaveBeenCalledWith({ queryKey: ['auth', 'currentUser'] });
    expect(setDataSpy).toHaveBeenCalledWith(['auth', 'currentUser'], user);
  });

  it('should execute register mutation and invalidate active', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const options = createRegisterMutationOptions(http, 'http://localhost:3000/api', queryClient);

    const promise = options.mutationFn({ email: 'reg@example.com', password: 'pw', name: 'Reg' });

    const req = httpMock.expectOne('http://localhost:3000/api/auth/register');
    req.flush({
      user: {
        id: 'u-reg',
        email: 'reg@example.com',
        name: 'Reg',
        avatarUrl: null,
        provider: 'local',
        emailVerified: false,
        role: 'user',
      },
    });

    await promise;
    await options.onSuccess();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['auth', 'currentUser'],
      refetchType: 'active',
    });
  });

  it('should execute logout mutation and clear cache on success and error', async () => {
    const setDataSpy = vi.spyOn(queryClient, 'setQueryData');
    const removeSpy = vi.spyOn(queryClient, 'removeQueries');

    const options = createLogoutMutationOptions(http, 'http://localhost:3000/api', queryClient);
    expect(options.retry).toBe(0);

    const promise = options.mutationFn();
    const req = httpMock.expectOne('http://localhost:3000/api/auth/logout');
    req.flush({});
    await promise;

    options.onSuccess();
    options.onError();

    expect(setDataSpy).toHaveBeenCalledWith(['auth', 'currentUser'], null);
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['posts'] });
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['comments'] });
  });

  it('should execute verify email mutation and invalidate active', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const options = createVerifyEmailMutationOptions(
      http,
      'http://localhost:3000/api',
      queryClient,
    );

    const promise = options.mutationFn('verify-token');
    const req = httpMock.expectOne(
      'http://localhost:3000/api/auth/verify-email?token=verify-token',
    );
    req.flush({
      message: 'verified',
      user: {
        id: 'u-ver',
        email: 'v@example.com',
        name: 'Ver',
        avatarUrl: null,
        provider: 'local',
        emailVerified: true,
        role: 'user',
      },
    });

    const response = await promise;
    expect(response.message).toBe('verified');
    await options.onSuccess();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['auth', 'currentUser'],
      refetchType: 'active',
    });
  });

  it('should execute resend verification mutation', async () => {
    const options = createResendVerificationMutationOptions(http, 'http://localhost:3000/api');

    const promise = options.mutationFn({ token: 'token-1' });
    const req = httpMock.expectOne('http://localhost:3000/api/auth/resend-verification');
    expect(req.request.body).toEqual({ token: 'token-1' });
    req.flush({ message: 'resent' });

    const response = await promise;
    expect(response.message).toBe('resent');
  });

  it('should execute refresh mutation and invalidate active', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const options = createRefreshTokenMutationOptions(
      http,
      'http://localhost:3000/api',
      queryClient,
    );

    const promise = options.mutationFn();
    const req = httpMock.expectOne('http://localhost:3000/api/auth/refresh');
    req.flush({
      user: {
        id: 'u-refresh',
        email: 'r@example.com',
        name: 'Refresh',
        avatarUrl: null,
        provider: 'local',
        emailVerified: true,
        role: 'user',
      },
    });

    const user = await promise;
    expect(user.id).toBe('u-refresh');
    await options.onSuccess();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['auth', 'currentUser'],
      refetchType: 'active',
    });
  });

  it('should create query and mutation handles in injection context', () => {
    const currentUser = TestBed.runInInjectionContext(() => service.currentUserQuery());
    const login = TestBed.runInInjectionContext(() => service.loginMutation());
    const register = TestBed.runInInjectionContext(() => service.registerMutation());
    const logout = TestBed.runInInjectionContext(() => service.logoutMutation());
    const verify = TestBed.runInInjectionContext(() => service.verifyEmailMutation());
    const resend = TestBed.runInInjectionContext(() => service.resendVerificationMutation());
    const refresh = TestBed.runInInjectionContext(() => service.refreshTokenMutation());

    expect(currentUser).toBeDefined();
    expect(login).toBeDefined();
    expect(register).toBeDefined();
    expect(logout).toBeDefined();
    expect(verify).toBeDefined();
    expect(resend).toBeDefined();
    expect(refresh).toBeDefined();
  });

  it('should create injection callback factories for query and mutations', () => {
    const queryFactory = createCurrentUserQueryInjectionFactory(async () => null);
    const loginFactory = createLoginMutationInjectionFactory(
      http,
      'http://localhost:3000/api',
      queryClient,
    );
    const registerFactory = createRegisterMutationInjectionFactory(
      http,
      'http://localhost:3000/api',
      queryClient,
    );
    const logoutFactory = createLogoutMutationInjectionFactory(
      http,
      'http://localhost:3000/api',
      queryClient,
    );
    const verifyFactory = createVerifyEmailMutationInjectionFactory(
      http,
      'http://localhost:3000/api',
      queryClient,
    );
    const resendFactory = createResendVerificationMutationInjectionFactory(
      http,
      'http://localhost:3000/api',
    );
    const refreshFactory = createRefreshTokenMutationInjectionFactory(
      http,
      'http://localhost:3000/api',
      queryClient,
    );

    expect(typeof queryFactory().queryFn).toBe('function');
    expect(typeof loginFactory().mutationFn).toBe('function');
    expect(typeof registerFactory().mutationFn).toBe('function');
    expect(typeof logoutFactory().mutationFn).toBe('function');
    expect(typeof verifyFactory().mutationFn).toBe('function');
    expect(typeof resendFactory().mutationFn).toBe('function');
    expect(typeof refreshFactory().mutationFn).toBe('function');
  });
});
