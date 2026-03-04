import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PostService } from './post.service';

describe('PostService', () => {
  let service: PostService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        PostService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PostService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create post', () => {
    service.createPost({ title: 'T', content: 'C' }).subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/posts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'T', content: 'C' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ post: { id: '1' } });
  });

  it('should update post', () => {
    service.updatePost('p1', { title: 'TT' }).subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/posts/p1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ title: 'TT' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ post: { id: 'p1' } });
  });

  it('should delete post', () => {
    service.deletePost('p2').subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/posts/p2');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('should create comment', () => {
    service.createComment({ postId: 'p1', content: 'comment' }).subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/comments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ postId: 'p1', content: 'comment' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ comment: { id: 'c1' } });
  });

  it('should update comment', () => {
    service.updateComment('c1', { content: 'updated' }).subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/comments/c1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ content: 'updated' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ comment: { id: 'c1' } });
  });

  it('should delete comment', () => {
    service.deleteComment('c2').subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/comments/c2');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });
});
