import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { of } from 'rxjs';
import {
  createCreatePostMutationOptions,
  createCreatePostMutationInjectionFactory,
  createDeletePostMutationOptions,
  createDeletePostMutationInjectionFactory,
  createPostsListQueryKey,
  createPostsListQueryOptions,
  createPostsListQueryInjectionFactory,
  createUpdatePostMutationOptions,
  createUpdatePostMutationInjectionFactory,
  PostsListComponent,
} from './posts-list.component';

describe('PostsListComponent', () => {
  let component: PostsListComponent;
  let fixture: ComponentFixture<PostsListComponent>;
  let queryClient: QueryClient;

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    await TestBed.configureTestingModule({
      imports: [PostsListComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTanStackQuery(queryClient),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostsListComponent);
    component = fixture.componentInstance;
    // scrollIntoView is not implemented in JSDOM
    Element.prototype.scrollIntoView = vi.fn();
    fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have postsQuery', () => {
    expect(component.postsQuery).toBeDefined();
  });

  it('should have createPostMutation', () => {
    expect(component.createPostMutation).toBeDefined();
  });

  it('should toggle post form visibility', () => {
    expect(component.showPostForm()).toBe(false);
    component.openPostForm();
    expect(component.showPostForm()).toBe(true);
    component.closePostForm();
    expect(component.showPostForm()).toBe(false);
  });

  it('should open form in create mode', () => {
    component.editingPost.set({ id: 'x' } as any);
    component.openPostForm();

    expect(component.editingPost()).toBeNull();
    expect(component.showPostForm()).toBe(true);
  });

  it('should go to next page when hasNext is true', () => {
    const nextSpy = vi.spyOn(component.uiStore, 'nextPostsPage');
    const prefetchSpy = vi.spyOn((component as any).postQueryService, 'prefetchNextPage');

    (component as any).postsQuery = {
      data: vi.fn(() => ({
        posts: [],
        pagination: {
          page: 1,
          limit: 3,
          total: 10,
          totalPages: 4,
          hasNext: true,
          hasPrev: false,
        },
      })),
    };

    component.goToNextPage();

    expect(nextSpy).toHaveBeenCalled();
    expect(prefetchSpy).toHaveBeenCalled();
  });

  it('should not go to next page when hasNext is false', () => {
    const nextSpy = vi.spyOn(component.uiStore, 'nextPostsPage');

    (component as any).postsQuery = {
      data: vi.fn(() => ({
        posts: [],
        pagination: {
          page: 1,
          limit: 3,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      })),
    };

    component.goToNextPage();

    expect(nextSpy).not.toHaveBeenCalled();
  });

  it('should go to previous page when current page > 1', () => {
    const prevSpy = vi.spyOn(component.uiStore, 'prevPostsPage');
    const prefetchSpy = vi.spyOn((component as any).postQueryService, 'prefetchPreviousPage');
    vi.spyOn(component.uiStore, 'postsPage').mockReturnValue(2);

    component.goToPreviousPage();

    expect(prevSpy).toHaveBeenCalled();
    expect(prefetchSpy).toHaveBeenCalled();
  });

  it('should create post in handleSavePost when not editing', () => {
    const mutate = vi.fn();
    (component as any).createPostMutation = { mutate };
    component.editingPost.set(null);

    component.handleSavePost({ title: 'T', content: 'C' });

    expect(mutate).toHaveBeenCalledWith({ title: 'T', content: 'C' });
  });

  it('should update post in handleSavePost when editing', () => {
    const mutate = vi.fn();
    (component as any).updatePostMutation = { mutate };
    component.editingPost.set({ id: 'p1' } as any);

    component.handleSavePost({ title: 'T2', content: 'C2' });

    expect(mutate).toHaveBeenCalledWith({ id: 'p1', data: { title: 'T2', content: 'C2' } });
  });

  it('should set editing post in handleEditPost', () => {
    const post = { id: 'p100' } as any;

    component.handleEditPost(post);

    expect(component.editingPost()).toBe(post);
    expect(component.showPostForm()).toBe(true);
  });

  it('should open and confirm delete post dialog', () => {
    const mutate = vi.fn();
    (component as any).deletePostMutation = { mutate };

    component.handleDeletePost('p-del');
    expect(component.deleteDialogPostId()).toBe('p-del');

    component.confirmDeletePost();

    expect(mutate).toHaveBeenCalledWith('p-del');
    expect(component.deleteDialogPostId()).toBeNull();
  });

  it('should close delete post dialog without deletion', () => {
    const mutate = vi.fn();
    (component as any).deletePostMutation = { mutate };

    component.handleDeletePost('p-del');
    component.closeDeleteDialog();

    expect(mutate).not.toHaveBeenCalled();
    expect(component.deleteDialogPostId()).toBeNull();
  });

  it('should ignore confirmDeletePost when dialog is closed', () => {
    const mutate = vi.fn();
    (component as any).deletePostMutation = { mutate };

    component.confirmDeletePost();

    expect(mutate).not.toHaveBeenCalled();
  });

  it('should create posts list query key and options', async () => {
    const uiStoreMock = {
      postsPage: vi.fn(() => 2),
      postsLimit: vi.fn(() => 5),
    } as any;
    const postQueryServiceMock = {
      fetchPosts: vi.fn(async () => ({ posts: [], pagination: { hasNext: false } })),
    } as any;

    const key = createPostsListQueryKey(uiStoreMock);
    expect(key).toEqual(['posts', 'list', { page: 2, limit: 5 }]);

    const options = createPostsListQueryOptions(postQueryServiceMock, uiStoreMock);
    expect(options.queryKey).toEqual(key);
    await options.queryFn();
    expect(postQueryServiceMock.fetchPosts).toHaveBeenCalledWith(2, 5);
  });

  it('should execute create post mutation options success flow', async () => {
    const postServiceMock = {
      createPost: vi.fn(() => of({ post: { id: 'p1' } })),
    } as any;
    const postQueryServiceMock = { invalidatePosts: vi.fn() } as any;
    const showPostForm = { set: vi.fn() } as any;
    const getPostsQueryKey = () => ['posts', 'list', { page: 1, limit: 3 }] as const;
    const setIsCreateSyncPending = vi.fn();
    const updaterResults: any[] = [];
    const setQueryData = vi.fn((queryKey: unknown, updater: unknown) => {
      if (typeof updater === 'function') {
        updaterResults.push(
          updater({
            posts: [],
            pagination: {
              page: 1,
              limit: 3,
              total: 0,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          }),
          updater({}),
        );
      }
      return undefined;
    });
    const mutationClient = {
      cancelQueries: vi.fn(async () => {}),
      getQueryData: vi.fn(() => ({ posts: [], pagination: { total: 0 } })),
      setQueryData,
    } as any;

    const options = createCreatePostMutationOptions(
      postServiceMock,
      postQueryServiceMock,
      showPostForm,
      getPostsQueryKey,
      () => ({
        id: 'u1',
        email: 'u1@test.dev',
        name: 'User One',
        avatarUrl: null,
        provider: 'email',
        emailVerified: true,
        role: 'user',
      }),
      setIsCreateSyncPending,
    );
    await options.mutationFn({ title: 'T', content: 'C' });

    expect(postServiceMock.createPost).toHaveBeenCalledWith({ title: 'T', content: 'C' });

    const onMutateResult = await options.onMutate(
      { title: 'T', content: 'C' },
      { client: mutationClient },
    );
    expect(mutationClient.cancelQueries).toHaveBeenCalledWith({ queryKey: getPostsQueryKey() });
    expect(mutationClient.getQueryData).toHaveBeenCalledWith(getPostsQueryKey());
    expect(showPostForm.set).toHaveBeenCalledWith(false);
    expect(setIsCreateSyncPending).toHaveBeenCalledWith(true);
    expect(onMutateResult?.queryKey).toEqual(getPostsQueryKey());
    expect(updaterResults[0]?.pagination?.total).toBe(1);
    expect(updaterResults[1]).toEqual({});

    const successUpdaterResults: any[] = [];
    const successSetQueryData = vi.fn((queryKey: unknown, updater: unknown) => {
      if (typeof updater === 'function') {
        successUpdaterResults.push(
          updater({
            posts: [{ id: onMutateResult?.optimisticId }, { id: 'p-2' }],
            pagination: {
              page: 1,
              limit: 3,
              total: 2,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          }),
          updater({}),
        );
      }
      return undefined;
    });
    options.onSuccess(
      {
        post: {
          id: 'p1',
          title: 'T',
          content: 'C',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: {
            id: 'u1',
            name: 'User One',
            email: 'u1@test.dev',
            avatarUrl: null,
            role: 'user',
          },
        },
      },
      { title: 'T', content: 'C' },
      onMutateResult,
      { client: { setQueryData: successSetQueryData } } as any,
    );
    expect(successSetQueryData).toHaveBeenCalled();
    expect(successUpdaterResults[0].posts[0].id).toBe('p1');
    expect(successUpdaterResults[1]).toEqual({});
    expect(postQueryServiceMock.invalidatePosts).toHaveBeenCalled();

    const rollbackSetQueryData = vi.fn();
    options.onError(new Error('x'), { title: 'T', content: 'C' }, onMutateResult, {
      client: { setQueryData: rollbackSetQueryData },
    } as any);
    expect(rollbackSetQueryData).toHaveBeenCalledWith(
      getPostsQueryKey(),
      onMutateResult?.previousPosts,
    );

    options.onError(new Error('x'), { title: 'T', content: 'C' }, undefined, {
      client: { setQueryData: rollbackSetQueryData },
    } as any);

    options.onSuccess(
      {
        post: {
          id: 'p2',
          title: 'T2',
          content: 'C2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: {
            id: 'u2',
            name: 'User Two',
            email: 'u2@test.dev',
            avatarUrl: null,
            role: 'user',
          },
        },
      },
      { title: 'T2', content: 'C2' },
      undefined,
      { client: { setQueryData: successSetQueryData } } as any,
    );

    options.onSettled();
    expect(setIsCreateSyncPending).toHaveBeenCalledWith(false);
  });

  it('should use fallback optimistic author when current user is missing', async () => {
    const postServiceMock = {
      createPost: vi.fn(() => of({ post: { id: 'p1' } })),
    } as any;
    const postQueryServiceMock = { invalidatePosts: vi.fn() } as any;
    const showPostForm = { set: vi.fn() } as any;
    const getPostsQueryKey = () => ['posts', 'list', { page: 1, limit: 3 }] as const;
    const setIsCreateSyncPending = vi.fn();
    let capturedOptimistic: any;
    const mutationClient = {
      cancelQueries: vi.fn(async () => {}),
      getQueryData: vi.fn(() => ({ posts: [], pagination: { total: 0 } })),
      setQueryData: vi.fn((queryKey: unknown, updater: unknown) => {
        if (typeof updater === 'function') {
          capturedOptimistic = updater({
            posts: [],
            pagination: {
              page: 1,
              limit: 3,
              total: 0,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          });
        }
        return undefined;
      }),
    } as any;

    const options = createCreatePostMutationOptions(
      postServiceMock,
      postQueryServiceMock,
      showPostForm,
      getPostsQueryKey,
      () => null,
      setIsCreateSyncPending,
    );

    await options.onMutate({ title: 'Fallback', content: 'Post' }, { client: mutationClient });

    expect(capturedOptimistic.posts[0].author.id).toBe('optimistic-user');
    expect(capturedOptimistic.posts[0].author.name).toBe('You');
    expect(capturedOptimistic.posts[0].author.role).toBe('user');
  });

  it('should execute update post mutation options callbacks', async () => {
    const postServiceMock = {
      updatePost: vi.fn(() => of({ post: { id: 'p1', title: 'N', content: 'NC' } })),
    } as any;
    const postQueryServiceMock = {
      optimisticUpdatePostInList: vi.fn(() => ({ old: true })),
      invalidatePosts: vi.fn(),
    } as any;
    const showPostForm = { set: vi.fn() } as any;
    const editingPost = { set: vi.fn() } as any;
    const getPostsQueryKey = () => ['posts', 'list', { page: 1, limit: 3 }] as const;

    const options = createUpdatePostMutationOptions(
      postServiceMock,
      postQueryServiceMock,
      showPostForm,
      editingPost,
      getPostsQueryKey,
    );

    await options.mutationFn({ id: 'p1', data: { title: 'N', content: 'NC' } });
    expect(postServiceMock.updatePost).toHaveBeenCalledWith('p1', { title: 'N', content: 'NC' });

    const cancelQueries = vi.fn(async () => {});
    const onMutateResult = await options.onMutate(
      { id: 'p1', data: { title: 'N', content: 'NC' } },
      { client: { cancelQueries } },
    );

    expect(showPostForm.set).toHaveBeenCalledWith(false);
    expect(editingPost.set).toHaveBeenCalledWith(null);
    expect(cancelQueries).toHaveBeenCalledWith({ queryKey: getPostsQueryKey() });
    expect(onMutateResult).toEqual({ previousPosts: { old: true } });

    const setQueryData = vi.fn();
    options.onError(
      new Error('x'),
      {},
      { previousPosts: { cached: true } },
      { client: { setQueryData } },
    );
    expect(setQueryData).toHaveBeenCalledWith(getPostsQueryKey(), { cached: true });

    options.onSettled();
    expect(postQueryServiceMock.invalidatePosts).toHaveBeenCalled();

    const setQueryDataNoPrev = vi.fn();
    options.onError(new Error('x'), {}, undefined, {
      client: { setQueryData: setQueryDataNoPrev },
    });
    expect(setQueryDataNoPrev).not.toHaveBeenCalled();
  });

  it('should execute delete post mutation options success flow', async () => {
    const postServiceMock = { deletePost: vi.fn(() => of(void 0)) } as any;
    const postQueryServiceMock = { invalidatePosts: vi.fn() } as any;
    const getPostsQueryKey = () => ['posts', 'list', { page: 1, limit: 3 }] as const;
    const deleteUpdaterResults: any[] = [];
    const contextClient = {
      cancelQueries: vi.fn(async () => {}),
      getQueryData: vi.fn(() => ({ posts: [{ id: 'p-del' }, { id: 'p-2' }] })),
      setQueryData: vi.fn((queryKey: unknown, updater: unknown) => {
        if (typeof updater === 'function') {
          deleteUpdaterResults.push(
            updater({ posts: [{ id: 'p-del' }, { id: 'p-2' }] }),
            updater({}),
          );
        }
        return undefined;
      }),
    } as any;

    const options = createDeletePostMutationOptions(
      postServiceMock,
      postQueryServiceMock,
      getPostsQueryKey,
    );
    await options.mutationFn('p-del');
    expect(postServiceMock.deletePost).toHaveBeenCalledWith('p-del');

    const onMutateResult = await options.onMutate('p-del', { client: contextClient });
    expect(contextClient.cancelQueries).toHaveBeenCalledWith({ queryKey: getPostsQueryKey() });
    expect(contextClient.getQueryData).toHaveBeenCalledWith(getPostsQueryKey());
    expect(onMutateResult).toEqual({
      previousPosts: { posts: [{ id: 'p-del' }, { id: 'p-2' }] },
      queryKey: getPostsQueryKey(),
    });
    expect(deleteUpdaterResults[0]).toEqual({ posts: [{ id: 'p-2' }] });
    expect(deleteUpdaterResults[1]).toEqual({});

    const rollbackClient = { setQueryData: vi.fn() } as any;
    options.onError(new Error('x'), 'p-del', onMutateResult, { client: rollbackClient });
    expect(rollbackClient.setQueryData).toHaveBeenCalledWith(getPostsQueryKey(), {
      posts: [{ id: 'p-del' }, { id: 'p-2' }],
    });

    options.onError(new Error('x'), 'p-del', undefined, { client: rollbackClient });

    options.onSettled();
    expect(postQueryServiceMock.invalidatePosts).toHaveBeenCalled();
  });

  it('should not go to previous page when already on first page', () => {
    const prevSpy = vi.spyOn(component.uiStore, 'prevPostsPage');
    const prefetchSpy = vi.spyOn((component as any).postQueryService, 'prefetchPreviousPage');
    vi.spyOn(component.uiStore, 'postsPage').mockReturnValue(1);

    component.goToPreviousPage();

    expect(prevSpy).not.toHaveBeenCalled();
    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it('should expose internal posts query key helper', () => {
    const key = (component as any).getPostsQueryKey();
    expect(key[0]).toBe('posts');
    expect(key[1]).toBe('list');
  });

  it('should create and execute injection factories for query and mutations', () => {
    const uiStoreMock = { postsPage: vi.fn(() => 1), postsLimit: vi.fn(() => 3) } as any;
    const postQueryServiceMock = {
      fetchPosts: vi.fn(async () => ({ posts: [], pagination: { hasNext: false } })),
      invalidatePosts: vi.fn(),
      optimisticUpdatePostInList: vi.fn(),
    } as any;
    const postServiceMock = {
      createPost: vi.fn(),
      updatePost: vi.fn(),
      deletePost: vi.fn(),
    } as any;
    const showPostForm = { set: vi.fn() } as any;
    const editingPost = { set: vi.fn() } as any;
    const getPostsQueryKey = () => ['posts', 'list', { page: 1, limit: 3 }] as const;
    const setIsCreateSyncPending = vi.fn();

    const queryFactory = createPostsListQueryInjectionFactory(postQueryServiceMock, uiStoreMock);
    const createFactory = createCreatePostMutationInjectionFactory(
      postServiceMock,
      postQueryServiceMock,
      showPostForm,
      getPostsQueryKey,
      () => null,
      setIsCreateSyncPending,
    );
    const updateFactory = createUpdatePostMutationInjectionFactory(
      postServiceMock,
      postQueryServiceMock,
      showPostForm,
      editingPost,
      getPostsQueryKey,
    );
    const deleteFactory = createDeletePostMutationInjectionFactory(
      postServiceMock,
      postQueryServiceMock,
      getPostsQueryKey,
    );

    expect(queryFactory().queryKey).toEqual(['posts', 'list', { page: 1, limit: 3 }]);
    expect(typeof createFactory().mutationFn).toBe('function');
    expect(typeof updateFactory().mutationFn).toBe('function');
    expect(typeof deleteFactory().mutationFn).toBe('function');
  });

  it('should run real create mutation and update submitting state', async () => {
    const postService = (component as any).postService;
    const postQueryService = (component as any).postQueryService;

    vi.spyOn(postService, 'createPost').mockReturnValueOnce(
      of({
        post: {
          id: 'p-new',
          title: 'Created',
          content: 'Content',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: {
            id: 'u1',
            name: 'User One',
            email: 'u1@test.dev',
            avatarUrl: null,
            role: 'user',
          },
        },
      }),
    );
    const invalidateSpy = vi
      .spyOn(postQueryService, 'invalidatePosts')
      .mockResolvedValueOnce(undefined);

    const userDataSpy = vi.fn(() => ({
      id: 'u1',
      name: 'User One',
      email: 'u1@test.dev',
      avatarUrl: null,
      role: 'user',
    }));
    (component as any).currentUserQuery = { data: userDataSpy };

    const pendingSetSpy = vi.spyOn((component as any).isCreateSyncPending, 'set');

    component.handleSavePost({ title: 'Created', content: 'Content' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(userDataSpy).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalled();
    expect(pendingSetSpy).toHaveBeenCalledWith(true);
    expect(pendingSetSpy).toHaveBeenCalledWith(false);
    expect(component.isPostFormSubmitting()).toBe(false);
  });
});
