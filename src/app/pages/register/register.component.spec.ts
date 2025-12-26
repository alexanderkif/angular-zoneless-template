import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { Store } from '@ngrx/store';
import { registerActions, oauthActions } from '../../store/auth/auth.actions';
import { selectIsLoading, selectError } from '../../store/auth/auth.selectors';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let storeMock: any;
  let activatedRouteMock: any;

  beforeEach(async () => {
    storeMock = {
      dispatch: vi.fn(),
      selectSignal: vi.fn().mockReturnValue(() => false)
    };

    activatedRouteMock = {
      snapshot: {
        queryParamMap: {
          get: vi.fn()
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Store, useValue: storeMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate password match', () => {
    component.registerForm.setValue({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password456'
    });

    expect(component.registerForm.errors).toEqual({ passwordMismatch: true });

    component.registerForm.patchValue({
      confirmPassword: 'password123'
    });

    expect(component.registerForm.errors).toBeNull();
  });

  it('should dispatch register action on valid submit', () => {
    vi.useFakeTimers();
    component.registerForm.setValue({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    });

    component.onSubmit();

    expect(storeMock.dispatch).toHaveBeenCalledWith(registerActions.register({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    }));

    vi.advanceTimersByTime(500);
    expect(component.registrationSuccess()).toBe(true);
    expect(component.registeredEmail()).toBe('test@example.com');
    vi.useRealTimers();
  });

  it('should not dispatch register action on invalid submit', () => {
    component.registerForm.setValue({
      name: '',
      email: 'invalid',
      password: '123',
      confirmPassword: '456'
    });

    component.onSubmit();

    expect(storeMock.dispatch).not.toHaveBeenCalled();
  });

  it('should dispatch githubLogin action', () => {
    component.registerWithGithub();
    expect(storeMock.dispatch).toHaveBeenCalledWith(oauthActions.githubLogin());
  });

  it('should dispatch googleLogin action', () => {
    component.registerWithGoogle();
    expect(storeMock.dispatch).toHaveBeenCalledWith(oauthActions.googleLogin());
  });
});
