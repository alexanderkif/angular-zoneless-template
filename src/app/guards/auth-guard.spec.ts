import {
  runInInjectionContext,
  provideZonelessChangeDetection,
  EnvironmentInjector,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { authGuard } from './auth-guard';
import { UserState } from '../store/users/users.reducer';
import { GUEST } from '../types/user';

describe('authGuard', () => {
  let router: { createUrlTree: ReturnType<typeof vi.fn> };
  let store: { selectSignal: ReturnType<typeof vi.fn> };
  let injector: EnvironmentInjector;

  beforeEach(() => {
    router = { createUrlTree: vi.fn() };
    store = { selectSignal: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: router },
        { provide: Store, useValue: store },
      ],
    });

    injector = TestBed.inject(EnvironmentInjector);
  });

  it('should allow access if userName is not GUEST', () => {
    store.selectSignal.mockReturnValue(signal('John') as any);

    const result = runInInjectionContext(injector, () => authGuard(null!, null!));

    expect(result).toBe(true);
  });

  it('should redirect to / if userName is GUEST', () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);
    store.selectSignal.mockReturnValue(signal(GUEST) as any);

    const result = runInInjectionContext(injector, () => authGuard(null!, null!));

    expect(result).toBe(urlTree);
  });
});
