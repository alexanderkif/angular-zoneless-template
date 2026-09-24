import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SessionService } from '../core/auth/session.service';
import { tokenRefreshInterceptor } from './token-refresh.interceptor';

describe('tokenRefreshInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let session: { refreshSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    session = { refreshSession: vi.fn(async () => ({ id: '1' })) };
  });

  afterEach(() => {
    httpMock.verify();
  });

  const setup = (platform = 'browser'): void => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([tokenRefreshInterceptor])),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: SessionService, useValue: session },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  };

  it('passes successful requests through without refreshing', () => {
    setup();

    httpClient.get('/test').subscribe();

    const req = httpMock.expectOne('/test');
    req.flush({ ok: true });

    expect(session.refreshSession).not.toHaveBeenCalled();
  });

  it('refreshes the session on a 401 and retries with X-Skip-Refresh', async () => {
    setup();

    let received: unknown;
    httpClient.get('/test').subscribe((value) => {
      received = value;
    });

    const req = httpMock.expectOne('/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(session.refreshSession).toHaveBeenCalledTimes(1);

    const retryReq = httpMock.expectOne('/test');
    expect(retryReq.request.headers.get('X-Skip-Refresh')).toBe('1');
    retryReq.flush({ ok: true });

    expect(received).toEqual({ ok: true });
  });

  it.each(['/auth/login', '/auth/register', '/auth/logout', '/auth/refresh'])(
    'does not refresh on a 401 from %s',
    (url) => {
      setup();

      httpClient.post(url, {}).subscribe({ error: () => undefined });

      const req = httpMock.expectOne(url);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(session.refreshSession).not.toHaveBeenCalled();
    },
  );

  it('does not refresh on non-401 errors', () => {
    setup();

    httpClient.get('/test').subscribe({ error: () => undefined });

    const req = httpMock.expectOne('/test');
    req.flush('Server error', { status: 500, statusText: 'Server Error' });

    expect(session.refreshSession).not.toHaveBeenCalled();
  });

  it('does not refresh when X-Skip-Refresh is already present', () => {
    setup();

    httpClient.get('/test', { headers: { 'X-Skip-Refresh': '1' } }).subscribe({
      error: () => undefined,
    });

    const req = httpMock.expectOne('/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(session.refreshSession).not.toHaveBeenCalled();
  });

  it('does not refresh on the server platform', () => {
    setup('server');

    httpClient.get('/test').subscribe({ error: () => undefined });

    const req = httpMock.expectOne('/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(session.refreshSession).not.toHaveBeenCalled();
  });

  it('propagates the error when the refresh fails', async () => {
    session.refreshSession.mockRejectedValueOnce(new Error('refresh failed'));
    setup();

    let caught: unknown;
    const done = new Promise<void>((resolve) => {
      httpClient.get('/test').subscribe({
        error: (error: unknown) => {
          caught = error;
          resolve();
        },
      });
    });

    const req = httpMock.expectOne('/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    await done;

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe('refresh failed');
    expect(session.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('retries concurrent 401 responses after a refresh', async () => {
    setup();

    const received: unknown[] = [];
    httpClient.get('/test-a').subscribe((value) => received.push(value));
    httpClient.get('/test-b').subscribe((value) => received.push(value));

    const reqA = httpMock.expectOne('/test-a');
    const reqB = httpMock.expectOne('/test-b');
    reqA.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    reqB.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(session.refreshSession).toHaveBeenCalledTimes(2);

    const retryA = httpMock.expectOne('/test-a');
    const retryB = httpMock.expectOne('/test-b');
    retryA.flush({ ok: 'a' });
    retryB.flush({ ok: 'b' });

    expect(received).toEqual(expect.arrayContaining([{ ok: 'a' }, { ok: 'b' }]));
  });

  it('does not retry twice when the retried request also fails with 401', async () => {
    setup();

    httpClient.get('/test').subscribe({ error: () => undefined });

    const req = httpMock.expectOne('/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const retryReq = httpMock.expectOne('/test');
    expect(retryReq.request.headers.get('X-Skip-Refresh')).toBe('1');
    retryReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(session.refreshSession).toHaveBeenCalledTimes(1);
    httpMock.expectNone('/test');
  });
});
