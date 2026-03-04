import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthQueryService } from '../../services/auth-query.service';
import { AuthService } from '../../services/auth.service';
import { VerifyEmailComponent } from './verify-email';

describe('VerifyEmailComponent', () => {
  let component: VerifyEmailComponent;
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let authServiceMock: any;
  let authQueryServiceMock: any;
  let routerMock: any;
  let activatedRouteMock: any;

  beforeEach(async () => {
    authServiceMock = {
      cancelRegistration: vi.fn(),
    };
    authQueryServiceMock = {
      verifyEmailMutation: vi.fn(() => ({ mutate: vi.fn() })),
      resendVerificationMutation: vi.fn(() => ({ mutate: vi.fn() })),
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
        { provide: AuthQueryService, useValue: authQueryServiceMock },
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

  it('should handle missing token', () => {
    activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(null);

    component.ngOnInit();

    expect(component.status()).toBe('error');
    expect(component.message()).toBe('Invalid verification link');
  });

  it('should verify token and navigate on success', () => {
    vi.useFakeTimers();
    const mutate = vi.fn((token: string, options: any) => {
      options.onSuccess({ message: 'Verified!' });
    });
    component.verifyEmailMutation = { mutate } as any;

    component.ngOnInit();

    expect(mutate).toHaveBeenCalledWith('valid-token', expect.any(Object));
    expect(component.status()).toBe('success');
    expect(component.message()).toBe('Verified!');

    vi.advanceTimersByTime(2000);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should set error on verification failure', () => {
    const mutate = vi.fn((_token: string, options: any) => {
      options.onError(new Error('verify failed'));
    });
    component.verifyEmailMutation = { mutate } as any;

    component.ngOnInit();

    expect(component.status()).toBe('error');
    expect(component.message()).toBe('verify failed');
  });

  it('should use default verification success message when response message is empty', () => {
    const mutate = vi.fn((_token: string, options: any) => {
      options.onSuccess({ message: '' });
    });
    component.verifyEmailMutation = { mutate } as any;

    component.ngOnInit();

    expect(component.status()).toBe('success');
    expect(component.message()).toBe('Email verified successfully!');
  });

  it('should use default verification error message when error has no message', () => {
    const mutate = vi.fn((_token: string, options: any) => {
      options.onError({} as any);
    });
    component.verifyEmailMutation = { mutate } as any;

    component.ngOnInit();

    expect(component.status()).toBe('error');
    expect(component.message()).toBe('Failed to verify email');
  });

  it('should resend verification with token', () => {
    const mutate = vi.fn((_payload: any, options: any) => {
      options.onSuccess({ message: 'resent' });
    });
    component.resendMutation = { mutate } as any;

    component.resendVerification();

    expect(mutate).toHaveBeenCalledWith({ token: 'valid-token' }, expect.any(Object));
    expect(component.status()).toBe('error');
    expect(component.message()).toBe('resent');
  });

  it('should handle resend error', () => {
    const mutate = vi.fn((_payload: any, options: any) => {
      options.onError(new Error('resend failed'));
    });
    component.resendMutation = { mutate } as any;

    component.resendVerification();

    expect(component.message()).toBe('resend failed');
  });

  it('should use default resend error message when missing', () => {
    const mutate = vi.fn((_payload: any, options: any) => {
      options.onError({} as any);
    });
    component.resendMutation = { mutate } as any;

    component.resendVerification();

    expect(component.message()).toBe('Failed to resend verification link');
  });

  it('should skip resend when token is missing', () => {
    activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(null);
    const mutate = vi.fn();
    component.resendMutation = { mutate } as any;

    component.resendVerification();

    expect(mutate).not.toHaveBeenCalled();
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
