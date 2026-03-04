import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService, resolveAuthErrorMessage } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should post cancel registration request', () => {
    service.cancelRegistration('token-1').subscribe((response) => {
      expect(response).toEqual({ message: 'ok' });
    });

    const req = httpMock.expectOne('http://localhost:3000/api/auth/cancel-registration');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'token-1' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ message: 'ok' });
  });

  it('should map ErrorEvent to error message', () => {
    service.cancelRegistration('token-2').subscribe({
      error: (error: Error) => {
        expect(error.message).toBe('network down');
      },
    });

    const req = httpMock.expectOne('http://localhost:3000/api/auth/cancel-registration');
    req.error(new ErrorEvent('NetworkError', { message: 'network down' }));
  });

  it('should map JSON error body field "error"', () => {
    service.cancelRegistration('token-3').subscribe({
      error: (error: Error) => {
        expect(error.message).toBe('bad request');
      },
    });

    const req = httpMock.expectOne('http://localhost:3000/api/auth/cancel-registration');
    req.flush({ error: 'bad request' }, { status: 400, statusText: 'Bad Request' });
  });

  it('should map JSON error body field "message"', () => {
    service.cancelRegistration('token-4').subscribe({
      error: (error: Error) => {
        expect(error.message).toBe('server message');
      },
    });

    const req = httpMock.expectOne('http://localhost:3000/api/auth/cancel-registration');
    req.flush({ message: 'server message' }, { status: 400, statusText: 'Bad Request' });
  });

  it('should fallback to JSON.stringify for unknown object body', () => {
    service.cancelRegistration('token-5').subscribe({
      error: (error: Error) => {
        expect(error.message).toBe('{"a":1}');
      },
    });

    const req = httpMock.expectOne('http://localhost:3000/api/auth/cancel-registration');
    req.flush({ a: 1 }, { status: 400, statusText: 'Bad Request' });
  });

  it('should fallback to generic error.message', () => {
    service.cancelRegistration('token-6').subscribe({
      error: (error: Error) => {
        expect(error.message).toContain('Http failure response');
      },
    });

    const req = httpMock.expectOne('http://localhost:3000/api/auth/cancel-registration');
    req.flush('plain text error', { status: 500, statusText: 'Server Error' });
  });

  it('should fallback to unexpected message when resolved message is non-string', () => {
    service.cancelRegistration('token-7').subscribe({
      error: (error: Error) => {
        expect(error.message).toBe('An unexpected error occurred');
      },
    });

    const req = httpMock.expectOne('http://localhost:3000/api/auth/cancel-registration');
    req.flush({ message: 12345 }, { status: 400, statusText: 'Bad Request' });
  });

  it('should resolve generic error.message branch directly', () => {
    expect(resolveAuthErrorMessage({ message: 'generic error' })).toBe('generic error');
  });

  it('should resolve unknown shape to default message', () => {
    expect(resolveAuthErrorMessage({})).toBe('An error occurred');
  });
});
