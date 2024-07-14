import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Post } from '../types/post';

const postsBaseURL = 'https://jsonplaceholder.typicode.com';

@Injectable({
  providedIn: 'root'
})
export class PostService {

  constructor(private http: HttpClient) { }

  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${postsBaseURL}/posts`);
  }

  getUser(id: number): Observable<Post> {
    return this.http.get<Post>(`${postsBaseURL}/posts/${id}`);
  }
}
