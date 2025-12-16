import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { provideZonelessChangeDetection } from '@angular/core';
import { UserService } from '../../service/user.service';
import { UsersEffects } from './users.effects';
import { UsersApiActions, UsersUserActions } from './actions';
import { mockUser } from '../../types/user';

describe('UsersEffects', () => {
  let actions$: Observable<any>;
  let effects: UsersEffects;
  let userService: { getUser: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    userService = { getUser: vi.fn() };
    vi.clearAllMocks();

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

  it('should dispatch getUserSuccess if user exists in localStorage', async () => {
    // Mock localStorage before effect subscribes
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(mockUser));

    // Re-create the effects with the new mock
    const localEffects = TestBed.inject(UsersEffects);
    actions$ = of(UsersUserActions.initUser());

    const result = await firstValueFrom(localEffects.initUser$);
    expect(result).toEqual(UsersApiActions.getUserSuccess({ user: mockUser }));
    
    getItemSpy.mockRestore();
  });

  it('should dispatch fallback action if no user in localStorage', async () => {
    vi.spyOn(localStorage, 'getItem').mockReturnValue(null);

    actions$ = of(UsersUserActions.initUser());

    const result = await firstValueFrom(effects.initUser$);
    expect(result).toEqual({ type: '[User] User not found in LocalStorage' });
  });

  it('should dispatch fallback action if JSON.parse fails', async () => {
    vi.spyOn(localStorage, 'getItem').mockReturnValue('invalid-json');

    actions$ = of(UsersUserActions.initUser());

    const result = await firstValueFrom(effects.initUser$);
    expect(result).toEqual({ type: '[User] User not found in LocalStorage' });
  });

  it('should dispatch getUserSuccess on successful getUser', async () => {
    const action = UsersUserActions.getUser({ id: mockUser.id });

    actions$ = of(action);
    userService.getUser.mockReturnValue(of(mockUser));

    const result = await firstValueFrom(effects.loadUsers$);
    expect(result).toEqual(UsersApiActions.getUserSuccess({ user: mockUser }));
  });

  it('should dispatch getUserFailure on server error', async () => {
    const error = { message: 'fail' };
    const action = UsersUserActions.getUser({ id: mockUser.id });

    actions$ = of(action);
    userService.getUser.mockReturnValue(throwError(() => error));

    const result = await firstValueFrom(effects.loadUsers$);
    expect(result).toEqual(UsersApiActions.getUserFailure({ errorMsg: 'fail' }));
  });

  it('should dispatch getUserFailure on user not found', async () => {
    const action = UsersUserActions.getUser({ id: 999 });

    actions$ = of(action);
    userService.getUser.mockReturnValue(of(null));

    const result = await firstValueFrom(effects.loadUsers$);
    expect(result).toEqual(UsersApiActions.getUserFailure({ errorMsg: 'User not found' }));
  });
});
