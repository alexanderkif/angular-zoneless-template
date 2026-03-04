import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { Subject } from 'rxjs';
import { AuthOauthService } from '../../services/auth-oauth.service';
import { AuthQueryService } from '../../services/auth-query.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let routerMock: any;
  let activatedRouteStub: any;
  let authOauthServiceMock: any;
  let queryClient: QueryClient;
  let loginMutateFn: ReturnType<typeof vi.fn>;
  let resendMutateFn: ReturnType<typeof vi.fn>;
  let refetchUserFn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    loginMutateFn = vi.fn();
    resendMutateFn = vi.fn();
    refetchUserFn = vi.fn(async () => undefined);
    const authQueryServiceMock = {
      currentUserQueryOptions: () => ({
        queryKey: ['auth', 'currentUser'],
        queryFn: async () => null,
      }),
      loginMutation: () => ({
        mutate: loginMutateFn,
        isPending: vi.fn(() => false),
        error: vi.fn(() => null),
        data: vi.fn(() => null),
        isError: vi.fn(() => false),
        isSuccess: vi.fn(() => false),
      }),
      resendVerificationMutation: () => ({
        mutate: resendMutateFn,
        isPending: vi.fn(() => false),
        error: vi.fn(() => null),
        data: vi.fn(() => null),
        isError: vi.fn(() => false),
        isSuccess: vi.fn(() => false),
      }),
      refetchUser: refetchUserFn,
    };

    routerMock = {
      navigate: vi.fn(),
      events: new Subject(),
      createUrlTree: vi.fn(),
      serializeUrl: vi.fn(() => ''),
    };

    activatedRouteStub = {
      snapshot: {
        queryParams: {},
      },
    };

    authOauthServiceMock = {
      loginWithGithub: vi.fn(),
      loginWithGoogle: vi.fn(),
    };

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTanStackQuery(queryClient),
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: AuthOauthService, useValue: authOauthServiceMock },
        { provide: AuthQueryService, useValue: authQueryServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call loginMutation on valid submit', () => {
    component.loginModel.set({
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
    });

    component.onSubmit({ preventDefault: () => {} } as any);

    expect(loginMutateFn).toHaveBeenCalledWith(
      {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      },
      expect.any(Object),
    );

    const options = loginMutateFn.mock.calls[0][1] as { onSuccess?: () => Promise<void> };
    expect(options.onSuccess).toBeDefined();
  });

  it('should navigate to returnUrl in login success callback', async () => {
    vi.useFakeTimers();
    activatedRouteStub.snapshot.queryParams = { returnUrl: '/protected' };

    component.loginModel.set({
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
    });

    component.onSubmit({ preventDefault: () => {} } as any);

    const options = loginMutateFn.mock.calls[0][1] as { onSuccess?: () => Promise<void> };
    const callbackPromise = options.onSuccess?.();
    await Promise.resolve();
    vi.advanceTimersByTime(100);
    await callbackPromise;

    expect(refetchUserFn).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/protected']);
    vi.useRealTimers();
  });

  it('should navigate to root if returnUrl is missing', async () => {
    vi.useFakeTimers();
    activatedRouteStub.snapshot.queryParams = {};

    component.loginModel.set({
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
    });

    component.onSubmit({ preventDefault: () => {} } as any);

    const options = loginMutateFn.mock.calls[0][1] as { onSuccess?: () => Promise<void> };
    const callbackPromise = options.onSuccess?.();
    await Promise.resolve();
    vi.advanceTimersByTime(100);
    await callbackPromise;

    expect(refetchUserFn).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    vi.useRealTimers();
  });

  it('should not call loginMutation on invalid submit', () => {
    component.loginModel.set({ email: 'invalid-email', password: '', rememberMe: true });

    component.onSubmit({ preventDefault: () => {} } as any);

    expect(loginMutateFn).not.toHaveBeenCalled();
  });

  it('should delegate social login to AuthOauthService with returnUrl', () => {
    activatedRouteStub.snapshot.queryParams = { returnUrl: '/oauth-return' };

    component.loginWithGithub();
    expect(authOauthServiceMock.loginWithGithub).toHaveBeenCalledWith('/oauth-return');

    component.loginWithGoogle();
    expect(authOauthServiceMock.loginWithGoogle).toHaveBeenCalledWith('/oauth-return');
  });

  it('should pass undefined returnUrl when query param is missing', () => {
    activatedRouteStub.snapshot.queryParams = {};

    component.loginWithGithub();
    component.loginWithGoogle();

    expect(authOauthServiceMock.loginWithGithub).toHaveBeenCalledWith(undefined);
    expect(authOauthServiceMock.loginWithGoogle).toHaveBeenCalledWith(undefined);
  });

  it('should call resendMutation on resend verification', () => {
    component.loginModel.set({ email: 'test@example.com', password: '', rememberMe: true });

    component.resendVerification();

    expect(resendMutateFn).toHaveBeenCalledWith({ email: 'test@example.com' }, expect.any(Object));

    const options = resendMutateFn.mock.calls[0][1] as {
      onSuccess?: (response: { message: string }) => void;
      onError?: (error: Error) => void;
    };

    options.onSuccess?.({ message: 'Email sent' });
    expect(component.resendMessage()).toBe('Email sent');

    options.onError?.(new Error('Failed'));
    expect(component.resendMessage()).toBe('Failed');
  });

  it('should use default resend error message when error has no message', () => {
    component.loginModel.set({ email: 'test@example.com', password: '', rememberMe: true });
    component.resendVerification();

    const options = resendMutateFn.mock.calls[0][1] as {
      onError?: (error: { message?: string }) => void;
    };
    options.onError?.({});

    expect(component.resendMessage()).toBe('Failed to resend verification email');
  });

  it('should not call resendMutation if email is empty', () => {
    component.loginModel.set({ email: '', password: '', rememberMe: true });
    component.resendVerification();
    expect(resendMutateFn).not.toHaveBeenCalled();
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(false);
  });

  it('should toggle remember me checkbox', () => {
    expect(component.loginModel().rememberMe).toBe(true);
    component.toggleRememberMe();
    expect(component.loginModel().rememberMe).toBe(false);
    component.toggleRememberMe();
    expect(component.loginModel().rememberMe).toBe(true);
  });
});
