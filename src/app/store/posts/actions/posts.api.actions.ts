import { createAction, props } from '@ngrx/store';
import { Post } from '../../../types/post';

export const loadPostsSuccess = createAction(
  '[Posts Page] Load posts success',
  props<{ posts: Post[] }>()
);

export const loadPostsFailure = createAction(
  '[Posts Page] Load posts failure',
  props<{ errorMsg: string }>()
);
