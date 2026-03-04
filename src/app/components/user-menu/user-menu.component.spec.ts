import { provideZonelessChangeDetection } from '@angular/core';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { AuthQueryService } from '../../services/auth-query.service';
import { UiStore } from '../../store/ui/ui.store';
import { UserMenuComponent } from './user-menu.component';

describe('UserMenuComponent', () => {
  let component: UserMenuComponent;
  let fixture: ComponentFixture<UserMenuComponent>;
  let router: { navigate: ReturnType<typeof vi.fn>; url: string };
  let mockAuthQueryService: any;
  let mockUiStore: any;
  let mockLogoutMutate: ReturnType<typeof vi.fn>;
  let queryClient: QueryClient;
  const currentUserQueryKey = ['auth', 'currentUser'] as const;

  beforeEach(async () => {
    router = { navigate: vi.fn(), url: '/current-url' };
    mockLogoutMutate = vi.fn();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    queryClient.setQueryData(currentUserQueryKey, {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      avatarUrl: 'avatar.png',
      provider: 'email',
      emailVerified: true,
      role: 'user',
    });

    mockAuthQueryService = {
      currentUserQueryOptions: vi.fn(() => ({
        queryKey: currentUserQueryKey,
        queryFn: async () =>
          queryClient.getQueryData(currentUserQueryKey) ?? {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            avatarUrl: 'avatar.png',
            provider: 'email',
            emailVerified: true,
            role: 'user',
          },
      })),
      logoutMutation: vi.fn(() => ({
        mutate: mockLogoutMutate,
        isPending: vi.fn(() => false),
        error: vi.fn(() => null),
        isError: vi.fn(() => false),
      })),
    };

    mockUiStore = {
      isUserMenuOpen: signal(false),
      toggleUserMenu: vi.fn(() => {
        const current = mockUiStore.isUserMenuOpen();
        mockUiStore.isUserMenuOpen.set(!current);
      }),
      closeUserMenu: vi.fn(() => {
        mockUiStore.isUserMenuOpen.set(false);
      }),
    };

    await TestBed.configureTestingModule({
      imports: [UserMenuComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideTanStackQuery(queryClient),
        { provide: Router, useValue: router },
        { provide: AuthQueryService, useValue: mockAuthQueryService },
        { provide: UiStore, useValue: mockUiStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle the menu visibility when toggleMenu is called', () => {
    const mockEvent = new Event('click');
    vi.spyOn(mockEvent, 'stopPropagation');

    expect(component.showMenu()).toBe(false);

    component.toggleMenu(mockEvent);
    expect(mockUiStore.toggleUserMenu).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should navigate to login when login is clicked', () => {
    component.handleAction('login');

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/current-url' },
    });
    expect(mockUiStore.closeUserMenu).toHaveBeenCalled();
  });

  it('should navigate to settings when settings is clicked', () => {
    component.handleAction('settings');

    expect(router.navigate).toHaveBeenCalledWith(['/settings']);
    expect(mockUiStore.closeUserMenu).toHaveBeenCalled();
  });

  it('should call logout mutation and keep user on public routes on exit', () => {
    component.handleAction('exit');

    // Verify logout mutation was called
    expect(mockLogoutMutate).toHaveBeenCalled();

    // Get the onSettled callback and call it to simulate completion
    const mutateCall = mockLogoutMutate.mock.calls[0];
    const options = mutateCall[1];
    expect(options).toBeDefined();
    expect(options.onSettled).toBeDefined();

    // Simulate logout completion
    options.onSettled();

    // Verify no forced redirect on public route
    expect(router.navigate).not.toHaveBeenCalledWith(['/']);
    expect(mockUiStore.closeUserMenu).toHaveBeenCalled();
  });

  it('should redirect to login from protected route on exit', () => {
    router.url = '/posts/123';

    component.handleAction('exit');

    const mutateCall = mockLogoutMutate.mock.calls[0];
    const options = mutateCall[1];
    options.onSettled();

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/posts/123' },
    });
  });

  it('should close the menu when closeMenu is called', () => {
    mockUiStore.isUserMenuOpen.set(true);

    component.closeMenu();

    expect(mockUiStore.closeUserMenu).toHaveBeenCalled();
  });

  it('should return guest defaults when user data is missing', () => {
    queryClient.setQueryData(currentUserQueryKey, null);

    const localFixture = TestBed.createComponent(UserMenuComponent);
    const localComponent = localFixture.componentInstance;

    expect(localComponent.userName()).toBe('Guest');
    expect(localComponent.userAvatar()).toBeNull();
    expect(localComponent.userRole()).toBe('user');
  });

  it('should ignore unknown actions', () => {
    component.handleAction('unknown-action');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
