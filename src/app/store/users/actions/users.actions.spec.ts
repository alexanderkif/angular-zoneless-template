import { mockUser } from '../../../types/user';
import * as UsersApiActions from './users.api.actions';
import * as UsersUserActions from './users.user.actions';

describe('Users Actions', () => {
  it('should create initUser action', () => {
    const action = UsersUserActions.initUser();
    expect(action.type).toBe('[User] Init User');
  });

  it('should create getUser action', () => {
    const action = UsersUserActions.getUser({ id: 1 });
    expect(action.type).toBe('[Users] Get user');
  });

  it('should create getUserSuccess action with user', () => {
    const action = UsersApiActions.getUserSuccess({ user: mockUser });
    expect(action.type).toBe('[Users] Get user success');
    expect(action.user).toEqual(mockUser);
  });

  it('should create getUserFailure action with error', () => {
    const errorMsg = 'Error fetching user';
    const action = UsersApiActions.getUserFailure({ errorMsg });
    expect(action.type).toBe('[Users] Get user failure');
    expect(action.errorMsg).toEqual(errorMsg);
  });
});
