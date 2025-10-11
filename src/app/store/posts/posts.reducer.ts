import { createFeature, createReducer, on } from '@ngrx/store';
import { PostsApiActions, PostsUserActions } from './actions/';
import { Post } from '../../types/post';

export type PostState = {
  posts: Post[];
  error: string;
  isLoading: boolean;
};

const initialState: PostState = {
  posts: [],
  error: '',
  isLoading: false,
};

const postsReducer = createReducer(
  initialState,
  on(PostsUserActions.loadPosts, (state) => ({ ...state, isLoading: true })),
  on(PostsApiActions.loadPostsSuccess, (state, { posts }) => ({
    ...state,
    posts,
    isLoading: false,
    error: '',
  })),
  on(PostsApiActions.loadPostsFailure, (state, { errorMsg }) => ({
    ...state,
    posts: [],
    isLoading: false,
    error: errorMsg,
  })),
  on(PostsUserActions.clearPosts, (state) => ({
    ...state,
    posts: [],
    isLoading: false,
    error: '',
  }))
);

export const postsFeature = createFeature({
  name: 'postsSlice',
  reducer: postsReducer,
});

export const { selectPosts, selectError, selectIsLoading } = postsFeature;
