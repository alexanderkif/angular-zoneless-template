import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';
import { provideZonelessChangeDetection } from '@angular/core';
import { UserService } from '../../service/user.service';
import { UsersEffects } from './users.effects';
import { UsersApiActions, UsersUserActions } from './actions';
import { hot, cold } from 'jasmine-marbles';
import { mockUser } from '../../types/user';
import { initUser } from './actions/users.user.actions';

describe('UsersEffects', () => {
  let actions$: Observable<any>;
  let effects: UsersEffects;
  let userService: jasmine.SpyObj<UserService>;

  beforeEach(() => {
    userService = jasmine.createSpyObj('UserService', ['getUser']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        UsersEffects,
        provideMockActions(() => actions$),
        { provide: UserService, useValue: userService },
      ],
    });

    effects = TestBed.inject(UsersEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });

  it('should dispatch getUserSuccess if user exists in localStorage', () => {
    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(mockUser));

    actions$ = hot('-a', { a: initUser() });
    const expected = cold('-b', {
      b: UsersApiActions.getUserSuccess({ user: mockUser }),
    });

    expect(effects.initUser$).toBeObservable(expected);
  });

  it('should dispatch fallback action if no user in localStorage', () => {
    spyOn(localStorage, 'getItem').and.returnValue(null);

    actions$ = hot('-a', { a: initUser() });
    const expected = cold('-b', {
      b: { type: '[User] User not found in LocalStorage' },
    });

    expect(effects.initUser$).toBeObservable(expected);
  });

  it('should dispatch fallback action if JSON.parse fails', () => {
    spyOn(localStorage, 'getItem').and.returnValue('invalid-json');

    actions$ = hot('-a', { a: initUser() });
    const expected = cold('-b', {
      b: { type: '[User] User not found in LocalStorage' },
    });

    expect(effects.initUser$).toBeObservable(expected);
  });

  it('should dispatch getUserSuccess on successful getUser', () => {
    const action = UsersUserActions.getUser({ id: mockUser.id });
    const outcome = UsersApiActions.getUserSuccess({ user: mockUser });

    actions$ = hot('-a', { a: action });
    userService.getUser.and.returnValue(cold('-b|', { b: mockUser }));

    const expected = cold('--c', { c: outcome });
    expect(effects.loadUsers$).toBeObservable(expected);
  });

  it('should dispatch getUserFailure on server error', () => {
    const error = { message: 'fail' };
    const action = UsersUserActions.getUser({ id: mockUser.id });
    const outcome = UsersApiActions.getUserFailure({ errorMsg: 'fail' });

    actions$ = hot('-a', { a: action });
    userService.getUser.and.returnValue(cold('-#|', {}, error));

    const expected = cold('--c', { c: outcome });
    expect(effects.loadUsers$).toBeObservable(expected);
  });

  it('should dispatch getUserFailure on user not found', () => {
    const action = UsersUserActions.getUser({ id: 999 });
    const outcome = UsersApiActions.getUserFailure({ errorMsg: 'User not found' });

    actions$ = hot('-a', { a: action });
    userService.getUser.and.returnValue(cold('-b|', { b: null }));
    const expected = cold('--c', { c: outcome });
    expect(effects.loadUsers$).toBeObservable(expected);
  });
});
