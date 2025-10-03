import { selectPostsLength } from './posts.selector';
import { PostState } from './posts.reducer';

describe('Posts Selectors', () => {
  it('should select the length of posts', () => {
    const state = {
      postsSlice: {
        posts: [
          { id: 1, title: 'A', body: 'B', userId: 1 },
          { id: 2, title: 'C', body: 'D', userId: 2 },
        ],
        error: '',
        isLoading: false,
      },
    };
    const result = selectPostsLength.projector(state.postsSlice.posts);
    expect(result).toBe(2);
  });
});
