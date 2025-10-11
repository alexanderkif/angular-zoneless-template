import { createAction, props } from '@ngrx/store';

export const getUser = createAction('[Users] Get user', props<{ id: number }>());
export const exitUser = createAction('[Users] Exit user');
