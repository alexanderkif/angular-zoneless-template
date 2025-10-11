import { selectUserName } from './users.selector';
import { GUEST } from '../../types/user';

describe('selectUserName', () => {
  it('should return the user name if user exists', () => {
    const mockState = {
      user: {
        name: 'John Doe',
        id: 0,
        email: '',
      },
    };

    const result = selectUserName.projector(mockState.user);
    expect(result).toBe('John Doe');
  });

  it('should return GUEST if user is null', () => {
    const mockState = {
      user: null,
    };

    const result = selectUserName.projector(mockState.user);
    expect(result).toBe(GUEST);
  });

  it('should return GUEST if user name is undefined', () => {
    const mockState = {
      user: null,
    };

    const result = selectUserName.projector(mockState.user);
    expect(result).toBe(GUEST);
  });
});
