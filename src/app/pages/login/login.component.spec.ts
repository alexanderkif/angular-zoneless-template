import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { loginActions, oauthActions } from '../../store/auth/auth.actions';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let storeMock: any;
  let activatedRouteStub: any;
  let authServiceMock: any;

  beforeEach(async () => {
    storeMock = {
      dispatch: vi.fn(),
      selectSignal: vi.fn().mockReturnValue(() => false),
    };

    activatedRouteStub = {
      snapshot: {
        queryParams: {},
      },
    };

    authServiceMock = {
      resendVerification: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Store, useValue: storeMock },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch login action on valid submit', () => {
    component.loginModel.set({ email: 'test@example.com', password: 'password123' });

    component.onSubmit({ preventDefault: () => {} } as any);

    expect(storeMock.dispatch).toHaveBeenCalledWith(
      loginActions.login({
        email: 'test@example.com',
        password: 'password123',
        returnUrl: undefined,
      }),
    );
  });

  it('should dispatch login action with returnUrl', () => {
    activatedRouteStub.snapshot.queryParams['returnUrl'] = '/dashboard';

    component.loginModel.set({ email: 'test@example.com', password: 'password123' });

    component.onSubmit({ preventDefault: () => {} } as any);

    expect(storeMock.dispatch).toHaveBeenCalledWith(
      loginActions.login({
        email: 'test@example.com',
        password: 'password123',
        returnUrl: '/dashboard',
      }),
    );
  });

  it('should not dispatch login action on invalid submit', () => {
    component.loginModel.set({ email: 'invalid-email', password: '' });

    component.onSubmit({ preventDefault: () => {} } as any);

    expect(storeMock.dispatch).not.toHaveBeenCalled();
  });

  it('should dispatch githubLogin action', () => {
    component.loginWithGithub();
    expect(storeMock.dispatch).toHaveBeenCalledWith(oauthActions.githubLogin());
  });

  it('should dispatch googleLogin action', () => {
    component.loginWithGoogle();
    expect(storeMock.dispatch).toHaveBeenCalledWith(oauthActions.googleLogin());
  });

  it('should call resendVerification and set success message', () => {
    const email = 'test@example.com';
    component.loginModel.set({ email, password: '' });
    authServiceMock.resendVerification.mockReturnValue(of({ message: 'Verification email sent' }));

    component.resendVerification();

    expect(authServiceMock.resendVerification).toHaveBeenCalledWith(email);
    expect(component.resendMessage()).toBe('Verification email sent');
  });

  it('should call resendVerification and set error message on failure', () => {
    const email = 'test@example.com';
    component.loginModel.set({ email, password: '' });
    authServiceMock.resendVerification.mockReturnValue(
      throwError(() => ({ message: 'Failed to send' })),
    );

    component.resendVerification();

    expect(authServiceMock.resendVerification).toHaveBeenCalledWith(email);
    expect(component.resendMessage()).toBe('Failed to send');
  });

  it('should use default error message on resend failure if message is missing', () => {
    const email = 'test@example.com';
    component.loginModel.set({ email, password: '' });
    authServiceMock.resendVerification.mockReturnValue(throwError(() => ({})));

    component.resendVerification();

    expect(authServiceMock.resendVerification).toHaveBeenCalledWith(email);
    expect(component.resendMessage()).toBe('Failed to resend verification email');
  });

  it('should not call resendVerification if email is empty', () => {
    component.loginModel.set({ email: '', password: '' });
    component.resendVerification();
    expect(authServiceMock.resendVerification).not.toHaveBeenCalled();
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(false);
  });
});
