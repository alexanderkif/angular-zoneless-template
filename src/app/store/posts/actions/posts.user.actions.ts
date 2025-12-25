import { createAction } from '@ngrx/store';

export const loadPosts = createAction(
  '[Posts Page] Load posts'
);

export const clearPosts = createAction('[Posts Page] Clear posts');
