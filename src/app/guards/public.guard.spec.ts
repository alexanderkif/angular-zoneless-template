import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { publicGuard } from './public.guard';
import { provideZonelessChangeDetection } from '@angular/core';

describe('publicGuard', () => {
  let routerMock: any;
  let storeMock: any;

  beforeEach(() => {
    routerMock = {
      createUrlTree: vi.fn()
    };
    storeMock = {
      selectSignal: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: routerMock },
        { provide: Store, useValue: storeMock }
      ]
    });
  });

  it('should allow access if not authenticated', () => {
    storeMock.selectSignal.mockReturnValue(() => false);
    
    const result = TestBed.runInInjectionContext(() => publicGuard({} as any, {} as any));
    
    expect(result).toBe(true);
  });

  it('should redirect to home if authenticated', () => {
    storeMock.selectSignal.mockReturnValue(() => true);
    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);
    
    const result = TestBed.runInInjectionContext(() => publicGuard({} as any, {} as any));
    
    expect(result).toBe(urlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
