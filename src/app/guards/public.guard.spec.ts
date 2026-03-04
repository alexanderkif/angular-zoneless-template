import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { AuthQueryService } from '../services/auth-query.service';
import { publicGuard } from './public.guard';

describe('publicGuard', () => {
  let routerMock: any;
  let queryClient: QueryClient;
  let authQueryServiceMock: any;

  beforeEach(() => {
    routerMock = {
      createUrlTree: vi.fn(),
      parseUrl: vi.fn(),
    };

    authQueryServiceMock = {
      fetchCurrentUser: vi.fn(async () => null),
    };

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTanStackQuery(queryClient),
        { provide: Router, useValue: routerMock },
        { provide: AuthQueryService, useValue: authQueryServiceMock },
      ],
    });
  });

  it('should allow access if not authenticated', async () => {
    queryClient.setQueryData(['auth', 'currentUser'], null);

    const result = await TestBed.runInInjectionContext(() => publicGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('should redirect to home if authenticated', async () => {
    queryClient.setQueryData(['auth', 'currentUser'], {
      id: '1',
      email: 'test@example.com',
      name: 'Test',
      provider: true,
      role: 'user',
    });

    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);

    const result = await TestBed.runInInjectionContext(() =>
      publicGuard({ queryParams: {} } as any, {} as any),
    );

    expect(result).toBe(urlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('should redirect to returnUrl if authenticated and returnUrl is present', async () => {
    queryClient.setQueryData(['auth', 'currentUser'], {
      id: '1',
      email: 'test@example.com',
      name: 'Test',
      provider: true,
      role: 'user',
    });

    const urlTree = {} as UrlTree;
    routerMock.parseUrl.mockReturnValue(urlTree);

    const result = await TestBed.runInInjectionContext(() =>
      publicGuard({ queryParams: { returnUrl: '/posts' } } as any, {} as any),
    );

    expect(result).toBe(urlTree);
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/posts');
  });

  it('should allow access when ensureQueryData throws', async () => {
    const ensureSpy = vi
      .spyOn(queryClient, 'ensureQueryData')
      .mockRejectedValueOnce(new Error('query failed'));

    const result = await TestBed.runInInjectionContext(() => publicGuard({} as any, {} as any));

    expect(result).toBe(true);
    expect(ensureSpy).toHaveBeenCalled();
  });

  it('should call fetchCurrentUser through ensureQueryData queryFn', async () => {
    const ensureSpy = vi.spyOn(queryClient, 'ensureQueryData');

    await TestBed.runInInjectionContext(() => publicGuard({} as any, {} as any));

    expect(ensureSpy).toHaveBeenCalled();
    expect(authQueryServiceMock.fetchCurrentUser).toHaveBeenCalled();
  });
});
