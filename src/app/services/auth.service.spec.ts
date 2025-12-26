import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { PLATFORM_ID, provideZonelessChangeDetection, isDevMode } from '@angular/core';
import { WINDOW } from '../tokens/window.token';
import { throwError } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let windowMock: any;
  const apiUrl = isDevMode() ? 'http://localhost:3000/api' : '/api';

  beforeEach(() => {
    windowMock = {
      location: {
        href: ''
      }
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: WINDOW, useValue: windowMock }
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login', () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test' };
    
    service.login('test@example.com', 'password').subscribe(user => {
      expect(user).toEqual(mockUser);
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@example.com', password: 'password' });
    req.flush({ user: mockUser });
  });

  it('should register', () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test' };
    
    service.register('test@example.com', 'password', 'Test').subscribe(user => {
      expect(user).toEqual(mockUser);
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@example.com', password: 'password', name: 'Test' });
    req.flush({ user: mockUser });
  });

  it('should get current user', () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test' };
    
    service.getCurrentUser().subscribe(user => {
      expect(user).toEqual(mockUser);
    });

    const req = httpMock.expectOne(`${apiUrl}/user/me`);
    expect(req.request.method).toBe('GET');
    req.flush({ user: mockUser });
  });

  it('should handle 401 in getCurrentUser', () => {
    service.getCurrentUser().subscribe({
      error: (error) => {
        expect(error.message).toBe('Not authenticated');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/user/me`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should refresh token', () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test' };
    
    service.refreshToken().subscribe(user => {
      expect(user).toEqual(mockUser);
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/refresh`);
    expect(req.request.method).toBe('POST');
    req.flush({ user: mockUser });
  });

  it('should handle 401 in refreshToken', () => {
    service.refreshToken().subscribe({
      error: (error) => {
        expect(error.message).toBe('Session expired');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/refresh`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should logout', () => {
    service.logout().subscribe();

    const req = httpMock.expectOne(`${apiUrl}/auth/logout`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should verify email', () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test' };
    const token = 'valid-token';
    
    service.verifyEmail(token).subscribe(response => {
      expect(response.user).toEqual(mockUser);
      expect(response.message).toBe('Success');
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/verify-email?token=${token}`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'Success', user: mockUser });
  });

  it('should handle errors', () => {
    service.login('test@example.com', 'password').subscribe({
      error: (error) => {
        expect(error.message).toBe('Invalid credentials');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/login`);
    req.flush({ error: 'Invalid credentials' }, { status: 400, statusText: 'Bad Request' });
  });

  it('should redirect to github', () => {
    const spy = vi.spyOn(service, 'navigateTo').mockImplementation(() => {});
    service.loginWithGithub();
    expect(spy).toHaveBeenCalledWith(`${apiUrl}/auth/github`);
  });

  it('should redirect to google', () => {
    const spy = vi.spyOn(service, 'navigateTo').mockImplementation(() => {});
    service.loginWithGoogle();
    expect(spy).toHaveBeenCalledWith(`${apiUrl}/auth/google`);
  });

  it('should log error for non-401 in getCurrentUser', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    service.getCurrentUser().subscribe({
      error: (error) => {
        expect(error.message).toBe('Not authenticated');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/user/me`);
    req.flush('Server Error', { status: 500, statusText: 'Server Error' });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log error for non-401 in refreshToken', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    service.refreshToken().subscribe({
      error: (error) => {
        expect(error.message).toBe('Session expired');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/refresh`);
    req.flush('Server Error', { status: 500, statusText: 'Server Error' });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle generic error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    service.login('test@example.com', 'password').subscribe({
      error: (error) => {
        expect(error.message).toContain('Http failure response');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/login`);
    req.flush({}, { status: 500, statusText: 'Server Error' });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle error with ErrorEvent', () => {
    const errorEvent = new ErrorEvent('Network error', {
      message: 'Network error occurred'
    });

    service.login('test@example.com', 'password').subscribe({
      error: (error) => {
        expect(error.message).toBe('Network error occurred');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/login`);
    req.error(errorEvent);
  });

  it('should handle error with JSON body', () => {
    service.login('test@example.com', 'password').subscribe({
      error: (error) => {
        expect(error.message).toBe('Custom error');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/login`);
    req.flush({ error: 'Custom error' }, { status: 400, statusText: 'Bad Request' });
  });

  it('should navigate to url in browser', () => {
    service.navigateTo('http://example.com');
    expect(windowMock.location.href).toBe('http://example.com');
  });

  it('should handle error with nested error object', () => {
    service.login('test@example.com', 'password').subscribe({
      error: (error) => {
        expect(error.message).toBe('Nested error');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/login`);
    req.flush({ error: 'Nested error' }, { status: 400, statusText: 'Bad Request' });
  });

  it('should handle error with message property', () => {
    const httpClient = TestBed.inject(HttpClient);
    vi.spyOn(httpClient, 'post').mockReturnValue(throwError(() => ({ message: 'Message error' })));

    service.login('test@example.com', 'password').subscribe({
      error: (error) => {
        expect(error.message).toBe('Message error');
      }
    });
  });
  
  it('should fallback to default error message', () => {
    const httpClient = TestBed.inject(HttpClient);
    vi.spyOn(httpClient, 'post').mockReturnValue(throwError(() => ({})));

    service.login('test@example.com', 'password').subscribe({
      error: (error) => {
        expect(error.message).toBe('An error occurred');
      }
    });
  });

  it('should resend verification email', () => {
    const email = 'test@example.com';
    
    service.resendVerification(email).subscribe(response => {
      expect(response.message).toBe('Verification email sent');
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/resend-verification`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email });
    req.flush({ message: 'Verification email sent' });
  });

  it('should resend verification by token', () => {
    const token = 'expired-token';
    
    service.resendVerificationByToken(token).subscribe(response => {
      expect(response.message).toBe('Verification email sent');
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/resend-verification`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token });
    req.flush({ message: 'Verification email sent' });
  });

  it('should cancel registration', () => {
    const token = 'valid-token';
    
    service.cancelRegistration(token).subscribe(response => {
      expect(response.message).toBe('Registration cancelled');
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/cancel-registration`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token });
    req.flush({ message: 'Registration cancelled' });
  });

  it('should handle non-string error message in body', () => {
    service.login('test@example.com', 'password').subscribe({
      error: (error) => {
        expect(error.message).toBe('An unexpected error occurred');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/login`);
    req.flush({ error: 123 }, { status: 400, statusText: 'Bad Request' });
  });

  it('should handle string error body', () => {
    service.login('test@example.com', 'password').subscribe({
      error: (error) => {
        expect(error.message).toContain('Http failure response');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/login`);
    req.flush('Some string error', { status: 400, statusText: 'Bad Request' });
  });

  it('should handle error with message property in body', () => {
    service.login('test@example.com', 'password').subscribe({
      error: (error) => {
        expect(error.message).toBe('Custom message');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/login`);
    req.flush({ message: 'Custom message' }, { status: 400, statusText: 'Bad Request' });
  });

  it('should handle error with unknown object body', () => {
    const errorBody = { some: 'data' };
    service.login('test@example.com', 'password').subscribe({
      error: (error) => {
        expect(error.message).toBe(JSON.stringify(errorBody));
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/login`);
    req.flush(errorBody, { status: 400, statusText: 'Bad Request' });
  });
});

describe('AuthService (Server)', () => {
  let service: AuthService;
  let windowMock: any;

  beforeEach(() => {
    windowMock = {
      location: {
        href: ''
      }
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: WINDOW, useValue: windowMock }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should NOT navigate to url in server', () => {
    service.navigateTo('http://example.com');
    expect(windowMock.location.href).toBe('');
  });
});
