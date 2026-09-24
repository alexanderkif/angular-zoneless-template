import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { SessionService } from '../../core/auth/session.service';
import { AuthOauthService } from '../../services/auth-oauth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let routerMock: any;
  let activatedRouteStub: any;
  let authOauthServiceMock: any;
  let sessionMock: any;

  beforeEach(async () => {
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

    sessionMock = {
      currentUser: {
        value: signal(null),
        isLoading: vi.fn(() => false),
        status: vi.fn(() => 'resolved'),
        error: vi.fn(() => null),
      },
      login: vi.fn(async () => ({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        provider: 'local',
        emailVerified: true,
        role: 'user',
      })),
      resendVerification: vi.fn(async () => ({ message: 'Email sent' })),
      loginState: { isPending: signal(false), error: signal<Error | null>(null) },
      resendState: { isPending: signal(false), error: signal<Error | null>(null) },
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: AuthOauthService, useValue: authOauthServiceMock },
        { provide: SessionService, useValue: sessionMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call session.login on valid submit', async () => {
    component.loginModel.set({
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
    });

    await component.onSubmit({ preventDefault: () => {} } as Event);

    expect(sessionMock.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
    });
  });

  it('should navigate to returnUrl after successful login', async () => {
    activatedRouteStub.snapshot.queryParams = { returnUrl: '/protected' };

    component.loginModel.set({
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
    });

    await component.onSubmit({ preventDefault: () => {} } as Event);

    expect(sessionMock.login).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/protected']);
  });

  it('should navigate to root if returnUrl is missing', async () => {
    activatedRouteStub.snapshot.queryParams = {};

    component.loginModel.set({
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
    });

    await component.onSubmit({ preventDefault: () => {} } as Event);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should not call session.login on invalid submit', async () => {
    component.loginModel.set({ email: 'invalid-email', password: '', rememberMe: true });

    await component.onSubmit({ preventDefault: () => {} } as Event);

    expect(sessionMock.login).not.toHaveBeenCalled();
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

  it('should set resend message on successful resend', async () => {
    component.loginModel.set({ email: 'test@example.com', password: '', rememberMe: true });

    await component.resendVerification();

    expect(sessionMock.resendVerification).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(component.resendMessage()).toBe('Email sent');
  });

  it('should set error message when resend fails', async () => {
    sessionMock.resendVerification.mockRejectedValueOnce(new Error('Failed'));

    component.loginModel.set({ email: 'test@example.com', password: '', rememberMe: true });

    await component.resendVerification();

    expect(component.resendMessage()).toBe('Failed');
  });

  it('should use default resend error message when error has no message', async () => {
    sessionMock.resendVerification.mockRejectedValueOnce({});

    component.loginModel.set({ email: 'test@example.com', password: '', rememberMe: true });

    await component.resendVerification();

    expect(component.resendMessage()).toBe('Failed to resend verification email');
  });

  it('should not call resendVerification if email is empty', async () => {
    component.loginModel.set({ email: '', password: '', rememberMe: true });

    await component.resendVerification();

    expect(sessionMock.resendVerification).not.toHaveBeenCalled();
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
