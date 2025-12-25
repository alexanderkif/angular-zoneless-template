import { createFeature, createReducer, on } from '@ngrx/store';
import { PostsApiActions, PostsUserActions } from './actions/';
import { Post } from '../../types/post';

export type PostState = {
  posts: Post[];
  error: string;
  isLoading: boolean;
  offset: number;
  limit: number;
};

const initialState: PostState = {
  posts: [],
  error: '',
  isLoading: false,
  offset: 0,
  limit: 3,
};

const postsReducer = createReducer(
  initialState,
  on(PostsUserActions.loadPosts, (state) => ({ ...state, isLoading: true })),
  on(PostsApiActions.loadPostsSuccess, (state, { posts }) => ({
    ...state,
    posts: [...state.posts, ...posts],
    offset: state.offset + posts.length,
    isLoading: false,
    error: '',
  })),
  on(PostsApiActions.loadPostsFailure, (state, { errorMsg }) => ({
    ...state,
    isLoading: false,
    error: errorMsg,
  })),
  on(PostsUserActions.clearPosts, (state) => ({
    ...state,
    posts: [],
    offset: 0,
    isLoading: false,
    error: '',
  }))
);

export const postsFeature = createFeature({
  name: 'postsSlice',
  reducer: postsReducer,
});

export const { selectPosts, selectError, selectIsLoading, selectOffset, selectLimit } = postsFeature;
