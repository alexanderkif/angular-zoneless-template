import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
}

export const postsBaseURL = 'https://jsonplaceholder.typicode.com';

@Injectable({
  providedIn: 'root',
})
export class PostService {
  constructor(private http: HttpClient) {}

  getPosts(start: number = 0, limit: number = 5): Observable<Post[]> {
    return this.http.get<Post[]>(`${postsBaseURL}/posts?_limit=${limit}&_start=${start}`);
  }

  getPost(id: string | null): Observable<Post | null> {
    return id ? this.http.get<Post>(`${postsBaseURL}/posts/${id}`) : of(null);
  }
}
