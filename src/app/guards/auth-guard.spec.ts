import {
  runInInjectionContext,
  provideZonelessChangeDetection,
  EnvironmentInjector,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth-guard';
import { of, throwError, firstValueFrom } from 'rxjs';
import { selectIsAuthenticated, selectSessionChecked } from '../store/auth/auth.selectors';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

describe('authGuard', () => {
  let router: { createUrlTree: ReturnType<typeof vi.fn> };
  let store: MockStore;
  let injector: EnvironmentInjector;

  beforeEach(() => {
    router = { createUrlTree: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: router },
        provideMockStore(),
      ],
    });

    injector = TestBed.inject(EnvironmentInjector);
    store = TestBed.inject(MockStore);
  });

  it('should allow access if authenticated', async () => {
    store.overrideSelector(selectSessionChecked, true);
    store.overrideSelector(selectIsAuthenticated, true);

    const result$ = runInInjectionContext(injector, () => authGuard({} as any, { url: '/protected' } as any));
    
    const result = await firstValueFrom(result$ as any);
    expect(result).toBe(true);
  });

  it('should redirect to login if not authenticated', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);
    store.overrideSelector(selectSessionChecked, true);
    store.overrideSelector(selectIsAuthenticated, false);

    const result$ = runInInjectionContext(injector, () => authGuard({} as any, { url: '/protected' } as any));

    const result = await firstValueFrom(result$ as any);

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/protected' } });
  });

  it('should redirect to login on error', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);
    store.overrideSelector(selectSessionChecked, true);
    // Simulate error in selector
    vi.spyOn(store, 'select').mockReturnValue(throwError(() => new Error('Error')));
    
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result$ = runInInjectionContext(injector, () => authGuard({} as any, { url: '/protected' } as any));

    const result = await firstValueFrom(result$ as any);

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/protected' } });
    expect(consoleSpy).toHaveBeenCalledWith('Auth guard timeout - redirecting to login');
  });
});
