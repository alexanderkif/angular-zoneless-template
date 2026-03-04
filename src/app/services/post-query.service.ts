import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-url.token';
import type { Post, PostWithComments, PostsResponse } from './post.service';

export const createPostsListQueryOptions = (
  page: number,
  limit: number,
  fetchPosts: (page: number, limit: number) => Promise<PostsResponse>,
) => ({
  queryKey: ['posts', 'list', { page, limit }],
  queryFn: () => fetchPosts(page, limit),
  staleTime: 1000 * 60 * 5,
});

export const createPostDetailsQueryOptions = (
  id: string,
  fetchPost: (id: string) => Promise<PostWithComments>,
  queryClient: QueryClient,
) => ({
  queryKey: ['posts', 'detail', id],
  queryFn: () => fetchPost(id),
  enabled: !!id,
  staleTime: 1000 * 60 * 10,
  placeholderData: () => {
    const allQueries = queryClient.getQueryCache().findAll({ queryKey: ['posts', 'list'] });
    for (const query of allQueries) {
      const data = query.state.data as PostsResponse | undefined;
      const post = data?.posts?.find((p: Post) => p.id === id);
      if (post) {
        return { post, comments: [] };
      }
    }
    return undefined;
  },
});

export const createPostsQueryInjectionFactory =
  (
    page: number,
    limit: number,
    fetchPosts: (page: number, limit: number) => Promise<PostsResponse>,
  ) =>
  () =>
    createPostsListQueryOptions(page, limit, fetchPosts);

export const createPostQueryInjectionFactory =
  (id: string, fetchPost: (id: string) => Promise<PostWithComments>, queryClient: QueryClient) =>
  () =>
    createPostDetailsQueryOptions(id, fetchPost, queryClient);

/**
 * PostQueryService - Manages post queries using TanStack Query
 *
 * Features:
 * - Paginated posts with automatic caching per page
 * - Individual post caching with comments
 * - Prefetching next page for better UX
 */
@Injectable({
  providedIn: 'root',
})
export class PostQueryService {
  private http = inject(HttpClient);
  private queryClient = inject(QueryClient);
  private apiUrl = inject(API_BASE_URL);

  /**
   * Fetch posts data (used by reactive queries)
   */
  fetchPosts = async (page: number = 1, limit: number = 10): Promise<PostsResponse> => {
    const response = await lastValueFrom(
      this.http.get<PostsResponse>(`${this.apiUrl}/posts?page=${page}&limit=${limit}`, {
        withCredentials: true,
      }),
    );
    return response;
  };

  /**
   * Fetch single post with comments
   */
  fetchPost = async (id: string): Promise<PostWithComments> => {
    const response = await lastValueFrom(
      this.http.get<PostWithComments>(`${this.apiUrl}/posts/${id}`, {
        withCredentials: true,
      }),
    );
    return response;
  };

  /**
   * Query for getting paginated posts
   */
  postsQuery = (page: number = 1, limit: number = 10) =>
    injectQuery(createPostsQueryInjectionFactory(page, limit, this.fetchPosts));

  /**
   * Query for getting a single post with comments
   */
  postQuery = (id: string) =>
    injectQuery(createPostQueryInjectionFactory(id, this.fetchPost, this.queryClient));

  /**
   * Prefetch next page of posts
   */
  prefetchNextPage = async (currentPage: number, limit: number = 10) => {
    await this.queryClient.prefetchQuery({
      queryKey: ['posts', 'list', { page: currentPage + 1, limit }],
      queryFn: () => this.fetchPosts(currentPage + 1, limit),
    });
  };

  /**
   * Prefetch previous page of posts
   */
  prefetchPreviousPage = async (currentPage: number, limit: number = 10) => {
    if (currentPage <= 1) return;
    await this.queryClient.prefetchQuery({
      queryKey: ['posts', 'list', { page: currentPage - 1, limit }],
      queryFn: () => this.fetchPosts(currentPage - 1, limit),
    });
  };

  /**
   * Invalidate all posts queries
   */
  invalidatePosts = async () => {
    await this.queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  /**
   * Invalidate a specific post
   */
  invalidatePost = async (id: string) => {
    const queryKey = ['posts', 'detail', id];
    await this.queryClient.cancelQueries({ queryKey });
    this.queryClient.invalidateQueries({ queryKey });
  };

  /**
   * Optimistically update post in list cache
   */
  optimisticUpdatePostInList = (
    postId: string,
    updates: { title: string; content: string },
    queryKey: readonly any[],
  ) => {
    const previousData = this.queryClient.getQueryData<PostsResponse>(queryKey as any[]);

    this.queryClient.setQueryData<PostsResponse>(queryKey as any[], (oldData) => {
      if (!oldData) return oldData;

      return {
        posts: oldData.posts.map((post) => (post.id === postId ? { ...post, ...updates } : post)),
        pagination: oldData.pagination,
      };
    });

    return previousData;
  };

  /**
   * Optimistically update post in detail cache
   */
  optimisticUpdatePostDetail = (postId: string, updates: { title: string; content: string }) => {
    const queryKey = ['posts', 'detail', postId];
    const previousData = this.queryClient.getQueryData<PostWithComments>(queryKey);

    this.queryClient.setQueryData<PostWithComments>(queryKey, (oldData) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        post: { ...oldData.post, ...updates, updatedAt: new Date().toISOString() },
      };
    });

    return { previousData, queryKey };
  };

  /**
   * Toggle reaction on a post or comment
   */
  toggleReaction = async (
    targetType: 'post' | 'comment',
    targetId: string,
    reaction: 1 | -1 | 0,
  ): Promise<{ success: boolean; likes: number; dislikes: number }> => {
    const response = await lastValueFrom(
      this.http.post<{ success: boolean; likes: number; dislikes: number }>(
        `${this.apiUrl}/reactions`,
        { targetType, targetId, reaction },
        { withCredentials: true },
      ),
    );
    return response;
  };
}
