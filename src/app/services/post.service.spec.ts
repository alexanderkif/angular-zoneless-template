import { TestBed } from '@angular/core/testing';

import { PostService } from './post.service';
import { HttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { Post } from '../types/post';
import { Observable, of } from 'rxjs';
import { getRandomInt } from '../utils/utils';

describe('PostService', () => {
  let service: PostService;
  let httpClientMock: { get: ReturnType<typeof vi.fn> };

  const mockPosts: Post[] = [
    { id: 1, title: 'Post 1', body: 'Body 1', userId: 1 },
    { id: 2, title: 'Post 2', body: 'Body 2', userId: 2 },
    { id: 3, title: 'Post 3', body: 'Body 3', userId: 3 },
    { id: 4, title: 'Post 4', body: 'Body 4', userId: 4 },
    { id: 5, title: 'Post 5', body: 'Body 5', userId: 5 },
  ];

  beforeEach(() => {
    httpClientMock = {
      get: vi.fn((url: string): Observable<Post | Post[] | null> => {
        if (url.includes('/posts/')) {
          const id = url.split('/posts/')[1] || null;
          return id
            ? of(mockPosts.find((post) => post.id.toString() === id) || null)
            : of(null);
        }
        if (url.includes('/posts?_limit=')) {
          const limit = +url.split('/posts?_limit=')[1].split('&')[0];
          const start = +url.split('&_start=')[1] || 0;
          return of(mockPosts.slice(start, limit + start));
        }
        return of(null);
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: HttpClient,
          useValue: httpClientMock,
        },
      ],
    });
    service = TestBed.inject(PostService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getPosts', () => {
    it('should fetch posts with a custom limit', () => {
      const limit = getRandomInt(1, mockPosts.length);
      const start = getRandomInt(0, mockPosts.length - limit);

      service.getPosts(start, limit).subscribe((posts) => {
        expect(posts).toEqual(mockPosts.slice(start, limit + start));
      });
    });
    it('should fetch posts with the default limit', () => {
      service.getPosts().subscribe((posts) => {
        expect(posts).toEqual(mockPosts.slice(0, 5));
      });
    });
  });

  describe('getPost', () => {
    it('should fetch a single post by ID', () => {
      const id = getRandomInt(1, mockPosts.length).toString();

      service.getPost(id).subscribe((post) => {
        expect(post).toEqual(mockPosts[+id - 1]);
      });
    });

    it('should return null if ID is null', () => {
      service.getPost(null).subscribe((post) => {
        expect(post).toBeNull();
      });
    });
  });
});
