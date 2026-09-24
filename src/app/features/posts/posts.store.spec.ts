import { type HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { type MockInstance } from 'vitest';
import {
  PostService,
  type Comment,
  type Post,
  type PostWithComments,
  type PostsResponse,
} from '../../services/post.service';
import { API_BASE_URL } from '../../tokens/api-url.token';
import { PostsStore } from './posts.store';

const makePost = (overrides: Partial<Post> = {}): Post => ({
  id: 'p1',
  title: 'Title',
  content: 'Content',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  author: { id: 'u1', name: 'Author', avatarUrl: null, role: 'user' },
  likes: 0,
  dislikes: 0,
  userReaction: null,
  commentsCount: 0,
  ...overrides,
});

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 'c1',
  content: 'Comment',
  postId: 'p1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  author: { id: 'u1', name: 'Author', avatarUrl: null, role: 'user' },
  likesCount: 0,
  dislikesCount: 0,
  userReaction: null,
  ...overrides,
});

const makePostsResponse = (overrides: Partial<PostsResponse> = {}): PostsResponse => ({
  posts: [],
  pagination: { page: 1, limit: 3, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
  ...overrides,
});

const makePage = (page: number, ids: string[], totalPages = 1): PostsResponse =>
  makePostsResponse({
    posts: ids.map((id) => makePost({ id })),
    pagination: {
      page,
      limit: 3,
      total: ids.length,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });

const makeFirstPage = (): PostsResponse =>
  makePostsResponse({
    posts: [makePost({ id: 'p1' }), makePost({ id: 'p2' })],
    pagination: { page: 1, limit: 3, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
  });

const makeDetail = (overrides: Partial<PostWithComments> = {}): PostWithComments => ({
  post: makePost(),
  comments: [makeComment()],
  ...overrides,
});

type ReactionResult = { success: boolean; likes: number; dislikes: number };

const createPostServiceMock = () => ({
  createPost: vi.fn(() => of({ post: makePost({ id: 'created' }) })),
  updatePost: vi.fn(() => of({ post: makePost({ id: 'updated' }) })),
  deletePost: vi.fn(() => of(undefined)),
  createComment: vi.fn(() => of({ comment: makeComment() })),
  updateComment: vi.fn(() => of({ comment: makeComment() })),
  deleteComment: vi.fn(() => of(undefined)),
  toggleReaction: vi.fn(() => of({ success: true, likes: 1, dislikes: 0 })),
});

const settle = () => TestBed.inject(ApplicationRef).whenStable();

const listMatcher =
  (page: number, limit: number) =>
  (req: HttpRequest<unknown>): boolean =>
    req.url === '/api/posts' &&
    req.params.get('page') === String(page) &&
    req.params.get('limit') === String(limit);

const anyListMatcher = (req: HttpRequest<unknown>): boolean => req.url === '/api/posts';

describe('PostsStore', () => {
  let store: InstanceType<typeof PostsStore>;
  let httpMock: HttpTestingController;
  let postService: ReturnType<typeof createPostServiceMock>;
  let listReloadSpy: MockInstance;
  let detailReloadSpy: MockInstance;

  const flushList = (
    page: number,
    limit: number,
    body: PostsResponse = makePostsResponse(),
  ): void => {
    TestBed.tick();
    httpMock.expectOne(listMatcher(page, limit)).flush(body);
  };

  const flushDetail = (postId: string, body: PostWithComments = makeDetail()): void => {
    TestBed.tick();
    httpMock.expectOne(`/api/posts/${postId}`).flush(body);
  };

  beforeEach(async () => {
    postService = createPostServiceMock();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: PostService, useValue: postService },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(PostsStore);

    // Первичная загрузка страницы 1 наполняет кэш и метаданные пагинации.
    flushList(1, 3, makeFirstPage());
    await settle();

    listReloadSpy = vi.spyOn(store.listRequest, 'reload');
    detailReloadSpy = vi.spyOn(store.detail, 'reload').mockReturnValue(true);
  });

  describe('cache and list loading', () => {
    it('caches the first page and exposes it through computed signals', () => {
      expect(store.page()).toBe(1);
      expect(store.limit()).toBe(3);
      expect(store.pages()[1].map((post) => post.id)).toEqual(['p1', 'p2']);
      expect(store.currentPageData().map((post) => post.id)).toEqual(['p1', 'p2']);
      expect(store.hasNextPage()).toBe(false);
      expect(store.hasPrevPage()).toBe(false);
      expect(store.totalPosts()).toBe(2);
      expect(store.isListLoading()).toBe(false);
      expect(store.listError()).toBeUndefined();
    });

    it('fetches a new page but serves a revisited page from cache', async () => {
      store.nextPage();
      TestBed.tick();

      // Новый визит: страница ещё не в кэше — спиннер включён.
      expect(store.isListLoading()).toBe(true);
      expect(store.currentPageData()).toEqual([]);
      expect(store.hasNextPage()).toBe(false);
      expect(store.hasPrevPage()).toBe(true);
      expect(store.totalPosts()).toBe(2);

      httpMock.expectOne(listMatcher(2, 3)).flush(makePage(2, ['p3'], 3));
      await settle();

      expect(store.isListLoading()).toBe(false);
      expect(store.currentPageData()[0].id).toBe('p3');
      // Метаданные пагинации обновляются из ответа.
      expect(store.totalPosts()).toBe(1);
      expect(store.hasNextPage()).toBe(true);

      // Возврат на закэшированную страницу: HTTP не идёт, данные доступны сразу.
      store.previousPage();
      TestBed.tick();

      expect(store.page()).toBe(1);
      expect(store.currentPageData().map((post) => post.id)).toEqual(['p1', 'p2']);
      expect(store.isListLoading()).toBe(false);
      expect(httpMock.match(anyListMatcher).length).toBe(0);

      await settle();
      expect(store.pages()[1]).toHaveLength(2);
    });

    it('caps the cache when it overflows (over-cap branch)', async () => {
      // 6 успешно загруженных страниц при MAX_CACHED_PAGES = 5.
      for (let page = 2; page <= 6; page += 1) {
        store.nextPage();
        flushList(page, 3, makePage(page, [`p${page}`], 6));
        await settle();
      }

      expect(store.page()).toBe(6);
      // Кэш не растёт сверх лимита: вытесняется страница, самая далёкая от текущей (1).
      expect(Object.keys(store.pages())).toHaveLength(5);
      expect(store.pages()[1]).toBeUndefined();
      expect(
        Object.keys(store.pages())
          .map(Number)
          .sort((a, b) => a - b),
      ).toEqual([2, 3, 4, 5, 6]);
    });

    it('surfaces an error when a page request fails', async () => {
      store.nextPage();
      TestBed.tick();
      expect(store.isListLoading()).toBe(true);

      httpMock
        .expectOne(listMatcher(2, 3))
        .flush('nope', { status: 500, statusText: 'Server Error' });
      await settle();

      expect(store.listError()).toMatchObject({ status: 500 });
      expect(store.isListLoading()).toBe(false);
      expect(store.currentPageData()).toEqual([]);
    });

    it('clears the cache and refetches page 1 when the limit changes', async () => {
      store.nextPage();
      flushList(2, 3, makePage(2, ['p3']));
      await settle();
      expect(Object.keys(store.pages())).toContain('2');

      store.setLimit(5);

      expect(store.limit()).toBe(5);
      expect(store.page()).toBe(1);
      expect(store.pages()).toEqual({});
      expect(store.totalPosts()).toBe(0);
      expect(store.currentPageData()).toEqual([]);

      flushList(1, 5, makePage(1, ['p9']));
      await settle();

      expect(store.currentPageData()[0].id).toBe('p9');
      expect(store.pages()[2]).toBeUndefined();
    });

    it('clears the cache and refetches page 1 on reset', async () => {
      store.nextPage();
      flushList(2, 3, makePage(2, ['p3']));
      await settle();
      store.previousPage();
      await settle();
      store.selectPost('p1');
      flushDetail('p1', makeDetail({ post: makePost({ id: 'p1' }) }));
      await settle();

      store.reset();

      expect(store.page()).toBe(1);
      expect(store.limit()).toBe(3);
      expect(store.totalPosts()).toBe(0);
      expect(store.selectedPostId()).toBeUndefined();
      expect(store.pages()).toEqual({});
      expect(listReloadSpy).toHaveBeenCalledTimes(1);

      flushList(1, 3, makeFirstPage());
      await settle();

      expect(store.currentPageData().map((post) => post.id)).toEqual(['p1', 'p2']);
    });
  });

  describe('pagination navigation', () => {
    it('increments the page and clamps previousPage at 1', async () => {
      store.nextPage();
      expect(store.page()).toBe(2);
      flushList(2, 3);
      await settle();

      store.previousPage();
      expect(store.page()).toBe(1);

      store.previousPage();
      expect(store.page()).toBe(1);
      await settle();
    });
  });

  describe('selectedPost', () => {
    it('prefers the loaded detail, then the cache, then undefined', async () => {
      store.selectPost('p1');
      expect(store.selectedPost()?.id).toBe('p1');

      flushDetail(
        'p1',
        makeDetail({ post: makePost({ id: 'p1', title: 'From detail' }), comments: [] }),
      );
      await settle();

      expect(store.selectedPost()?.title).toBe('From detail');
      expect(store.comments()).toEqual([]);

      store.detail.value.set(undefined);
      store.selectPost('ghost');
      expect(store.selectedPost()).toBeUndefined();
      expect(store.comments()).toEqual([]);

      store.selectPost(undefined);
      expect(store.selectedPost()).toBeUndefined();
    });

    it('finds a cached post across pages', async () => {
      store.nextPage();
      flushList(2, 3, makePage(2, ['p3']));
      await settle();

      store.selectPost('p3');
      expect(store.selectedPost()?.id).toBe('p3');
    });
  });

  describe('createPost', () => {
    it('inserts optimistically and replaces it with the server post', async () => {
      const serverPost = makePost({ id: 'srv' });
      postService.createPost.mockReturnValueOnce(of({ post: serverPost }));

      const pending = store.createPost({ title: 'New', content: 'Body' });

      const optimistic = store.currentPageData()[0];
      expect(optimistic.id).toMatch(/^optimistic-/);
      expect(optimistic.title).toBe('New');
      expect(optimistic.content).toBe('Body');
      expect(optimistic.author.name).toBe('You');
      expect(optimistic.createdAt).toBe(optimistic.updatedAt);
      expect(store.totalPosts()).toBe(3);

      await pending;

      expect(postService.createPost).toHaveBeenCalledWith({ title: 'New', content: 'Body' });
      expect(store.currentPageData()[0]).toBe(serverPost);
      expect(store.currentPageData().map((post) => post.id)).toEqual(['srv', 'p1', 'p2']);
      expect(listReloadSpy).not.toHaveBeenCalled();
    });

    it('does not insert when the current page is not cached', async () => {
      store.nextPage();
      postService.createPost.mockReturnValueOnce(of({ post: makePost({ id: 'srv' }) }));

      await store.createPost({ title: 'New', content: 'Body' });

      expect(store.pages()[2]).toBeUndefined();
      expect(Object.keys(store.pages())).toEqual(['1']);
      expect(listReloadSpy).not.toHaveBeenCalled();
    });

    it('restores the cache snapshot and rethrows on failure', async () => {
      const before = store.pages();
      const beforeTotal = store.total();
      postService.createPost.mockReturnValueOnce(throwError(() => new Error('boom')));

      await expect(store.createPost({ title: 'New', content: 'Body' })).rejects.toThrow('boom');

      expect(store.pages()).toBe(before);
      expect(store.total()).toBe(beforeTotal);
      expect(listReloadSpy).not.toHaveBeenCalled();
    });
  });

  describe('updatePost', () => {
    it('patches the post in every cached page and preserves the rest', async () => {
      store.nextPage();
      flushList(2, 3, makePage(2, ['p1', 'p3']));
      await settle();

      postService.updatePost.mockReturnValueOnce(of({ post: makePost({ id: 'p1' }) }));

      await store.updatePost('p1', { title: 'New', content: 'Body' });

      expect(store.pages()[1][0]).toMatchObject({ id: 'p1', title: 'New', content: 'Body' });
      expect(store.pages()[1][1].id).toBe('p2');
      expect(store.pages()[2][0]).toMatchObject({ id: 'p1', title: 'New' });
      expect(store.pages()[2][1].id).toBe('p3');
      // Деталь не выбрана — ветка "current отсутствует" не падает.
      expect(store.detail.value()).toBeUndefined();
      expect(listReloadSpy).not.toHaveBeenCalled();
    });

    it('updates the loaded detail when a post is selected', async () => {
      store.detail.value.set(makeDetail({ post: makePost({ id: 'p1', title: 'Old' }) }));
      postService.updatePost.mockReturnValueOnce(of({ post: makePost({ id: 'p1' }) }));

      await store.updatePost('p1', { title: 'New' });

      expect(store.detail.value()?.post.title).toBe('New');
    });

    it('restores pages and detail and rethrows on failure', async () => {
      const beforePages = store.pages();
      const beforeDetail = makeDetail({ post: makePost({ id: 'p1', title: 'Old' }) });
      store.detail.value.set(beforeDetail);
      postService.updatePost.mockReturnValueOnce(throwError(() => new Error('boom')));

      await expect(store.updatePost('p1', { title: 'New' })).rejects.toThrow('boom');

      expect(store.pages()).toBe(beforePages);
      expect(store.detail.value()).toBe(beforeDetail);
      expect(detailReloadSpy).not.toHaveBeenCalled();
    });
  });

  describe('deletePost', () => {
    it('removes the post from every cached page and decrements the total', async () => {
      store.nextPage();
      flushList(2, 3, makePage(2, ['p1', 'p3']));
      await settle();
      expect(store.totalPosts()).toBe(2);

      await store.deletePost('p1');

      expect(store.pages()[1].map((post) => post.id)).toEqual(['p2']);
      expect(store.pages()[2].map((post) => post.id)).toEqual(['p3']);
      expect(store.totalPosts()).toBe(1);
      expect(listReloadSpy).not.toHaveBeenCalled();
    });

    it('never drops the total below zero', async () => {
      store.setLimit(5);
      flushList(1, 5, makePage(1, [], 0));
      await settle();
      expect(store.totalPosts()).toBe(0);

      await store.deletePost('p1');

      expect(store.totalPosts()).toBe(0);
    });

    it('restores the cache snapshot and rethrows on failure', async () => {
      const before = store.pages();
      const beforeTotal = store.total();
      postService.deletePost.mockReturnValueOnce(throwError(() => new Error('boom')));

      await expect(store.deletePost('p1')).rejects.toThrow('boom');

      expect(store.pages()).toBe(before);
      expect(store.total()).toBe(beforeTotal);
      expect(listReloadSpy).not.toHaveBeenCalled();
    });
  });

  describe('createComment', () => {
    it('does nothing when no post is selected', async () => {
      await store.createComment('Hello');

      expect(postService.createComment).not.toHaveBeenCalled();
      expect(detailReloadSpy).not.toHaveBeenCalled();
      expect(store.comments()).toEqual([]);
    });

    it('creates a comment for the selected post and reloads the detail', async () => {
      store.selectPost('p1');
      flushDetail('p1', makeDetail({ post: makePost({ id: 'p1' }) }));
      await settle();

      await store.createComment('Hello');

      expect(postService.createComment).toHaveBeenCalledWith({ postId: 'p1', content: 'Hello' });
      expect(detailReloadSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateComment', () => {
    it('updates the comment in place and reloads when a post is selected', async () => {
      store.selectPost('p1');
      flushDetail(
        'p1',
        makeDetail({
          post: makePost({ id: 'p1' }),
          comments: [makeComment({ id: 'c1', content: 'Old' }), makeComment({ id: 'c2' })],
        }),
      );
      await settle();

      await store.updateComment('c1', 'New');

      expect(store.detail.value()?.comments[0]).toMatchObject({ id: 'c1', content: 'New' });
      expect(store.detail.value()?.comments[1].id).toBe('c2');
      expect(detailReloadSpy).toHaveBeenCalledTimes(1);
    });

    it('leaves an absent detail untouched', async () => {
      postService.updateComment.mockReturnValueOnce(of({ comment: makeComment({ id: 'c1' }) }));

      await store.updateComment('c1', 'New');

      expect(store.detail.value()).toBeUndefined();
      expect(detailReloadSpy).not.toHaveBeenCalled();
    });

    it('rolls back and rethrows on failure', async () => {
      const before = makeDetail({ comments: [makeComment({ id: 'c1', content: 'Old' })] });
      store.detail.value.set(before);
      postService.updateComment.mockReturnValueOnce(throwError(() => new Error('boom')));

      await expect(store.updateComment('c1', 'New')).rejects.toThrow('boom');

      expect(store.detail.value()).toBe(before);
      expect(detailReloadSpy).not.toHaveBeenCalled();
    });
  });

  describe('deleteComment', () => {
    it('removes the comment in place and reloads when a post is selected', async () => {
      store.selectPost('p1');
      flushDetail(
        'p1',
        makeDetail({
          post: makePost({ id: 'p1' }),
          comments: [makeComment({ id: 'c1' }), makeComment({ id: 'c2' })],
        }),
      );
      await settle();

      await store.deleteComment('c1');

      expect(store.detail.value()?.comments.map((comment) => comment.id)).toEqual(['c2']);
      expect(detailReloadSpy).toHaveBeenCalledTimes(1);
    });

    it('leaves an absent detail untouched', async () => {
      await store.deleteComment('c1');

      expect(store.detail.value()).toBeUndefined();
      expect(detailReloadSpy).not.toHaveBeenCalled();
    });

    it('rolls back and rethrows on failure', async () => {
      const before = makeDetail({ comments: [makeComment({ id: 'c1' })] });
      store.detail.value.set(before);
      postService.deleteComment.mockReturnValueOnce(throwError(() => new Error('boom')));

      await expect(store.deleteComment('c1')).rejects.toThrow('boom');

      expect(store.detail.value()).toBe(before);
      expect(detailReloadSpy).not.toHaveBeenCalled();
    });
  });

  describe('toggleReaction', () => {
    it('patches a post reaction across every cached page and the matching detail', async () => {
      store.nextPage();
      flushList(2, 3, makePage(2, ['p1']));
      await settle();
      store.detail.value.set(
        makeDetail({ post: makePost({ id: 'p1', likes: 1, dislikes: 1, userReaction: null }) }),
      );
      postService.toggleReaction.mockReturnValueOnce(of({ success: true, likes: 5, dislikes: 2 }));

      const result = await store.toggleReaction('post', 'p1', 1);

      expect(postService.toggleReaction).toHaveBeenCalledWith('post', 'p1', 1);
      expect(result).toEqual({ success: true, likes: 5, dislikes: 2 });
      expect(store.pages()[1][0]).toMatchObject({
        id: 'p1',
        likes: 5,
        dislikes: 2,
        userReaction: 1,
      });
      expect(store.pages()[2][0]).toMatchObject({
        id: 'p1',
        likes: 5,
        dislikes: 2,
        userReaction: 1,
      });
      expect(store.detail.value()?.post).toMatchObject({
        likes: 5,
        dislikes: 2,
        userReaction: 1,
      });
      expect(listReloadSpy).not.toHaveBeenCalled();
      expect(detailReloadSpy).not.toHaveBeenCalled();
    });

    it('clears a post reaction and leaves a non-matching detail untouched', async () => {
      store.detail.value.set(makeDetail({ post: makePost({ id: 'other', likes: 9 }) }));
      postService.toggleReaction.mockReturnValueOnce(of({ success: true, likes: 4, dislikes: 0 }));

      await store.toggleReaction('post', 'p1', 0);

      expect(store.currentPageData()[0]).toMatchObject({
        likes: 4,
        dislikes: 0,
        userReaction: null,
      });
      expect(store.detail.value()?.post).toMatchObject({ id: 'other', likes: 9 });
      expect(listReloadSpy).not.toHaveBeenCalled();
      expect(detailReloadSpy).not.toHaveBeenCalled();
    });

    it('applies a negative post reaction without a loaded detail', async () => {
      postService.toggleReaction.mockReturnValueOnce(of({ success: true, likes: 0, dislikes: 3 }));

      const result = await store.toggleReaction('post', 'p1', -1);

      expect(result).toEqual({ success: true, likes: 0, dislikes: 3 });
      expect(store.currentPageData()[0]).toMatchObject({
        dislikes: 3,
        userReaction: -1,
      });
      expect(store.detail.value()).toBeUndefined();
    });

    it('patches a comment reaction with a like', async () => {
      store.detail.value.set(
        makeDetail({
          comments: [makeComment({ id: 'c1', likesCount: 0 }), makeComment({ id: 'c2' })],
        }),
      );
      postService.toggleReaction.mockReturnValueOnce(of({ success: true, likes: 6, dislikes: 0 }));

      const result = await store.toggleReaction('comment', 'c1', 1);

      expect(postService.toggleReaction).toHaveBeenCalledWith('comment', 'c1', 1);
      expect(result).toEqual({ success: true, likes: 6, dislikes: 0 });
      expect(store.detail.value()?.comments[0]).toMatchObject({
        id: 'c1',
        likesCount: 6,
        dislikesCount: 0,
        userReaction: 'like',
      });
      expect(store.detail.value()?.comments[1]).toMatchObject({ id: 'c2', userReaction: null });
      expect(listReloadSpy).not.toHaveBeenCalled();
      expect(detailReloadSpy).not.toHaveBeenCalled();
    });

    it('patches a comment reaction with a dislike', async () => {
      store.detail.value.set(makeDetail({ comments: [makeComment({ id: 'c1' })] }));
      postService.toggleReaction.mockReturnValueOnce(of({ success: true, likes: 1, dislikes: 4 }));

      await store.toggleReaction('comment', 'c1', -1);

      expect(store.detail.value()?.comments[0]).toMatchObject({
        likesCount: 1,
        dislikesCount: 4,
        userReaction: 'dislike',
      });
    });

    it('clears a comment reaction', async () => {
      store.detail.value.set(
        makeDetail({ comments: [makeComment({ id: 'c1', userReaction: 'like' })] }),
      );
      postService.toggleReaction.mockReturnValueOnce(of({ success: true, likes: 0, dislikes: 0 }));

      await store.toggleReaction('comment', 'c1', 0);

      expect(store.detail.value()?.comments[0]).toMatchObject({
        likesCount: 0,
        dislikesCount: 0,
        userReaction: null,
      });
    });

    it('leaves an absent detail untouched for a comment target', async () => {
      postService.toggleReaction.mockReturnValueOnce(of({ success: true, likes: 2, dislikes: 3 }));

      const result = await store.toggleReaction('comment', 'c1', 1);

      expect(result).toEqual({ success: true, likes: 2, dislikes: 3 });
      expect(store.detail.value()).toBeUndefined();
    });

    it('applies an optimistic post patch before the request resolves, then reconciles', async () => {
      store.detail.value.set(
        makeDetail({ post: makePost({ id: 'p1', likes: 0, dislikes: 0, userReaction: null }) }),
      );
      const reaction$ = new Subject<ReactionResult>();
      postService.toggleReaction.mockReturnValueOnce(reaction$);

      const pending = store.toggleReaction('post', 'p1', 1);

      // Патч применён синхронно — ответа API ещё нет.
      expect(store.detail.value()?.post).toMatchObject({ likes: 1, dislikes: 0, userReaction: 1 });
      expect(store.currentPageData()[0]).toMatchObject({
        likes: 1,
        dislikes: 0,
        userReaction: 1,
      });

      reaction$.next({ success: true, likes: 10, dislikes: 1 });
      reaction$.complete();

      await expect(pending).resolves.toEqual({ success: true, likes: 10, dislikes: 1 });
      expect(store.detail.value()?.post).toMatchObject({ likes: 10, dislikes: 1, userReaction: 1 });
      expect(store.currentPageData()[0]).toMatchObject({
        likes: 10,
        dislikes: 1,
        userReaction: 1,
      });
    });

    it('restores the previous pages and detail and rethrows when a post reaction fails', async () => {
      const beforePages = store.pages();
      const beforeDetail = makeDetail({
        post: makePost({ id: 'p1', likes: 5, dislikes: 2, userReaction: 1 }),
      });
      store.detail.value.set(beforeDetail);
      postService.toggleReaction.mockReturnValueOnce(throwError(() => new Error('boom')));

      await expect(store.toggleReaction('post', 'p1', -1)).rejects.toThrow('boom');

      expect(store.pages()).toBe(beforePages);
      expect(store.detail.value()).toBe(beforeDetail);
    });

    it('restores the previous detail and rethrows when a comment reaction fails', async () => {
      const beforePages = store.pages();
      const beforeDetail = makeDetail({
        comments: [
          makeComment({ id: 'c1', likesCount: 2, dislikesCount: 5, userReaction: 'dislike' }),
        ],
      });
      store.detail.value.set(beforeDetail);
      postService.toggleReaction.mockReturnValueOnce(throwError(() => new Error('boom')));

      await expect(store.toggleReaction('comment', 'c1', 1)).rejects.toThrow('boom');

      expect(store.pages()).toBe(beforePages);
      expect(store.detail.value()).toBe(beforeDetail);
    });

    it('optimistically switches a post from like to dislike', async () => {
      store.detail.value.set(
        makeDetail({ post: makePost({ id: 'p1', likes: 5, dislikes: 2, userReaction: 1 }) }),
      );
      const reaction$ = new Subject<ReactionResult>();
      postService.toggleReaction.mockReturnValueOnce(reaction$);

      const pending = store.toggleReaction('post', 'p1', -1);

      expect(store.detail.value()?.post).toMatchObject({
        likes: 4,
        dislikes: 3,
        userReaction: -1,
      });

      reaction$.next({ success: true, likes: 4, dislikes: 3 });
      reaction$.complete();
      await pending;
    });

    it('optimistically clears a post like', async () => {
      store.detail.value.set(
        makeDetail({ post: makePost({ id: 'p1', likes: 5, dislikes: 2, userReaction: 1 }) }),
      );
      const reaction$ = new Subject<ReactionResult>();
      postService.toggleReaction.mockReturnValueOnce(reaction$);

      const pending = store.toggleReaction('post', 'p1', 0);

      expect(store.detail.value()?.post).toMatchObject({
        likes: 4,
        dislikes: 2,
        userReaction: null,
      });

      reaction$.next({ success: true, likes: 4, dislikes: 2 });
      reaction$.complete();
      await pending;
    });

    it('optimistically switches a post from dislike to like', async () => {
      store.detail.value.set(
        makeDetail({ post: makePost({ id: 'p1', likes: 2, dislikes: 5, userReaction: -1 }) }),
      );
      const reaction$ = new Subject<ReactionResult>();
      postService.toggleReaction.mockReturnValueOnce(reaction$);

      const pending = store.toggleReaction('post', 'p1', 1);

      expect(store.detail.value()?.post).toMatchObject({
        likes: 3,
        dislikes: 4,
        userReaction: 1,
      });

      reaction$.next({ success: true, likes: 3, dislikes: 4 });
      reaction$.complete();
      await pending;
    });

    it('optimistically switches a comment from like to dislike', async () => {
      store.detail.value.set(
        makeDetail({
          comments: [
            makeComment({ id: 'c1', likesCount: 5, dislikesCount: 2, userReaction: 'like' }),
          ],
        }),
      );
      const reaction$ = new Subject<ReactionResult>();
      postService.toggleReaction.mockReturnValueOnce(reaction$);

      const pending = store.toggleReaction('comment', 'c1', -1);

      expect(store.detail.value()?.comments[0]).toMatchObject({
        likesCount: 4,
        dislikesCount: 3,
        userReaction: 'dislike',
      });

      reaction$.next({ success: true, likes: 4, dislikes: 3 });
      reaction$.complete();
      await pending;
    });

    it('optimistically switches a comment from dislike to like', async () => {
      store.detail.value.set(
        makeDetail({
          comments: [
            makeComment({ id: 'c1', likesCount: 2, dislikesCount: 5, userReaction: 'dislike' }),
          ],
        }),
      );
      const reaction$ = new Subject<ReactionResult>();
      postService.toggleReaction.mockReturnValueOnce(reaction$);

      const pending = store.toggleReaction('comment', 'c1', 1);

      expect(store.detail.value()?.comments[0]).toMatchObject({
        likesCount: 3,
        dislikesCount: 4,
        userReaction: 'like',
      });

      reaction$.next({ success: true, likes: 3, dislikes: 4 });
      reaction$.complete();
      await pending;
    });

    it('optimistically clears a comment dislike', async () => {
      store.detail.value.set(
        makeDetail({
          comments: [
            makeComment({ id: 'c1', likesCount: 2, dislikesCount: 5, userReaction: 'dislike' }),
          ],
        }),
      );
      const reaction$ = new Subject<ReactionResult>();
      postService.toggleReaction.mockReturnValueOnce(reaction$);

      const pending = store.toggleReaction('comment', 'c1', 0);

      expect(store.detail.value()?.comments[0]).toMatchObject({
        likesCount: 2,
        dislikesCount: 4,
        userReaction: null,
      });

      reaction$.next({ success: true, likes: 2, dislikes: 4 });
      reaction$.complete();
      await pending;
    });

    it('defaults missing post counters to zero while optimistically patching', async () => {
      store.detail.value.set(
        makeDetail({
          post: makePost({
            id: 'p1',
            likes: undefined,
            dislikes: undefined,
            userReaction: undefined,
          }),
        }),
      );
      postService.toggleReaction.mockReturnValueOnce(of({ success: true, likes: 1, dislikes: 0 }));

      await store.toggleReaction('post', 'p1', 1);

      expect(store.detail.value()?.post).toMatchObject({
        likes: 1,
        dislikes: 0,
        userReaction: 1,
      });
    });

    it('defaults missing comment counters to zero while optimistically patching', async () => {
      store.detail.value.set(
        makeDetail({
          comments: [
            makeComment({
              id: 'c1',
              likesCount: undefined,
              dislikesCount: undefined,
              userReaction: undefined,
            }),
          ],
        }),
      );
      postService.toggleReaction.mockReturnValueOnce(of({ success: true, likes: 0, dislikes: 1 }));

      await store.toggleReaction('comment', 'c1', -1);

      expect(store.detail.value()?.comments[0]).toMatchObject({
        likesCount: 0,
        dislikesCount: 1,
        userReaction: 'dislike',
      });
    });
  });
});
