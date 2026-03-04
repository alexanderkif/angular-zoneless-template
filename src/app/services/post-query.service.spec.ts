import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import {
  createPostDetailsQueryOptions,
  createPostQueryInjectionFactory,
  createPostsListQueryOptions,
  createPostsQueryInjectionFactory,
  PostQueryService,
} from './post-query.service';

describe('PostQueryService', () => {
  let service: PostQueryService;
  let httpMock: HttpTestingController;
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        PostQueryService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTanStackQuery(queryClient),
      ],
    });

    service = TestBed.inject(PostQueryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    queryClient.clear();
  });

  it('should fetch posts', async () => {
    const promise = service.fetchPosts(2, 5);

    const req = httpMock.expectOne('http://localhost:3000/api/posts?page=2&limit=5');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({
      posts: [],
      pagination: { page: 2, limit: 5, total: 0, totalPages: 0, hasNext: false, hasPrev: true },
    });

    const result = await promise;
    expect(result.pagination.page).toBe(2);
  });

  it('should fetch single post', async () => {
    const promise = service.fetchPost('p1');

    const req = httpMock.expectOne('http://localhost:3000/api/posts/p1');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ post: { id: 'p1' }, comments: [] });

    const result = await promise;
    expect(result.post.id).toBe('p1');
  });

  it('should prefetch next page', async () => {
    const promise = service.prefetchNextPage(1, 3);

    const req = httpMock.expectOne('http://localhost:3000/api/posts?page=2&limit=3');
    req.flush({
      posts: [],
      pagination: { page: 2, limit: 3, total: 0, totalPages: 0, hasNext: false, hasPrev: true },
    });

    await promise;
  });

  it('should prefetch previous page when page > 1', async () => {
    const promise = service.prefetchPreviousPage(3, 10);

    const req = httpMock.expectOne('http://localhost:3000/api/posts?page=2&limit=10');
    req.flush({
      posts: [],
      pagination: { page: 2, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: true },
    });

    await promise;
  });

  it('should skip prefetch previous page when page <= 1', async () => {
    await service.prefetchPreviousPage(1, 10);
  });

  it('should invalidate posts', async () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    await service.invalidatePosts();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['posts'] });
  });

  it('should invalidate specific post', async () => {
    const cancelSpy = vi.spyOn(queryClient, 'cancelQueries');
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await service.invalidatePost('post-1');

    expect(cancelSpy).toHaveBeenCalledWith({ queryKey: ['posts', 'detail', 'post-1'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['posts', 'detail', 'post-1'] });
  });

  it('should optimistically update post in list cache', () => {
    const key = ['posts', 'list', { page: 1, limit: 10 }] as const;
    queryClient.setQueryData(key as any[], {
      posts: [
        { id: 'p1', title: 'Old', content: 'Old content' },
        { id: 'p2', title: 'Two', content: 'Two content' },
      ],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
    });

    const previous = service.optimisticUpdatePostInList(
      'p1',
      { title: 'New', content: 'New content' },
      key,
    );

    expect(previous).toBeTruthy();
    const updated = queryClient.getQueryData<any>(key as any[]);
    expect(updated.posts[0].title).toBe('New');
    expect(updated.posts[1].title).toBe('Two');
  });

  it('should handle optimistic update with missing list cache', () => {
    const key = ['posts', 'list', { page: 9, limit: 9 }] as const;
    const previous = service.optimisticUpdatePostInList(
      'missing',
      { title: 'A', content: 'B' },
      key,
    );
    expect(previous).toBeUndefined();
  });

  it('should optimistically update post detail cache', () => {
    const key = ['posts', 'detail', 'p1'];
    queryClient.setQueryData(key, {
      post: {
        id: 'p1',
        title: 'Old',
        content: 'Old content',
        updatedAt: '2020-01-01T00:00:00.000Z',
      },
      comments: [],
    });

    const result = service.optimisticUpdatePostDetail('p1', {
      title: 'New',
      content: 'New content',
    });

    expect(result.previousData).toBeTruthy();
    expect(result.queryKey).toEqual(key);

    const updated = queryClient.getQueryData<any>(key);
    expect(updated.post.title).toBe('New');
    expect(updated.post.content).toBe('New content');
    expect(updated.post.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
  });

  it('should handle optimistic detail update with missing cache', () => {
    const result = service.optimisticUpdatePostDetail('missing', { title: 'X', content: 'Y' });
    expect(result.previousData).toBeUndefined();
    expect(result.queryKey).toEqual(['posts', 'detail', 'missing']);
  });

  it('should toggle reaction', async () => {
    const promise = service.toggleReaction('comment', 'c1', -1);

    const req = httpMock.expectOne('http://localhost:3000/api/reactions');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ targetType: 'comment', targetId: 'c1', reaction: -1 });
    req.flush({ success: true, likes: 0, dislikes: 1 });

    const result = await promise;
    expect(result).toEqual({ success: true, likes: 0, dislikes: 1 });
  });

  it('should build and execute list query options', async () => {
    const fetchPosts = vi.fn(async () => ({
      posts: [],
      pagination: { page: 3, limit: 7, total: 0, totalPages: 0, hasNext: false, hasPrev: true },
    }));

    const options = createPostsListQueryOptions(3, 7, fetchPosts);
    expect(options.queryKey).toEqual(['posts', 'list', { page: 3, limit: 7 }]);

    const result = await options.queryFn();
    expect(fetchPosts).toHaveBeenCalledWith(3, 7);
    expect(result.pagination.page).toBe(3);
  });

  it('should build post details query options with placeholder hit and miss', () => {
    const fetchPost = vi.fn(async () => ({ post: { id: 'p1' }, comments: [] }));

    queryClient.setQueryData(['posts', 'list', { page: 1, limit: 10 }], {
      posts: [{ id: 'p1', title: 'T', content: 'C' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
    });

    const options = createPostDetailsQueryOptions('p1', fetchPost, queryClient);
    expect(options.queryKey).toEqual(['posts', 'detail', 'p1']);
    expect(options.enabled).toBe(true);
    expect(options.placeholderData()).toEqual({
      post: { id: 'p1', title: 'T', content: 'C' },
      comments: [],
    });

    const missing = createPostDetailsQueryOptions('missing', fetchPost, queryClient);
    expect(missing.placeholderData()).toBeUndefined();

    const disabled = createPostDetailsQueryOptions('', fetchPost, queryClient);
    expect(disabled.enabled).toBe(false);
  });

  it('should create query handles in injection context', () => {
    const listHandle = TestBed.runInInjectionContext(() => service.postsQuery(1, 3));
    const detailsHandle = TestBed.runInInjectionContext(() => service.postQuery('p1'));

    expect(listHandle).toBeDefined();
    expect(detailsHandle).toBeDefined();
  });

  it('should create injection callback factories for post queries', () => {
    const fetchPosts = vi.fn(async () => ({
      posts: [],
      pagination: { page: 1, limit: 3, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
    }));
    const fetchPost = vi.fn(async () => ({ post: { id: 'p1' }, comments: [] }));

    const listFactory = createPostsQueryInjectionFactory(1, 3, fetchPosts);
    const detailsFactory = createPostQueryInjectionFactory('p1', fetchPost, queryClient);

    expect(listFactory().queryKey).toEqual(['posts', 'list', { page: 1, limit: 3 }]);
    expect(detailsFactory().queryKey).toEqual(['posts', 'detail', 'p1']);
  });
});
