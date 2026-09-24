import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { ThemeService } from '../../core/theme/theme.service';
import { UserMenuComponent } from './user-menu.component';

type MockUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: string;
  emailVerified: boolean;
  role: 'user' | 'admin';
};

const defaultUser: MockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  avatarUrl: 'avatar.png',
  provider: 'email',
  emailVerified: true,
  role: 'user',
};

const createSessionMock = (user: MockUser | null = defaultUser) => {
  const currentUserValue = signal<MockUser | null>(user);
  const logoutPending = signal(false);
  const logoutError = signal<Error | null>(null);

  return {
    currentUser: {
      value: currentUserValue,
      isLoading: signal(false),
      status: signal('resolved'),
      error: signal<Error | null>(null),
      reload: vi.fn(),
    },
    ensureUser: vi.fn(async () => currentUserValue()),
    reloadCurrentUser: vi.fn(),
    refreshSession: vi.fn(async () => currentUserValue()),
    logoutState: { isPending: logoutPending, error: logoutError },
    logout: vi.fn(async () => {
      currentUserValue.set(null);
    }),
  };
};

const createThemeMock = () => ({
  preference: signal<'light' | 'dark' | 'system'>('system'),
  resolved: signal<'light' | 'dark'>('light'),
  setPreference: vi.fn(),
  toggle: vi.fn(),
});

describe('UserMenuComponent', () => {
  let component: UserMenuComponent;
  let fixture: ComponentFixture<UserMenuComponent>;
  let router: { navigate: ReturnType<typeof vi.fn>; url: string };
  let sessionMock: ReturnType<typeof createSessionMock>;
  let themeMock: ReturnType<typeof createThemeMock>;

  beforeEach(async () => {
    router = { navigate: vi.fn(), url: '/current-url' };
    sessionMock = createSessionMock();
    themeMock = createThemeMock();

    await TestBed.configureTestingModule({
      imports: [UserMenuComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: router },
        { provide: SessionService, useValue: sessionMock },
        { provide: ThemeService, useValue: themeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the current user name, avatar and role', () => {
    expect(component.userName()).toBe('Test User');
    expect(component.userAvatar()).toBe('avatar.png');
    expect(component.userRole()).toBe('user');
  });

  it('should toggle the menu visibility when toggleMenu is called', () => {
    const mockEvent = new Event('click');
    const stopPropagation = vi.spyOn(mockEvent, 'stopPropagation');

    expect(component.showMenu()).toBe(false);

    component.toggleMenu(mockEvent);
    expect(component.showMenu()).toBe(true);
    expect(stopPropagation).toHaveBeenCalled();

    component.toggleMenu(mockEvent);
    expect(component.showMenu()).toBe(false);
  });

  it('should navigate to login when login is clicked', async () => {
    component.showMenu.set(true);

    await component.handleAction('login');

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/current-url' },
    });
    expect(component.showMenu()).toBe(false);
  });

  it('should navigate to settings when settings is clicked', async () => {
    component.showMenu.set(true);

    await component.handleAction('settings');

    expect(router.navigate).toHaveBeenCalledWith(['/settings']);
    expect(component.showMenu()).toBe(false);
  });

  it('should call logout and keep user on public routes on exit', async () => {
    component.showMenu.set(true);

    await component.handleAction('exit');

    expect(sessionMock.logout).toHaveBeenCalled();
    expect(component.showMenu()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to login from protected route on exit', async () => {
    router.url = '/posts/123';

    await component.handleAction('exit');

    expect(sessionMock.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/posts/123' },
    });
  });

  it('should close the menu when closeMenu is called', () => {
    component.showMenu.set(true);

    component.closeMenu();

    expect(component.showMenu()).toBe(false);
  });

  it('should return guest defaults when user data is missing', () => {
    sessionMock.currentUser.value.set(null);

    expect(component.userName()).toBe('Guest');
    expect(component.userAvatar()).toBeNull();
    expect(component.userRole()).toBe('user');
  });

  it('should reflect logout pending state', () => {
    expect(component.isLoggingOut()).toBe(false);

    sessionMock.logoutState.isPending.set(true);

    expect(component.isLoggingOut()).toBe(true);
  });

  it('should ignore unknown actions', async () => {
    await component.handleAction('unknown-action');

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should toggle the theme from the menu', () => {
    component.toggleTheme();

    expect(themeMock.toggle).toHaveBeenCalled();
  });

  it('should reflect the resolved theme', () => {
    expect(component.isDark()).toBe(false);

    themeMock.resolved.set('dark');
    fixture.detectChanges();

    expect(component.isDark()).toBe(true);
  });
});
