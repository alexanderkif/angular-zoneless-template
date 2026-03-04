import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { of } from 'rxjs';
import { WINDOW } from '../../tokens/window.token';
import { AuthCallbackComponent } from './auth-callback.component';

describe('AuthCallbackComponent', () => {
  let component: AuthCallbackComponent;
  let fixture: ComponentFixture<AuthCallbackComponent>;
  let routerMock: any;
  let activatedRouteStub: any;
  let windowMock: any;
  let queryClient: QueryClient;

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

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    await TestBed.configureTestingModule({
      imports: [AuthCallbackComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTanStackQuery(queryClient),
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: WINDOW, useValue: windowMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
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
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTanStackQuery(queryClient),
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: WINDOW, useValue: serverWindowMock },
        { provide: PLATFORM_ID, useValue: 'server' },
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
