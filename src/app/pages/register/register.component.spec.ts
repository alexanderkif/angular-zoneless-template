import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { SessionService } from '../../core/auth/session.service';
import { WINDOW } from '../../tokens/window.token';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let activatedRouteMock: any;
  let windowMock: any;
  let routerMock: any;
  let sessionMock: any;

  beforeEach(async () => {
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

    sessionMock = {
      register: vi.fn(async () => ({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        provider: 'local',
        emailVerified: false,
        role: 'user',
      })),
      registerState: { isPending: signal(false), error: signal<Error | null>(null) },
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: WINDOW, useValue: windowMock },
        { provide: SessionService, useValue: sessionMock },
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

  it('should call session.register on valid submit', async () => {
    component.registerModel.set({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    await component.onSubmit({ preventDefault: () => {} } as Event);

    expect(sessionMock.register).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });
    expect(component.registrationSuccess()).toBe(true);
  });

  it('should not call session.register on invalid submit', async () => {
    component.registerModel.set({
      name: '',
      email: 'invalid',
      password: '123',
      confirmPassword: '456',
    });

    await component.onSubmit({ preventDefault: () => {} } as Event);

    expect(sessionMock.register).not.toHaveBeenCalled();
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
