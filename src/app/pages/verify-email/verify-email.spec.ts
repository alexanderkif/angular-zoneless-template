import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyEmailComponent } from './verify-email';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthService } from '../../services/auth.service';
import { of, throwError } from 'rxjs';
import { loginActions } from '../../store/auth/auth.actions';
import { provideZonelessChangeDetection } from '@angular/core';

describe('VerifyEmailComponent', () => {
  let component: VerifyEmailComponent;
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let authServiceMock: any;
  let routerMock: any;
  let storeMock: any;
  let activatedRouteMock: any;

  beforeEach(async () => {
    authServiceMock = {
      verifyEmail: vi.fn(),
      resendVerificationByToken: vi.fn(),
      cancelRegistration: vi.fn()
    };
    routerMock = {
      navigate: vi.fn()
    };
    storeMock = {
      dispatch: vi.fn()
    };
    activatedRouteMock = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue('valid-token')
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: Store, useValue: storeMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should verify email successfully', () => {
    vi.useFakeTimers();
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test' };
    authServiceMock.verifyEmail.mockReturnValue(of({ 
      message: 'Success', 
      user: mockUser 
    }));

    component.ngOnInit();

    expect(component.status()).toBe('success');
    expect(storeMock.dispatch).toHaveBeenCalledWith(loginActions.loginSuccess({ user: mockUser }));
    
    vi.advanceTimersByTime(2000);
    
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should handle missing token', () => {
    activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(null);
    
    component.ngOnInit();

    expect(component.status()).toBe('error');
    expect(component.message()).toBe('Invalid verification link');
    expect(authServiceMock.verifyEmail).not.toHaveBeenCalled();
  });

  it('should handle verification error', () => {
    authServiceMock.verifyEmail.mockReturnValue(throwError(() => ({ message: 'Invalid token' })));

    component.ngOnInit();

    expect(component.status()).toBe('error');
    expect(component.message()).toBe('Invalid token');
  });

  it('should use default success message if response message is missing', () => {
    vi.useFakeTimers();
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test' };
    authServiceMock.verifyEmail.mockReturnValue(of({ 
      user: mockUser 
    }));

    component.ngOnInit();

    expect(component.status()).toBe('success');
    expect(component.message()).toBe('Email verified successfully!');
  });

  it('should use default error message if error message is missing', () => {
    authServiceMock.verifyEmail.mockReturnValue(throwError(() => ({})));

    component.ngOnInit();

    expect(component.status()).toBe('error');
    expect(component.message()).toBe('Failed to verify email');
  });

  it('should resend verification by token successfully', () => {
    authServiceMock.resendVerificationByToken.mockReturnValue(of({ message: 'New link sent' }));
    
    component.resendVerification();

    expect(authServiceMock.resendVerificationByToken).toHaveBeenCalledWith('valid-token');
    expect(component.message()).toBe('New link sent');
  });

  it('should handle resend verification error', () => {
    authServiceMock.resendVerificationByToken.mockReturnValue(throwError(() => ({ message: 'Failed to resend' })));
    
    component.resendVerification();

    expect(authServiceMock.resendVerificationByToken).toHaveBeenCalledWith('valid-token');
    expect(component.message()).toBe('Failed to resend');
  });

  it('should use default error message on resend verification failure if message is missing', () => {
    authServiceMock.resendVerificationByToken.mockReturnValue(throwError(() => ({})));
    
    component.resendVerification();

    expect(authServiceMock.resendVerificationByToken).toHaveBeenCalledWith('valid-token');
    expect(component.message()).toBe('Failed to resend verification link');
  });

  it('should cancel registration successfully', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    authServiceMock.cancelRegistration.mockReturnValue(of({ message: 'Registration cancelled' }));
    
    component.cancelRegistration();

    expect(authServiceMock.cancelRegistration).toHaveBeenCalledWith('valid-token');
    expect(component.message()).toBe('Registration cancelled');
    
    vi.advanceTimersByTime(2000);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/register']);
  });

  it('should not cancel registration if user cancels confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    component.cancelRegistration();

    expect(authServiceMock.cancelRegistration).not.toHaveBeenCalled();
  });

  it('should handle cancel registration error', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    authServiceMock.cancelRegistration.mockReturnValue(throwError(() => ({ message: 'Failed to cancel' })));
    
    component.cancelRegistration();

    expect(authServiceMock.cancelRegistration).toHaveBeenCalledWith('valid-token');
    expect(component.message()).toBe('Failed to cancel');
  });

  it('should use default error message on cancel registration failure if message is missing', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    authServiceMock.cancelRegistration.mockReturnValue(throwError(() => ({})));
    
    component.cancelRegistration();

    expect(authServiceMock.cancelRegistration).toHaveBeenCalledWith('valid-token');
    expect(component.message()).toBe('Failed to cancel registration');
  });

  it('should not resend verification if token is missing', () => {
    activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(null);
    component.resendVerification();
    expect(authServiceMock.resendVerificationByToken).not.toHaveBeenCalled();
  });

  it('should not cancel registration if token is missing', () => {
    activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(null);
    const confirmSpy = vi.spyOn(window, 'confirm');
    
    component.cancelRegistration();
    
    expect(authServiceMock.cancelRegistration).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('should not cancel registration if token is undefined', () => {
    activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(undefined);
    const confirmSpy = vi.spyOn(window, 'confirm');
    
    component.cancelRegistration();
    
    expect(authServiceMock.cancelRegistration).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
