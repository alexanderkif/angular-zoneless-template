import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { tokenRefreshInterceptor } from './token-refresh.interceptor';
import { AuthService } from '../services/auth.service';
import { Store } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import { tokenActions } from '../store/auth/auth.actions';
import { provideZonelessChangeDetection } from '@angular/core';

describe('tokenRefreshInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authServiceMock: any;
  let storeMock: any;

  beforeEach(() => {
    authServiceMock = {
      refreshToken: vi.fn()
    };
    storeMock = {
      dispatch: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([tokenRefreshInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Store, useValue: storeMock }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should pass through successful requests', () => {
    httpClient.get('/test').subscribe();
    
    const req = httpMock.expectOne('/test');
    req.flush({});
  });

  it('should refresh token on 401', () => {
    const user = { id: '1', email: 'test@example.com', name: 'Test' };
    authServiceMock.refreshToken.mockReturnValue(of(user));

    httpClient.get('/test').subscribe();
    
    const req = httpMock.expectOne('/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.refreshToken).toHaveBeenCalled();
    expect(storeMock.dispatch).toHaveBeenCalledWith(tokenActions.refreshTokenSuccess({ user }));
    
    // Should retry original request
    const retryReq = httpMock.expectOne('/test');
    retryReq.flush({});
  });

  it('should not refresh on 401 for auth endpoints', () => {
    httpClient.post('/auth/login', {}).subscribe({
      error: () => {}
    });
    
    const req = httpMock.expectOne('/auth/login');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.refreshToken).not.toHaveBeenCalled();
  });

  it('should handle refresh failure', () => {
    authServiceMock.refreshToken.mockReturnValue(throwError(() => new Error('Refresh failed')));

    httpClient.get('/test').subscribe({
      error: (error) => {
        expect(error.message).toBe('Refresh failed');
      }
    });
    
    const req = httpMock.expectOne('/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(storeMock.dispatch).toHaveBeenCalledWith(tokenActions.refreshTokenFailure({ error: 'Session expired' }));
  });

  it('should not dispatch failure if session expired message', () => {
    authServiceMock.refreshToken.mockReturnValue(throwError(() => new Error('Session expired')));

    httpClient.get('/test').subscribe({
      error: (error) => {
        expect(error.message).toBe('Session expired');
      }
    });
    
    const req = httpMock.expectOne('/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(storeMock.dispatch).not.toHaveBeenCalled();
  });
});
