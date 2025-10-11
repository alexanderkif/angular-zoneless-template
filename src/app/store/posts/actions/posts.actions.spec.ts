import * as PostsApiActions from './posts.api.actions';
import * as PostsUserActions from './posts.user.actions';

describe('Posts Actions', () => {
  it('should create loadPostsSuccess action', () => {
    const posts = [{ id: 1, title: 'A', body: 'B', userId: 1 }];
    const action = PostsApiActions.loadPostsSuccess({ posts });
    expect(action.type).toBe('[Posts Page] Load posts success');
    expect(action.posts).toEqual(posts);
  });

  it('should create loadPostsFailure action', () => {
    const action = PostsApiActions.loadPostsFailure({ errorMsg: 'error' });
    expect(action.type).toBe('[Posts Page] Load posts failure');
    expect(action.errorMsg).toBe('error');
  });

  it('should create loadPosts action', () => {
    const action = PostsUserActions.loadPosts({ limit: 5 });
    expect(action.type).toBe('[Posts Page] Load posts');
    expect(action.limit).toBe(5);
  });

  it('should create clearPosts action', () => {
    const action = PostsUserActions.clearPosts();
    expect(action.type).toBe('[Posts Page] Clear posts');
  });
});
