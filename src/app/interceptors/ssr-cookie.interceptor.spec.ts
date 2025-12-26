import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { ssrCookieInterceptor } from './ssr-cookie.interceptor';

describe('ssrCookieInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;

  const setup = (platform: string) => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([ssrCookieInterceptor])),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: platform }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  };

  afterEach(() => {
    httpMock.verify();
    // Clean up global storage
    delete (globalThis as any).requestStorage;
  });

  it('should do nothing on browser', () => {
    setup('browser');
    
    httpClient.get('/test').subscribe();
    
    const req = httpMock.expectOne('/test');
    expect(req.request.headers.has('Cookie')).toBe(false);
  });

  it('should add cookies on server if available', () => {
    setup('server');
    
    // Mock AsyncLocalStorage
    (globalThis as any).requestStorage = {
      getStore: () => ({
        headers: {
          cookie: 'test=cookie'
        }
      })
    };

    httpClient.get('/test').subscribe();
    
    const req = httpMock.expectOne('/test');
    expect(req.request.headers.get('Cookie')).toBe('test=cookie');
    expect(req.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(req.request.withCredentials).toBe(true);
  });

  it('should handle array of cookies', () => {
    setup('server');
    
    (globalThis as any).requestStorage = {
      getStore: () => ({
        headers: {
          cookie: ['test=cookie', 'other=value']
        }
      })
    };

    httpClient.get('/test').subscribe();
    
    const req = httpMock.expectOne('/test');
    expect(req.request.headers.get('Cookie')).toBe('test=cookie; other=value');
  });

  it('should do nothing on server if no cookies', () => {
    setup('server');
    
    (globalThis as any).requestStorage = {
      getStore: () => ({
        headers: {}
      })
    };

    httpClient.get('/test').subscribe();
    
    const req = httpMock.expectOne('/test');
    expect(req.request.headers.has('Cookie')).toBe(false);
  });

  it('should handle errors gracefully', () => {
    setup('server');
    
    // Mock error throwing storage
    Object.defineProperty(globalThis, 'requestStorage', {
      get: () => { throw new Error('Storage error'); },
      configurable: true
    });

    const consoleSpy = vi.spyOn(console, 'warn');

    httpClient.get('/test').subscribe();
    
    const req = httpMock.expectOne('/test');
    expect(req.request.headers.has('Cookie')).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
