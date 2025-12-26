import { createSelector } from '@ngrx/store';
import { Post } from '../../services/post.service';
import { selectPosts } from './posts.reducer';

export const selectPostsLength = createSelector(
  selectPosts,
  (posts: Post[]) => posts.length
);
