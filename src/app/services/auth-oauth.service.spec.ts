import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { WINDOW } from '../tokens/window.token';
import { AuthOauthService } from './auth-oauth.service';

describe('AuthOauthService', () => {
  let service: AuthOauthService;
  let windowMock: {
    location: { href: string };
    sessionStorage: { setItem: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    windowMock = {
      location: { href: 'http://localhost:4200' },
      sessionStorage: {
        setItem: vi.fn(),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthOauthService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: WINDOW, useValue: windowMock },
      ],
    });

    service = TestBed.inject(AuthOauthService);
  });

  it('should navigate to github oauth endpoint', () => {
    service.loginWithGithub();
    expect(windowMock.location.href).toBe('http://localhost:3000/api/auth/github');
  });

  it('should navigate to google oauth endpoint', () => {
    service.loginWithGoogle();
    expect(windowMock.location.href).toBe('http://localhost:3000/api/auth/google');
  });

  it('should persist returnUrl before oauth redirect', () => {
    service.loginWithGithub('/return-url');
    expect(windowMock.sessionStorage.setItem).toHaveBeenCalledWith('authReturnUrl', '/return-url');
  });

  it('should not persist returnUrl if not provided', () => {
    service.loginWithGoogle();
    expect(windowMock.sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it('should not navigate on server platform', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthOauthService,
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: WINDOW, useValue: windowMock },
      ],
    });

    const serverService = TestBed.inject(AuthOauthService);
    serverService.loginWithGithub('/server-return-url');

    expect(windowMock.location.href).toBe('http://localhost:4200');
    expect(windowMock.sessionStorage.setItem).not.toHaveBeenCalled();
  });
});
