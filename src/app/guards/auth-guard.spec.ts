import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { SessionService, type AuthUser } from '../core/auth/session.service';
import { authGuard } from './auth-guard';

type SessionMock = {
  ensureUser: ReturnType<typeof vi.fn>;
  refreshSession: ReturnType<typeof vi.fn>;
};

const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
  provider: 'local',
  emailVerified: true,
  role: 'user',
  ...overrides,
});

const createSession = (overrides: Partial<SessionMock> = {}): SessionMock => ({
  ensureUser: vi.fn(async () => null),
  refreshSession: vi.fn(async () => null),
  ...overrides,
});

describe('authGuard', () => {
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { createUrlTree: vi.fn() };
  });

  afterEach(() => {
    delete (globalThis as any).requestStorage;
  });

  const setup = (platform: string, session: SessionMock): void => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: router },
        { provide: PLATFORM_ID, useValue: platform },
        { provide: SessionService, useValue: session },
      ],
    });
  };

  const runGuard = (url = '/protected'): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(() => authGuard({} as any, { url } as any));

  it('allows access when the session already has a user', async () => {
    const session = createSession({ ensureUser: vi.fn(async () => makeUser()) });
    setup('browser', session);

    const result = await runGuard();

    expect(result).toBe(true);
    expect(session.ensureUser).toHaveBeenCalledTimes(1);
    expect(session.refreshSession).not.toHaveBeenCalled();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to login when there is no user and the refresh fails', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);
    const session = createSession({
      ensureUser: vi.fn(async () => null),
      refreshSession: vi.fn(async () => {
        throw new Error('refresh failed');
      }),
    });
    setup('browser', session);

    const result = await runGuard();

    expect(result).toBe(urlTree);
    expect(session.refreshSession).toHaveBeenCalledTimes(1);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/protected' },
    });
  });

  it('allows access when a silent refresh yields a user', async () => {
    const session = createSession({
      ensureUser: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(makeUser()),
      refreshSession: vi.fn(async () => makeUser()),
    });
    setup('browser', session);

    const result = await runGuard();

    expect(result).toBe(true);
    expect(session.refreshSession).toHaveBeenCalledTimes(1);
    expect(session.ensureUser).toHaveBeenCalledTimes(2);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects when the refresh succeeds but still returns no user', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);
    const session = createSession({
      ensureUser: vi.fn(async () => null),
      refreshSession: vi.fn(async () => null),
    });
    setup('browser', session);

    const result = await runGuard();

    expect(result).toBe(urlTree);
    expect(session.refreshSession).toHaveBeenCalledTimes(1);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/protected' },
    });
  });

  it('redirects to login when loading the user throws', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);
    const session = createSession({
      ensureUser: vi.fn(async () => {
        throw new Error('network error');
      }),
    });
    setup('browser', session);

    const result = await runGuard();

    expect(result).toBe(urlTree);
    expect(session.refreshSession).not.toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/protected' },
    });
  });

  it('ignores the SSR cookie fast-path on the browser platform', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);
    (globalThis as any).requestStorage = {
      getStore: () => ({ headers: { cookie: 'refresh_token=token123' } }),
    };
    const session = createSession({
      ensureUser: vi.fn(async () => null),
      refreshSession: vi.fn(async () => {
        throw new Error('refresh failed');
      }),
    });
    setup('browser', session);

    const result = await runGuard();

    expect(result).toBe(urlTree);
    expect(session.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('allows a server request when the refresh_token cookie is present', async () => {
    (globalThis as any).requestStorage = {
      getStore: () => ({ headers: { cookie: 'foo=bar; refresh_token=token123' } }),
    };
    const session = createSession({ ensureUser: vi.fn(async () => null) });
    setup('server', session);

    const result = await runGuard();

    expect(result).toBe(true);
    expect(session.refreshSession).not.toHaveBeenCalled();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('allows a server request when the cookie header is an array', async () => {
    (globalThis as any).requestStorage = {
      getStore: () => ({ headers: { cookie: ['foo=bar', 'refresh_token=token123'] } }),
    };
    const session = createSession({ ensureUser: vi.fn(async () => null) });
    setup('server', session);

    const result = await runGuard();

    expect(result).toBe(true);
    expect(session.refreshSession).not.toHaveBeenCalled();
  });

  it('falls back to refresh when a server cookie lacks refresh_token', async () => {
    (globalThis as any).requestStorage = {
      getStore: () => ({ headers: { cookie: 'foo=bar' } }),
    };
    const session = createSession({
      ensureUser: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(makeUser()),
      refreshSession: vi.fn(async () => makeUser()),
    });
    setup('server', session);

    const result = await runGuard();

    expect(result).toBe(true);
    expect(session.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('falls back to refresh when no cookie header exists on the server', async () => {
    (globalThis as any).requestStorage = { getStore: () => ({ headers: {} }) };
    const session = createSession({
      ensureUser: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(makeUser()),
      refreshSession: vi.fn(async () => makeUser()),
    });
    setup('server', session);

    const result = await runGuard();

    expect(result).toBe(true);
    expect(session.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('falls back to refresh when no request storage is available on the server', async () => {
    delete (globalThis as any).requestStorage;
    const session = createSession({
      ensureUser: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(makeUser()),
      refreshSession: vi.fn(async () => makeUser()),
    });
    setup('server', session);

    const result = await runGuard();

    expect(result).toBe(true);
    expect(session.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('continues the normal flow when requestStorage access throws', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);
    (globalThis as any).requestStorage = {
      getStore: () => {
        throw new Error('storage failed');
      },
    };
    const session = createSession({
      ensureUser: vi.fn(async () => null),
      refreshSession: vi.fn(async () => {
        throw new Error('refresh failed');
      }),
    });
    setup('server', session);

    const result = await runGuard();

    expect(result).toBe(urlTree);
    expect(session.refreshSession).toHaveBeenCalledTimes(1);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/protected' },
    });
  });
});
