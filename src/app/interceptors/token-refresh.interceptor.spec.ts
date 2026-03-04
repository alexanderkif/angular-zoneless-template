import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { tokenRefreshInterceptor } from './token-refresh.interceptor';

describe('tokenRefreshInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let queryClient: QueryClient;

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
        provideHttpClient(withInterceptors([tokenRefreshInterceptor])),
        provideHttpClientTesting(),
        provideTanStackQuery(queryClient),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should pass through successful requests', () => {
    httpClient.get('/test').subscribe();

    const req = httpMock.expectOne('/test');
    req.flush({});
  });

  it('should refresh token on 401', async () => {
    const user = { id: '1', email: 'test@example.com', name: 'Test', provider: true, role: 'user' };

    httpClient.get('/test').subscribe();

    const req = httpMock.expectOne('/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // Should attempt to refresh (full URL in dev mode)
    const refreshReq = httpMock.expectOne('http://localhost:3000/api/auth/refresh');
    refreshReq.flush({ user });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should retry original request
    const retryReq = httpMock.expectOne('/test');
    retryReq.flush({});
  });

  it('should not refresh on 401 for auth endpoints', () => {
    httpClient.post('/auth/login', {}).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne('/auth/login');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // Should not attempt refresh for auth endpoints - verify no refresh request was made
  });

  it('should not refresh on 401 for logout endpoint', () => {
    httpClient.post('/auth/logout', {}).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne('/auth/logout');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    httpMock.expectNone('http://localhost:3000/api/auth/refresh');
  });

  it('should handle refresh failure', async () => {
    const errorPromise = new Promise((resolve) => {
      httpClient.get('/test').subscribe({
        error: () => {
          // Should clear cache on failure
          expect(queryClient.getQueryData(['auth', 'currentUser'])).toBeNull();
          resolve(true);
        },
      });
    });

    const req = httpMock.expectOne('/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // Mock failed refresh (full URL in dev mode)
    const refreshReq = httpMock.expectOne('http://localhost:3000/api/auth/refresh');
    refreshReq.flush('Refresh failed', { status: 401, statusText: 'Unauthorized' });

    await errorPromise;
  });

  it('should deduplicate refresh for concurrent 401 responses', async () => {
    httpClient.get('/test-a').subscribe();
    httpClient.get('/test-b').subscribe();

    const reqA = httpMock.expectOne('/test-a');
    const reqB = httpMock.expectOne('/test-b');

    reqA.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    reqB.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    const refreshReq = httpMock.expectOne('http://localhost:3000/api/auth/refresh');
    refreshReq.flush({ user: { id: '1' } });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const retryA = httpMock.expectOne('/test-a');
    const retryB = httpMock.expectOne('/test-b');

    retryA.flush({ ok: true });
    retryB.flush({ ok: true });
  });

  it('should clear cache on refresh failure', async () => {
    // Set initial user data
    queryClient.setQueryData(['auth', 'currentUser'], { id: '1', email: 'test@example.com' });

    const errorPromise = new Promise((resolve) => {
      httpClient.get('/test').subscribe({
        error: () => {
          // Cache should be cleared
          expect(queryClient.getQueryData(['auth', 'currentUser'])).toBeNull();
          resolve(true);
        },
      });
    });

    const req = httpMock.expectOne('/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // Mock failed refresh (full URL in dev mode)
    const refreshReq = httpMock.expectOne('http://localhost:3000/api/auth/refresh');
    refreshReq.flush('Session expired', { status: 401, statusText: 'Unauthorized' });

    await errorPromise;
  });
});
