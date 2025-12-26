import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { AuthEffects } from './auth.effects';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { sessionActions } from './auth.actions';
import { PLATFORM_ID, TransferState, makeStateKey, provideZonelessChangeDetection } from '@angular/core';

describe('AuthEffects (Server)', () => {
  let actions$: Observable<any>;
  let effects: AuthEffects;
  let authServiceMock: any;
  let routerMock: any;
  let transferStateMock: any;

  beforeEach(() => {
    authServiceMock = {
      getCurrentUser: vi.fn()
    };

    routerMock = {
      navigateByUrl: vi.fn(),
      navigate: vi.fn(),
      parseUrl: vi.fn(),
      url: '/'
    };

    transferStateMock = {
      hasKey: vi.fn(),
      get: vi.fn(),
      remove: vi.fn(),
      set: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthEffects,
        provideMockActions(() => actions$),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: TransferState, useValue: transferStateMock },
        { provide: PLATFORM_ID, useValue: 'server' }
      ]
    });

    effects = TestBed.inject(AuthEffects);
  });

  describe('checkSession$', () => {
    it('should return sessionInvalid if no cookies (server)', async () => {
      const action = sessionActions.checkSession();
      const outcome = sessionActions.sessionInvalid();
      actions$ = of(action);

      // Mock globalThis.requestStorage
      (globalThis as any).requestStorage = {
        getStore: vi.fn().mockReturnValue(null)
      };

      const result = await firstValueFrom(effects.checkSession$);
      expect(result).toEqual(outcome);
      expect(transferStateMock.set).toHaveBeenCalledWith(expect.anything(), null);
    });

    it('should call API if cookies exist (server)', async () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      const action = sessionActions.checkSession();
      const outcome = sessionActions.sessionValid({ user });
      actions$ = of(action);

      (globalThis as any).requestStorage = {
        getStore: vi.fn().mockReturnValue({ headers: { cookie: 'session=123' } })
      };
      authServiceMock.getCurrentUser.mockReturnValue(of(user));

      const result = await firstValueFrom(effects.checkSession$);
      expect(result).toEqual(outcome);
      expect(transferStateMock.set).toHaveBeenCalledWith(expect.anything(), user);
    });

    it('should return sessionInvalid on API error (server)', async () => {
      const action = sessionActions.checkSession();
      const outcome = sessionActions.sessionInvalid();
      actions$ = of(action);

      (globalThis as any).requestStorage = {
        getStore: vi.fn().mockReturnValue({ headers: { cookie: 'session=123' } })
      };
      authServiceMock.getCurrentUser.mockReturnValue(throwError(() => new Error('Error')));

      const result = await firstValueFrom(effects.checkSession$);
      expect(result).toEqual(outcome);
      expect(transferStateMock.set).toHaveBeenCalledWith(expect.anything(), null);
    });
  });
});
