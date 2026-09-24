import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { SessionService } from '../../core/auth/session.service';
import { WINDOW } from '../../tokens/window.token';
import { AuthCallbackComponent } from './auth-callback.component';

describe('AuthCallbackComponent', () => {
  let component: AuthCallbackComponent;
  let fixture: ComponentFixture<AuthCallbackComponent>;
  let routerMock: any;
  let activatedRouteStub: any;
  let windowMock: any;
  let sessionMock: any;

  beforeEach(async () => {
    routerMock = {
      navigate: vi.fn(),
    };

    activatedRouteStub = {
      queryParams: of({}),
    };

    windowMock = {
      sessionStorage: {
        getItem: vi.fn().mockReturnValue(null),
        removeItem: vi.fn(),
      },
    };

    sessionMock = {
      reloadCurrentUser: vi.fn(() => true),
    };

    await TestBed.configureTestingModule({
      imports: [AuthCallbackComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: WINDOW, useValue: windowMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: SessionService, useValue: sessionMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthCallbackComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle error in query params', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    activatedRouteStub.queryParams = of({ error: 'auth_failed' });
    component.ngOnInit();

    expect(consoleSpy).toHaveBeenCalledWith('OAuth error:', 'Authentication failed');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should handle unknown error code', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    activatedRouteStub.queryParams = of({ error: 'unknown_error' });
    component.ngOnInit();

    expect(consoleSpy).toHaveBeenCalledWith(
      'OAuth error:',
      'An error occurred during authentication',
    );
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should handle success and redirect to home', async () => {
    activatedRouteStub.queryParams = of({});
    component.ngOnInit();

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(sessionMock.reloadCurrentUser).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    // removeItem should not be called when there's no saved returnUrl
  });

  it('should redirect to saved returnUrl', async () => {
    windowMock.sessionStorage.getItem.mockReturnValue('/dashboard');
    activatedRouteStub.queryParams = of({});
    component.ngOnInit();

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(windowMock.sessionStorage.removeItem).toHaveBeenCalledWith('authReturnUrl');
  });

  it('should redirect without sessionStorage on server platform', async () => {
    TestBed.resetTestingModule();

    const serverWindowMock = {
      sessionStorage: {
        getItem: vi.fn().mockReturnValue('/should-not-read'),
        removeItem: vi.fn(),
      },
    };

    await TestBed.configureTestingModule({
      imports: [AuthCallbackComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: WINDOW, useValue: serverWindowMock },
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: SessionService, useValue: sessionMock },
      ],
    }).compileComponents();

    const serverFixture = TestBed.createComponent(AuthCallbackComponent);
    const serverComponent = serverFixture.componentInstance;

    serverComponent.ngOnInit();
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    expect(serverWindowMock.sessionStorage.getItem).not.toHaveBeenCalled();
  });
});
