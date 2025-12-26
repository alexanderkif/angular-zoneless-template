import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthCallbackComponent } from './auth-callback.component';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { oauthActions } from '../../store/auth/auth.actions';
import { provideZonelessChangeDetection } from '@angular/core';

describe('AuthCallbackComponent', () => {
  let component: AuthCallbackComponent;
  let fixture: ComponentFixture<AuthCallbackComponent>;
  let routerMock: any;
  let storeMock: any;
  let activatedRouteStub: any;

  beforeEach(async () => {
    routerMock = {
      navigate: vi.fn()
    };
    storeMock = {
      dispatch: vi.fn()
    };
    activatedRouteStub = {
      queryParams: of({})
    };

    await TestBed.configureTestingModule({
      imports: [AuthCallbackComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: routerMock },
        { provide: Store, useValue: storeMock },
        { provide: ActivatedRoute, useValue: activatedRouteStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthCallbackComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle error in query params', () => {
    activatedRouteStub.queryParams = of({ error: 'auth_failed' });
    // Re-initialize component to trigger ngOnInit with new params
    component.ngOnInit();

    expect(storeMock.dispatch).toHaveBeenCalledWith(oauthActions.oAuthFailure({ 
      error: 'Authentication failed' 
    }));
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should handle unknown error code', () => {
    activatedRouteStub.queryParams = of({ error: 'unknown_error' });
    component.ngOnInit();

    expect(storeMock.dispatch).toHaveBeenCalledWith(oauthActions.oAuthFailure({ 
      error: 'An error occurred during authentication' 
    }));
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should handle success and redirect', () => {
    vi.useFakeTimers();
    activatedRouteStub.queryParams = of({});
    component.ngOnInit();

    expect(storeMock.dispatch).toHaveBeenCalledWith(oauthActions.oAuthSuccess({ 
      user: { id: '', email: '', name: '' } 
    }));
    
    vi.advanceTimersByTime(1000);
    
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    vi.useRealTimers();
  });
});
