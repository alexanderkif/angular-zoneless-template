import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-url.token';

export interface Author {
  id: string;
  name: string;
  email?: string;
  avatarUrl: string | null;
  role?: 'user' | 'admin';
}

export interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: Author;
  likes?: number;
  dislikes?: number;
  userReaction?: 1 | -1 | null;
  commentsCount?: number;
}

export interface Comment {
  id: string;
  content: string;
  postId: string;
  createdAt: string;
  updatedAt: string;
  author: Author;
  likesCount?: number;
  dislikesCount?: number;
  userReaction?: 'like' | 'dislike' | null;
}

export interface PostWithComments {
  post: Post;
  comments: Comment[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PostsResponse {
  posts: Post[];
  pagination: PaginationMeta;
}

export interface CreatePostDto {
  title: string;
  content: string;
}

export interface UpdatePostDto {
  title?: string;
  content?: string;
}

export interface CreateCommentDto {
  postId: string;
  content: string;
}

export interface UpdateCommentDto {
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class PostService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);

  createPost(data: CreatePostDto): Observable<{ post: Post }> {
    return this.http.post<{ post: Post }>(`${this.baseUrl}/posts`, data, {
      withCredentials: true,
    });
  }

  updatePost(id: string, data: UpdatePostDto): Observable<{ post: Post }> {
    return this.http.put<{ post: Post }>(`${this.baseUrl}/posts/${id}`, data, {
      withCredentials: true,
    });
  }

  deletePost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/posts/${id}`, {
      withCredentials: true,
    });
  }

  createComment(data: CreateCommentDto): Observable<{ comment: Comment }> {
    return this.http.post<{ comment: Comment }>(`${this.baseUrl}/comments`, data, {
      withCredentials: true,
    });
  }

  updateComment(id: string, data: UpdateCommentDto): Observable<{ comment: Comment }> {
    return this.http.put<{ comment: Comment }>(`${this.baseUrl}/comments/${id}`, data, {
      withCredentials: true,
    });
  }

  deleteComment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/comments/${id}`, {
      withCredentials: true,
    });
  }
}
