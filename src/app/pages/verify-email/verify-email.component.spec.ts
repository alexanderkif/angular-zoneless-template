import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { SessionService } from '../../core/auth/session.service';
import { AuthService } from '../../services/auth.service';
import { VerifyEmailComponent } from './verify-email.component';

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
  provider: 'local',
  emailVerified: true,
  role: 'user' as const,
};

describe('VerifyEmailComponent', () => {
  let component: VerifyEmailComponent;
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let authServiceMock: any;
  let sessionMock: any;
  let routerMock: any;
  let activatedRouteMock: any;

  beforeEach(async () => {
    authServiceMock = {
      cancelRegistration: vi.fn(),
    };
    sessionMock = {
      verifyEmail: vi.fn(async () => ({ message: 'Verified!', user: mockUser })),
      resendVerification: vi.fn(async () => ({ message: 'resent' })),
    };
    routerMock = {
      navigate: vi.fn(),
    };
    activatedRouteMock = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue('valid-token'),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: SessionService, useValue: sessionMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle missing token', async () => {
    activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(null);

    await component.ngOnInit();

    expect(component.status()).toBe('error');
    expect(component.message()).toBe('Invalid verification link');
  });

  it('should verify token and navigate on success', async () => {
    vi.useFakeTimers();
    sessionMock.verifyEmail.mockResolvedValueOnce({ message: 'Verified!', user: mockUser });

    await component.ngOnInit();

    expect(sessionMock.verifyEmail).toHaveBeenCalledWith('valid-token');
    expect(component.status()).toBe('success');
    expect(component.message()).toBe('Verified!');

    vi.advanceTimersByTime(2000);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should set error on verification failure', async () => {
    sessionMock.verifyEmail.mockRejectedValueOnce(new Error('verify failed'));

    await component.ngOnInit();

    expect(component.status()).toBe('error');
    expect(component.message()).toBe('verify failed');
  });

  it('should use default verification success message when response message is empty', async () => {
    sessionMock.verifyEmail.mockResolvedValueOnce({ message: '', user: mockUser });

    await component.ngOnInit();

    expect(component.status()).toBe('success');
    expect(component.message()).toBe('Email verified successfully!');
  });

  it('should use default verification error message when error has no message', async () => {
    sessionMock.verifyEmail.mockRejectedValueOnce({});

    await component.ngOnInit();

    expect(component.status()).toBe('error');
    expect(component.message()).toBe('Failed to verify email');
  });

  it('should resend verification with token', async () => {
    await component.resendVerification();

    expect(sessionMock.resendVerification).toHaveBeenCalledWith({ token: 'valid-token' });
    expect(component.status()).toBe('error');
    expect(component.message()).toBe('resent');
  });

  it('should handle resend error', async () => {
    sessionMock.resendVerification.mockRejectedValueOnce(new Error('resend failed'));

    await component.resendVerification();

    expect(component.message()).toBe('resend failed');
  });

  it('should use default resend error message when missing', async () => {
    sessionMock.resendVerification.mockRejectedValueOnce({});

    await component.resendVerification();

    expect(component.message()).toBe('Failed to resend verification link');
  });

  it('should skip resend when token is missing', async () => {
    activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(null);

    await component.resendVerification();

    expect(sessionMock.resendVerification).not.toHaveBeenCalled();
  });

  it('should cancel registration and navigate on success', () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

    authServiceMock.cancelRegistration.mockReturnValue({
      subscribe: ({ next }: any) => next({ message: 'cancelled' }),
    });

    component.cancelRegistration();

    expect(authServiceMock.cancelRegistration).toHaveBeenCalledWith('valid-token');
    expect(component.status()).toBe('error');
    expect(component.message()).toBe('cancelled');

    vi.advanceTimersByTime(2000);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/register']);
  });

  it('should handle cancel registration error', () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

    authServiceMock.cancelRegistration.mockReturnValue({
      subscribe: ({ error }: any) => error(new Error('cancel failed')),
    });

    component.cancelRegistration();

    expect(component.status()).toBe('error');
    expect(component.message()).toBe('cancel failed');
  });

  it('should use default cancel error message when missing', () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

    authServiceMock.cancelRegistration.mockReturnValue({
      subscribe: ({ error }: any) => error({}),
    });

    component.cancelRegistration();

    expect(component.status()).toBe('error');
    expect(component.message()).toBe('Failed to cancel registration');
  });

  it('should not cancel registration when token is missing', () => {
    activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(null);
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

    component.cancelRegistration();

    expect(authServiceMock.cancelRegistration).not.toHaveBeenCalled();
  });

  it('should not cancel registration when user declines confirmation', () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

    component.cancelRegistration();

    expect(authServiceMock.cancelRegistration).not.toHaveBeenCalled();
  });
});
