import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import {
  runInInjectionContext,
  provideZonelessChangeDetection,
  EnvironmentInjector,
  PLATFORM_ID,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { AuthQueryService } from '../services/auth-query.service';
import { AuthRefreshCoordinatorService } from '../services/auth-refresh-coordinator.service';
import { authGuard } from './auth-guard';

describe('authGuard', () => {
  let router: { createUrlTree: ReturnType<typeof vi.fn> };
  let injector: EnvironmentInjector;
  let queryClient: QueryClient;
  let httpMock: HttpTestingController;
  let refreshCoordinatorMock: { refreshSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { createUrlTree: vi.fn() };
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, retryDelay: 1 },
        mutations: { retry: false },
      },
    });

    refreshCoordinatorMock = {
      refreshSession: vi.fn(async () => undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTanStackQuery(queryClient),
        { provide: Router, useValue: router },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthRefreshCoordinatorService, useValue: refreshCoordinatorMock },
      ],
    });

    injector = TestBed.inject(EnvironmentInjector);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should allow access if authenticated', async () => {
    queryClient.setQueryData(['auth', 'currentUser'], {
      id: '1',
      email: 'test@example.com',
      name: 'Test',
      provider: true,
      role: 'user',
    });

    const result = await runInInjectionContext(injector, () =>
      authGuard({} as any, { url: '/protected' } as any),
    );

    expect(result).toBe(true);
  });

  it('should redirect to login if not authenticated', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);

    const guardPromise = runInInjectionContext(injector, () =>
      authGuard({} as any, { url: '/protected' } as any),
    );

    // Initial /user/me returns 401
    const req = httpMock.expectOne('http://localhost:3000/api/user/me');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    refreshCoordinatorMock.refreshSession.mockRejectedValueOnce(new Error('refresh failed'));

    const result = await guardPromise;

    expect(result).toBe(urlTree);
    expect(refreshCoordinatorMock.refreshSession).toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/protected' },
    });
  });

  it('should redirect to login on network error', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);

    const guardPromise = runInInjectionContext(injector, () =>
      authGuard({} as any, { url: '/protected' } as any),
    );

    // Mock API returning error (full URL in dev mode)
    const req = httpMock.expectOne('http://localhost:3000/api/user/me');
    req.flush({ message: 'Network error' }, { status: 503, statusText: 'Service Unavailable' });

    // Guard has retry: 1, wait shortly for retry request
    await new Promise((resolve) => setTimeout(resolve, 5));

    const retryReq = httpMock.expectOne('http://localhost:3000/api/user/me');
    retryReq.flush(
      { message: 'Network error' },
      { status: 503, statusText: 'Service Unavailable' },
    );

    const result = await guardPromise;

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/protected' },
    });
  });

  it('should allow access when silent refresh succeeds', async () => {
    const authQueryService = TestBed.inject(AuthQueryService);
    vi.spyOn(authQueryService, 'fetchCurrentUser')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        provider: 'local',
        emailVerified: true,
        role: 'user',
      } as any);

    const guardPromise = runInInjectionContext(injector, () =>
      authGuard({} as any, { url: '/protected' } as any),
    );

    refreshCoordinatorMock.refreshSession.mockResolvedValueOnce(undefined);

    const result = await guardPromise;

    expect(result).toBe(true);
    expect(refreshCoordinatorMock.refreshSession).toHaveBeenCalled();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect when fetchCurrentUser throws 401 in guard queryFn catch', async () => {
    TestBed.resetTestingModule();

    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);

    const localClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTanStackQuery(localClient),
        { provide: Router, useValue: router },
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: AuthRefreshCoordinatorService,
          useValue: {
            refreshSession: vi.fn(async () => {
              throw new Error('refresh failed');
            }),
          },
        },
        {
          provide: AuthQueryService,
          useValue: {
            fetchCurrentUser: vi.fn(async () => {
              throw { status: 401 };
            }),
          },
        },
      ],
    }).compileComponents();

    const localInjector = TestBed.inject(EnvironmentInjector);
    const result = await runInInjectionContext(localInjector, () =>
      authGuard({} as any, { url: '/protected' } as any),
    );

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/protected' },
    });
  });

  it('should allow SSR request when refresh_token cookie exists', async () => {
    TestBed.resetTestingModule();

    const previousRequestStorage = (globalThis as any).requestStorage;
    (globalThis as any).requestStorage = {
      getStore: () => ({ headers: { cookie: 'foo=bar; refresh_token=token123' } }),
    };

    const refreshSession = vi.fn(async () => undefined);

    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTanStackQuery(
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          }),
        ),
        { provide: Router, useValue: router },
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: AuthRefreshCoordinatorService, useValue: { refreshSession } },
        {
          provide: AuthQueryService,
          useValue: {
            fetchCurrentUser: vi.fn(async () => null),
          },
        },
      ],
    }).compileComponents();

    const localInjector = TestBed.inject(EnvironmentInjector);
    const result = await runInInjectionContext(localInjector, () =>
      authGuard({} as any, { url: '/protected' } as any),
    );

    expect(result).toBe(true);
    expect(refreshSession).not.toHaveBeenCalled();

    (globalThis as any).requestStorage = previousRequestStorage;
  });

  it('should continue normal flow when SSR requestStorage access throws', async () => {
    TestBed.resetTestingModule();

    const previousRequestStorage = (globalThis as any).requestStorage;
    (globalThis as any).requestStorage = {
      getStore: () => {
        throw new Error('storage failed');
      },
    };

    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);

    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTanStackQuery(
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          }),
        ),
        { provide: Router, useValue: router },
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: AuthRefreshCoordinatorService,
          useValue: {
            refreshSession: vi.fn(async () => {
              throw new Error('refresh failed');
            }),
          },
        },
        {
          provide: AuthQueryService,
          useValue: {
            fetchCurrentUser: vi.fn(async () => null),
          },
        },
      ],
    }).compileComponents();

    const localInjector = TestBed.inject(EnvironmentInjector);
    const result = await runInInjectionContext(localInjector, () =>
      authGuard({} as any, { url: '/protected' } as any),
    );

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/protected' },
    });

    (globalThis as any).requestStorage = previousRequestStorage;
  });

  it('should allow SSR request when cookie header is an array', async () => {
    TestBed.resetTestingModule();

    const previousRequestStorage = (globalThis as any).requestStorage;
    (globalThis as any).requestStorage = {
      getStore: () => ({ headers: { cookie: ['foo=bar', 'refresh_token=token123'] } }),
    };

    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTanStackQuery(
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          }),
        ),
        { provide: Router, useValue: router },
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: AuthRefreshCoordinatorService,
          useValue: { refreshSession: vi.fn(async () => undefined) },
        },
        {
          provide: AuthQueryService,
          useValue: {
            fetchCurrentUser: vi.fn(async () => null),
          },
        },
      ],
    }).compileComponents();

    const localInjector = TestBed.inject(EnvironmentInjector);
    const result = await runInInjectionContext(localInjector, () =>
      authGuard({} as any, { url: '/protected' } as any),
    );

    expect(result).toBe(true);

    (globalThis as any).requestStorage = previousRequestStorage;
  });

  it('should redirect when refresh succeeds but no user is returned', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);

    const authQueryService = TestBed.inject(AuthQueryService);
    vi.spyOn(authQueryService, 'fetchCurrentUser').mockResolvedValue(null);
    refreshCoordinatorMock.refreshSession.mockResolvedValueOnce(undefined);

    const result = await runInInjectionContext(injector, () =>
      authGuard({} as any, { url: '/protected' } as any),
    );

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/protected' },
    });
  });
});
