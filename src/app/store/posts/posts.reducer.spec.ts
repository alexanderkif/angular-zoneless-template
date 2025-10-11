import { postsFeature, PostState } from './posts.reducer';
import { PostsApiActions, PostsUserActions } from './actions/';
import { Post } from '../../types/post';

export const postsSlice: PostState = {
  posts: [],
  error: '',
  isLoading: false,
};

describe('postsSlice reducer', () => {
  it('should return the initial state', () => {
    const state = postsFeature.reducer(undefined, { type: '@@init' } as any);
    expect(state).toEqual(postsSlice);
  });

  it('should set isLoading true on loadPosts', () => {
    const action = PostsUserActions.loadPosts({ limit: 10 });
    const state = postsFeature.reducer(postsSlice, action);
    expect(state.isLoading).toBeTrue();
  });

  it('should set posts and isLoading false on loadPostsSuccess', () => {
    const posts: Post[] = [{ id: 1, title: 'Test', body: 'Body', userId: 1 }];
    const action = PostsApiActions.loadPostsSuccess({ posts });
    const state = postsFeature.reducer({ ...postsSlice, isLoading: true }, action);
    expect(state.posts).toEqual(posts);
    expect(state.isLoading).toBeFalse();
    expect(state.error).toBe('');
  });

  it('should set error and isLoading false on loadPostsFailure', () => {
    const action = PostsApiActions.loadPostsFailure({ errorMsg: 'Failed' });
    const state = postsFeature.reducer({ ...postsSlice, isLoading: true }, action);
    expect(state.error).toBe('Failed');
    expect(state.isLoading).toBeFalse();
    expect(state.posts).toEqual([]);
  });

  it('should reset state on reset', () => {
    const prevState: PostState = {
      posts: [{ id: 1, title: 'Test', body: 'Body', userId: 1 }],
      error: 'Some error',
      isLoading: true,
    };
    const action = PostsUserActions.clearPosts();
    const state = postsFeature.reducer(prevState, action);
    expect(state).toEqual(postsSlice);
  });
});
