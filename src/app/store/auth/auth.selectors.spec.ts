import { AuthUser } from './auth.actions';
import {
  selectUserName,
  selectUserEmail,
  selectUserAvatar,
  selectIsEmailProvider,
} from './auth.selectors';

describe('Auth Selectors', () => {
  const user: AuthUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: 'avatar.png',
    provider: 'email',
  };

  it('should select user name', () => {
    expect(selectUserName.projector(user)).toBe('Test User');
    expect(selectUserName.projector(null)).toBe('Guest');
  });

  it('should select user email', () => {
    expect(selectUserEmail.projector(user)).toBe('test@example.com');
    expect(selectUserEmail.projector(null)).toBe('');
  });

  it('should select user avatar', () => {
    expect(selectUserAvatar.projector(user)).toBe('avatar.png');
    expect(selectUserAvatar.projector(null)).toBeNull();
  });

  it('should select is email provider', () => {
    expect(selectIsEmailProvider.projector(user)).toBe(true);
    expect(selectIsEmailProvider.projector({ ...user, provider: 'github' })).toBe(false);
    expect(selectIsEmailProvider.projector(null)).toBe(true);
  });
});
