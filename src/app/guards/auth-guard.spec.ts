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
  let router: jasmine.SpyObj<Router>;
  let store: jasmine.SpyObj<Store<UserState>>;
  let injector: EnvironmentInjector;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['createUrlTree']);
    store = jasmine.createSpyObj('Store', ['selectSignal']);

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
    store.selectSignal.and.returnValue(signal('John') as any);

    const result = runInInjectionContext(injector, () => authGuard(null!, null!));

    expect(result).toBeTrue();
  });

  it('should redirect to / if userName is GUEST', () => {
    const urlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(urlTree);
    store.selectSignal.and.returnValue(signal(GUEST) as any);

    const result = runInInjectionContext(injector, () => authGuard(null!, null!));

    expect(result).toBe(urlTree);
  });
});
