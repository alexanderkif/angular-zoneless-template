import {
  runInInjectionContext,
  provideZonelessChangeDetection,
  EnvironmentInjector,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth-guard';
import { of } from 'rxjs';
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
    
    let result;
    if (result$ instanceof of(true).constructor) {
        (result$ as any).subscribe((res: any) => result = res);
    }
    
    expect(result).toBe(true);
  });

  it('should redirect to login if not authenticated', async () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);
    store.overrideSelector(selectSessionChecked, true);
    store.overrideSelector(selectIsAuthenticated, false);

    const result$ = runInInjectionContext(injector, () => authGuard({} as any, { url: '/protected' } as any));

    let result;
    if (result$ instanceof of(true).constructor) {
        (result$ as any).subscribe((res: any) => result = res);
    }

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/protected' } });
  });
});
