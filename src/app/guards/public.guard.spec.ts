import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { SessionService, type AuthUser } from '../core/auth/session.service';
import { publicGuard } from './public.guard';

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

describe('publicGuard', () => {
  let router: {
    createUrlTree: ReturnType<typeof vi.fn>;
    parseUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    router = {
      createUrlTree: vi.fn(),
      parseUrl: vi.fn(),
    };
  });

  const setup = (session: SessionMock): void => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: router },
        { provide: SessionService, useValue: session },
      ],
    });
  };

  const runGuard = (route: { queryParams?: Record<string, unknown> } = {}): Promise<
    boolean | UrlTree
  > => TestBed.runInInjectionContext(() => publicGuard(route as any, {} as any));

  it('allows access when there is no authenticated user', async () => {
    const session = createSession({ ensureUser: vi.fn(async () => null) });
    setup(session);

    const result = await runGuard({ queryParams: {} });

    expect(result).toBe(true);
    expect(session.ensureUser).toHaveBeenCalledTimes(1);
    expect(router.createUrlTree).not.toHaveBeenCalled();
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('redirects to home when authenticated', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);
    const session = createSession({ ensureUser: vi.fn(async () => makeUser()) });
    setup(session);

    const result = await runGuard({ queryParams: {} });

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('redirects to returnUrl when authenticated and it is a safe path', async () => {
    const urlTree = {} as UrlTree;
    router.parseUrl.mockReturnValue(urlTree);
    const session = createSession({ ensureUser: vi.fn(async () => makeUser()) });
    setup(session);

    const result = await runGuard({ queryParams: { returnUrl: '/posts' } });

    expect(result).toBe(urlTree);
    expect(router.parseUrl).toHaveBeenCalledWith('/posts');
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('falls back to home when returnUrl is not an internal path', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);
    const session = createSession({ ensureUser: vi.fn(async () => makeUser()) });
    setup(session);

    const result = await runGuard({ queryParams: { returnUrl: 'https://evil.example' } });

    expect(result).toBe(urlTree);
    expect(router.parseUrl).not.toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('falls back to home when returnUrl is not a string', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);
    const session = createSession({ ensureUser: vi.fn(async () => makeUser()) });
    setup(session);

    const result = await runGuard({ queryParams: { returnUrl: ['/posts'] } });

    expect(result).toBe(urlTree);
    expect(router.parseUrl).not.toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('redirects to home when the route has no queryParams', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);
    const session = createSession({ ensureUser: vi.fn(async () => makeUser()) });
    setup(session);

    const result = await runGuard();

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('allows access when loading the user throws', async () => {
    const session = createSession({
      ensureUser: vi.fn(async () => {
        throw new Error('query failed');
      }),
    });
    setup(session);

    const result = await runGuard({ queryParams: {} });

    expect(result).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });
});
