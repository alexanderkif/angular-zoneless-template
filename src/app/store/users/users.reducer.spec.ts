import { usersFeature, UserState } from './users.reducer';
import { UsersApiActions, UsersUserActions } from './actions/';
import { mockUser } from '../../types/user';

export const usersSlice: UserState = {
  user: null,
  error: '',
  isLoading: false,
};

describe('usersSlice reducer', () => {
  it('should return the initial state', () => {
    const state = usersFeature.reducer(undefined, { type: '@@init' } as any);
    expect(state).toEqual(usersSlice);
  });

  it('should set isLoading true on getUser', () => {
    const action = UsersUserActions.getUser({ id: 1 });
    const state = usersFeature.reducer(usersSlice, action);
    expect(state.isLoading).toBe(true);
  });

  it('should set user and isLoading false on getUserSuccess', () => {
    const action = UsersApiActions.getUserSuccess({ user: mockUser });
    const state = usersFeature.reducer({ ...usersSlice, isLoading: true }, action);
    expect(state.user).toEqual(mockUser);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('');
  });

  it('should set error and isLoading false on getUserFailure', () => {
    const action = UsersApiActions.getUserFailure({ errorMsg: 'Failed' });
    const state = usersFeature.reducer({ ...usersSlice, isLoading: true }, action);
    expect(state.error).toBe('Failed');
    expect(state.isLoading).toBe(false);
    expect(state.user).toEqual(null);
  });

  it('should reset user on exitUser', () => {
    const action = UsersUserActions.exitUser();
    const state = usersFeature.reducer(
      { ...usersSlice, user: mockUser, error: 'Some error', isLoading: false },
      action
    );
    expect(state.user).toBeNull();
    expect(state.error).toBe('');
    expect(state.isLoading).toBe(false);
  });
});
