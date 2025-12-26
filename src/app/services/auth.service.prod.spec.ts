import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { WINDOW } from '../tokens/window.token';

// Mock isDevMode
vi.mock('@angular/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@angular/core')>();
  return {
    ...actual,
    isDevMode: vi.fn().mockReturnValue(false)
  };
});

describe('AuthService (Production)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: WINDOW, useValue: { location: { href: '' } } }
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use production api url', () => {
    service.login('test@example.com', 'password').subscribe();
    
    // Expect request to /api/auth/login (without http://localhost:3000)
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ user: { id: '1', email: 'test', name: 'Test' } });
  });
});
