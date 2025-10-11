import { createAction, props } from '@ngrx/store';
import { User } from '../../../types/user';

export const getUserSuccess = createAction('[Users] Get user success', props<{ user: User }>());
export const getUserFailure = createAction(
  '[Users] Get user failure',
  props<{ errorMsg: string }>()
);
