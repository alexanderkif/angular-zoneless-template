import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { Subject } from 'rxjs';
import { AuthQueryService } from '../../services/auth-query.service';
import { WINDOW } from '../../tokens/window.token';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let activatedRouteMock: any;
  let windowMock: any;
  let queryClient: QueryClient;
  let routerMock: any;
  let registerMutateFn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    registerMutateFn = vi.fn();

    const authQueryServiceMock = {
      registerMutation: () => ({
        mutate: registerMutateFn,
        isPending: vi.fn(() => false),
        error: vi.fn(() => null),
        data: vi.fn(() => null),
        isError: vi.fn(() => false),
        isSuccess: vi.fn(() => false),
      }),
    };

    routerMock = {
      navigate: vi.fn(),
      events: new Subject(),
      createUrlTree: vi.fn(),
      serializeUrl: vi.fn(() => ''),
    };

    activatedRouteMock = {
      snapshot: {
        queryParamMap: {
          get: vi.fn(),
        },
        queryParams: {},
      },
    };

    windowMock = {
      location: {
        href: 'http://localhost:4200',
      },
      sessionStorage: {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn(),
      },
    };

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTanStackQuery(queryClient),
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: WINDOW, useValue: windowMock },
        { provide: AuthQueryService, useValue: authQueryServiceMock },
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

    expect(component.passwordMismatch()).toBe(true);

    component.registerModel.set({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(component.passwordMismatch()).toBe(false);
  });

  it('should call registerMutation on valid submit', () => {
    component.registerModel.set({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    component.onSubmit({ preventDefault: () => {} } as any);

    expect(registerMutateFn).toHaveBeenCalledWith(
      {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      },
      expect.any(Object),
    );

    const options = registerMutateFn.mock.calls[0][1] as { onSuccess?: () => void };
    options.onSuccess?.();
    expect(component.registrationSuccess()).toBe(true);
  });

  it('should not call registerMutation on invalid submit', () => {
    component.registerModel.set({
      name: '',
      email: 'invalid',
      password: '123',
      confirmPassword: '456',
    });

    component.onSubmit({ preventDefault: () => {} } as any);

    expect(registerMutateFn).not.toHaveBeenCalled();
  });

  it('should redirect to OAuth endpoints for social registration', () => {
    component.registerWithGithub();
    expect(windowMock.location.href).toContain('/auth/github');

    component.registerWithGoogle();
    expect(windowMock.location.href).toContain('/auth/google');
  });

  it('should not redirect social registration on server platform', () => {
    (component as any).platformId = 'server';

    component.registerWithGithub();
    component.registerWithGoogle();

    expect(windowMock.location.href).toBe('http://localhost:4200');
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(false);
  });

  it('should toggle confirm password visibility', () => {
    expect(component.showConfirmPassword()).toBe(false);
    component.toggleConfirmPasswordVisibility();
    expect(component.showConfirmPassword()).toBe(true);
    component.toggleConfirmPasswordVisibility();
    expect(component.showConfirmPassword()).toBe(false);
  });
});
