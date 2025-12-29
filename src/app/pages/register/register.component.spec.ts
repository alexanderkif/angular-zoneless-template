import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { registerActions, oauthActions } from '../../store/auth/auth.actions';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let storeMock: any;
  let activatedRouteMock: any;

  beforeEach(async () => {
    storeMock = {
      dispatch: vi.fn(),
      selectSignal: vi.fn().mockReturnValue(() => false),
    };

    activatedRouteMock = {
      snapshot: {
        queryParamMap: {
          get: vi.fn(),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Store, useValue: storeMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate password match', () => {
    component.registerModel.set({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password456',
    });

    expect(component.passwordMismatch()()).toBe(true);

    component.registerModel.set({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(component.passwordMismatch()()).toBe(false);
  });

  it('should dispatch register action on valid submit', () => {
    vi.useFakeTimers();
    component.registerModel.set({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    component.onSubmit({ preventDefault: () => {} } as any);

    expect(storeMock.dispatch).toHaveBeenCalledWith(
      registerActions.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }),
    );

    vi.advanceTimersByTime(500);
    expect(component.registrationSuccess()).toBe(true);
    expect(component.registeredEmail()).toBe('test@example.com');
    vi.useRealTimers();
  });

  it('should not dispatch register action on invalid submit', () => {
    component.registerModel.set({
      name: '',
      email: 'invalid',
      password: '123',
      confirmPassword: '456',
    });

    component.onSubmit({ preventDefault: () => {} } as any);

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
