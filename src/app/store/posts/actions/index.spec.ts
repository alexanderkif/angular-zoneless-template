import { PostsUserActions, PostsApiActions } from './index';

describe('Posts Actions Index', () => {
  it('should export PostsUserActions', () => {
    expect(PostsUserActions).toBeTruthy();
  });

  it('should export PostsApiActions', () => {
    expect(PostsApiActions).toBeTruthy();
  });
});
