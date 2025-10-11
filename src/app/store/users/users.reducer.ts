import { createFeature, createReducer, on } from '@ngrx/store';
import { UsersApiActions, UsersUserActions } from './actions/';
import { User } from '../../types/user';

export type UserState = {
  user: User | null;
  error: string;
  isLoading: boolean;
};

const initialState: UserState = {
  user: null,
  error: '',
  isLoading: false,
};

const usersReducer = createReducer(
  initialState,
  on(UsersUserActions.getUser, (state) => ({ ...state, isLoading: true })),
  on(UsersApiActions.getUserSuccess, (state, { user }) => ({
    ...state,
    user,
    isLoading: false,
    error: '',
  })),
  on(UsersApiActions.getUserFailure, (state, { errorMsg }) => ({
    ...state,
    user: null,
    isLoading: false,
    error: errorMsg,
  })),
  on(UsersUserActions.exitUser, (state) => ({ ...state, ...initialState }))
);

export const usersFeature = createFeature({
  name: 'usersSlice',
  reducer: usersReducer,
});

export const { selectUser, selectError, selectIsLoading } = usersFeature;
