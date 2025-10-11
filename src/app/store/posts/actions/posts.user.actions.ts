import { createAction, props } from '@ngrx/store';

export const loadPosts = createAction('[Posts Page] Load posts', props<{ limit: number }>());

export const clearPosts = createAction('[Posts Page] Clear posts');
