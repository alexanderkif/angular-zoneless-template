import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { of, throwError } from 'rxjs';
import { AuthQueryService } from '../../services/auth-query.service';
import { PostService } from '../../services/post.service';
import {
  createCommentMutationOptions,
  createDeleteCommentMutationOptions,
  createDeletePostMutationOptions,
  createReactToCommentMutationOptions,
  resolvePostId,
  createUpdateCommentMutationOptions,
  createUpdatePostMutationOptions,
  PostDetailsComponent,
} from './post-details.component';

describe('PostDetailsComponent', () => {
  let component: PostDetailsComponent;
  let fixture: ComponentFixture<PostDetailsComponent>;
  let queryClient: QueryClient;

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    await TestBed.configureTestingModule({
      imports: [PostDetailsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideTanStackQuery(queryClient),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(new Map([['id', '1']])),
          },
        },
        {
          provide: PostService,
          useValue: {
            getPost: () =>
              of({
                post: {
                  id: '1',
                  title: 'Test',
                  content: 'Body',
                  author: {
                    id: '1',
                    name: 'Test User',
                    email: 'test@test.com',
                    avatarUrl: null,
                    role: 'user',
                  },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                comments: [],
              }),
            createComment: () => of({ comment: {} }),
            updateComment: () => of({ comment: {} }),
            deleteComment: () => of(void 0),
            updatePost: () => of({ post: {} }),
            deletePost: () => of(void 0),
            reactToComment: () => of({ success: true, likes: 0, dislikes: 0 }),
          },
        },
        {
          provide: AuthQueryService,
          useValue: {
            currentUserQueryOptions: () => ({
              queryKey: ['auth', 'currentUser'],
              queryFn: async () => null,
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostDetailsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have post query initialized', () => {
    expect(component.postQuery).toBeDefined();
  });

  it('should compute post permissions for author and admin', () => {
    (component as any).currentUserQuery = { data: () => ({ id: 'u1', role: 'user' }) };
    (component as any).postQuery = {
      data: () => ({ post: { author: { id: 'u1' } }, comments: [] }),
    };

    expect(component.canEditPost()).toBe(true);
    expect(component.canDeletePost()).toBe(true);

    (component as any).currentUserQuery = { data: () => ({ id: 'admin', role: 'admin' }) };
    expect(component.canEditPost()).toBe(true);
    expect(component.canDeletePost()).toBe(true);
  });

  it('should deny permissions when user or post is missing', () => {
    (component as any).currentUserQuery = { data: () => null };
    (component as any).postQuery = { data: () => null };

    expect(component.canEditPost()).toBe(false);
    expect(component.canDeletePost()).toBe(false);
  });

  it('should check comment permissions', () => {
    (component as any).currentUserQuery = { data: () => ({ id: 'u1', role: 'user' }) };
    expect(component.canEditComment('u1')).toBe(true);
    expect(component.canDeleteComment('u1')).toBe(true);
    expect(component.canEditComment('u2')).toBe(false);

    (component as any).currentUserQuery = { data: () => ({ id: 'u3', role: 'admin' }) };
    expect(component.canDeleteComment('u2')).toBe(true);
  });

  it('should handle post form state and save post', () => {
    const mutate = vi.fn();
    (component as any).updatePostMutation = { mutate };

    component.startEditingPost();
    expect(component.showPostForm()).toBe(true);

    component.handleSavePost({ title: 'A', content: 'B' });

    expect(mutate).toHaveBeenCalled();

    component.closePostForm();
    expect(component.showPostForm()).toBe(false);
  });

  it('should ignore save post with empty data', () => {
    const mutate = vi.fn();
    (component as any).updatePostMutation = { mutate };
    component.handleSavePost({ title: '   ', content: '   ' });
    expect(mutate).not.toHaveBeenCalled();
  });

  it('should handle comment editing lifecycle', () => {
    const mutate = vi.fn();
    (component as any).updateCommentMutation = { mutate };

    component.startEditingComment('c1', 'old');
    expect(component.editingCommentId()).toBe('c1');
    expect(component.editCommentContent()).toBe('old');

    component.editCommentContent.set('new');
    component.saveComment('c1');
    expect(mutate).toHaveBeenCalledWith({ commentId: 'c1', content: 'new' });

    component.cancelEditingComment();
    expect(component.editingCommentId()).toBeNull();
  });

  it('should not save empty comment', () => {
    const mutate = vi.fn();
    (component as any).updateCommentMutation = { mutate };
    component.editCommentContent.set('   ');
    component.saveComment('c1');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('should submit comment and clear input on success', () => {
    const mutate = vi.fn();
    (component as any).createCommentMutation = { mutate };
    component.newCommentText.set('hello');

    component.submitComment('hello');

    expect(mutate).toHaveBeenCalled();
    const options = mutate.mock.calls[0]?.[1] as { onSuccess?: () => void };
    options?.onSuccess?.();
    expect(component.newCommentText()).toBe('');
  });

  it('should skip submit for empty comment', () => {
    const mutate = vi.fn();
    (component as any).createCommentMutation = { mutate };
    component.submitComment('   ');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('should open and confirm delete dialog for comment and post', () => {
    const delComment = vi.fn();
    const delPost = vi.fn();
    (component as any).deleteCommentMutation = { mutate: delComment };
    (component as any).deletePostMutation = { mutate: delPost };

    component.requestDeleteComment('c1');
    expect(component.deleteDialog()).toEqual({ type: 'comment', targetId: 'c1' });
    component.closeDeleteDialog();
    expect(component.deleteDialog()).toBeNull();

    component.requestDeletePost('p1');
    expect(component.deleteDialog()).toEqual({ type: 'post', targetId: 'p1' });

    component.confirmDelete();
    expect(delPost).toHaveBeenCalledWith('p1');
    expect(component.deleteDialog()).toBeNull();

    component.requestDeleteComment('c1');
    component.confirmDelete();
    expect(delComment).toHaveBeenCalledWith('c1');
  });

  it('should ignore confirmDelete when dialog is closed', () => {
    const delComment = vi.fn();
    const delPost = vi.fn();
    (component as any).deleteCommentMutation = { mutate: delComment };
    (component as any).deletePostMutation = { mutate: delPost };

    component.confirmDelete();

    expect(delComment).not.toHaveBeenCalled();
    expect(delPost).not.toHaveBeenCalled();
  });

  it('should read comment reactions from server fallback', () => {
    (component as any).postQuery = {
      data: () => ({
        post: { id: 'p1' },
        comments: [
          {
            id: 'c1',
            likesCount: 2,
            dislikesCount: 1,
            userReaction: 'like',
          },
        ],
      }),
    };

    expect(component.getCommentLikes('c1')).toBe(2);
    expect(component.getCommentDislikes('c1')).toBe(1);
    expect(component.getCommentUserReaction('c1')).toBe('like');
  });

  it('should optimistically react to comment and schedule sync', () => {
    const syncSpy = vi.spyOn(component as any, 'syncCommentReactionToServer');
    (component as any).postQuery = {
      data: () => ({
        post: { id: 'p1' },
        comments: [{ id: 'c1', likesCount: 0, dislikesCount: 0, userReaction: null }],
      }),
    };

    component.reactToComment('c1', 'like');
    expect(component.getCommentLikes('c1')).toBe(1);
    expect(component.getCommentUserReaction('c1')).toBe('like');
    expect(syncSpy).toHaveBeenCalledWith('c1', 1);

    component.reactToComment('c1', 'like');
    expect(component.getCommentUserReaction('c1')).toBeNull();
  });

  it('should clear timers and flush pending reactions on destroy', () => {
    const mutate = vi.fn();
    (component as any).reactToCommentMutation = { mutate };

    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const timer = setTimeout(() => {}, 1000);
    timers.set('c1', timer);

    (component as any).commentDebounceTimers = timers;
    (component as any).pendingCommentReactions = new Map([['c1', -1]]);

    component.ngOnDestroy();

    expect(mutate).toHaveBeenCalledWith({ commentId: 'c1', reaction: -1 });
    expect((component as any).commentDebounceTimers.size).toBe(0);
    expect((component as any).pendingCommentReactions.size).toBe(0);
  });

  it('should execute create comment mutation options', async () => {
    const postServiceMock = { createComment: vi.fn(() => of({ comment: { id: 'c1' } })) } as any;
    const postQueryServiceMock = { invalidatePost: vi.fn(async () => {}) } as any;

    const options = createCommentMutationOptions(postServiceMock, postQueryServiceMock, () => 'p1');
    await options.mutationFn('hello');

    expect(postServiceMock.createComment).toHaveBeenCalledWith({ postId: 'p1', content: 'hello' });

    await options.onSuccess();
    expect(postQueryServiceMock.invalidatePost).toHaveBeenCalledWith('p1');
  });

  it('should execute delete comment mutation options', async () => {
    const postServiceMock = { deleteComment: vi.fn(() => of(void 0)) } as any;
    const postQueryServiceMock = { invalidatePost: vi.fn(async () => {}) } as any;
    const firstSetResult: any[] = [];
    const secondSetResult: any[] = [];
    const queryClientMock = {
      cancelQueries: vi.fn(async () => {}),
      getQueryData: vi.fn(() => ({ comments: [{ id: 'c2' }, { id: 'c3' }] })),
      setQueryData: vi.fn((queryKey: unknown, updaterOrData: unknown) => {
        if (typeof updaterOrData === 'function') {
          firstSetResult.push(
            updaterOrData({ comments: [{ id: 'c2' }, { id: 'c3' }] }),
            updaterOrData({}),
          );
        } else {
          secondSetResult.push(updaterOrData);
        }
        return undefined;
      }),
    } as any;

    const options = createDeleteCommentMutationOptions(
      postServiceMock,
      postQueryServiceMock,
      queryClientMock,
      () => 'p2',
    );
    await options.mutationFn('c2');
    expect(postServiceMock.deleteComment).toHaveBeenCalledWith('c2');

    const onMutateResult = await options.onMutate('c2');
    expect(queryClientMock.cancelQueries).toHaveBeenCalledWith({
      queryKey: ['posts', 'detail', 'p2'],
    });
    expect(queryClientMock.getQueryData).toHaveBeenCalledWith(['posts', 'detail', 'p2']);
    expect(onMutateResult).toEqual({
      previousData: { comments: [{ id: 'c2' }, { id: 'c3' }] },
      queryKey: ['posts', 'detail', 'p2'],
    });
    expect(firstSetResult[0]).toEqual({ comments: [{ id: 'c3' }] });
    expect(firstSetResult[1]).toEqual({});

    options.onError(new Error('x'), 'c2', {
      previousData: { comments: [{ id: 'c2' }] },
      queryKey: ['posts', 'detail', 'p2'],
    });
    expect(queryClientMock.setQueryData).toHaveBeenCalledWith(['posts', 'detail', 'p2'], {
      comments: [{ id: 'c2' }],
    });
    expect(secondSetResult).toContainEqual({ comments: [{ id: 'c2' }] });

    options.onError(new Error('x'), 'c2', undefined);

    await options.onSuccess();
    expect(postQueryServiceMock.invalidatePost).toHaveBeenCalledWith('p2');
  });

  it('should execute delete post mutation options and navigate', async () => {
    const postServiceMock = { deletePost: vi.fn(() => of(void 0)) } as any;
    const postQueryServiceMock = { invalidatePosts: vi.fn(async () => {}) } as any;
    const updaterResults: any[] = [];
    const queryClientMock = {
      cancelQueries: vi.fn(async () => {}),
      getQueryData: vi.fn(() => ({ post: { id: 'p-del' } })),
      getQueryCache: vi.fn(() => ({
        findAll: vi.fn(() => [
          {
            queryKey: ['posts', 'list', { page: 1, limit: 3 }],
            state: { data: { posts: [{ id: 'p-del' }, { id: 'p-2' }] } },
          },
        ]),
      })),
      setQueryData: vi.fn((queryKey: unknown, updaterOrData: unknown) => {
        if (typeof updaterOrData === 'function') {
          updaterResults.push(
            updaterOrData({ posts: [{ id: 'p-del' }, { id: 'p-2' }] }),
            updaterOrData({}),
          );
        }
        return undefined;
      }),
      removeQueries: vi.fn(),
    } as any;
    const routerMock = { navigate: vi.fn() } as any;

    const options = createDeletePostMutationOptions(
      postServiceMock,
      postQueryServiceMock,
      queryClientMock,
      routerMock,
    );
    await options.mutationFn('p-del');
    expect(postServiceMock.deletePost).toHaveBeenCalledWith('p-del');

    const onMutateResult = await options.onMutate('p-del');
    expect(queryClientMock.cancelQueries).toHaveBeenCalledWith({
      queryKey: ['posts', 'detail', 'p-del'],
    });
    expect(queryClientMock.cancelQueries).toHaveBeenCalledWith({ queryKey: ['posts', 'list'] });
    expect(queryClientMock.removeQueries).toHaveBeenCalledWith({
      queryKey: ['posts', 'detail', 'p-del'],
    });
    expect(onMutateResult).toEqual({
      detailQueryKey: ['posts', 'detail', 'p-del'],
      previousDetailData: { post: { id: 'p-del' } },
      previousListData: [
        {
          queryKey: ['posts', 'list', { page: 1, limit: 3 }],
          data: { posts: [{ id: 'p-del' }, { id: 'p-2' }] },
        },
      ],
    });
    expect(updaterResults[0]).toEqual({ posts: [{ id: 'p-2' }] });
    expect(updaterResults[1]).toEqual({});

    options.onError(new Error('x'), 'p-del', {
      detailQueryKey: ['posts', 'detail', 'p-del'],
      previousDetailData: { post: { id: 'p-del' } },
      previousListData: [
        {
          queryKey: ['posts', 'list', { page: 1, limit: 3 }],
          data: { posts: [{ id: 'p-del' }, { id: 'p-2' }] },
        },
      ],
    });
    expect(queryClientMock.setQueryData).toHaveBeenCalledWith(['posts', 'detail', 'p-del'], {
      post: { id: 'p-del' },
    });
    expect(queryClientMock.setQueryData).toHaveBeenCalledWith(
      ['posts', 'list', { page: 1, limit: 3 }],
      { posts: [{ id: 'p-del' }, { id: 'p-2' }] },
    );

    options.onError(new Error('x'), 'p-del', undefined);

    options.onSuccess();
    expect(postQueryServiceMock.invalidatePosts).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/posts']);
  });

  it('should execute update post mutation option callbacks', async () => {
    const postServiceMock = {
      updatePost: vi.fn(() => of({ post: { id: 'p1', title: 'N', content: 'NC' } })),
    } as any;
    const postQueryServiceMock = {
      optimisticUpdatePostDetail: vi.fn(() => ({ previousData: { old: true }, queryKey: ['k'] })),
      invalidatePost: vi.fn(async () => {}),
    } as any;
    const localQueryClient = new QueryClient();
    const setDataSpy = vi.spyOn(localQueryClient, 'setQueryData');
    const showPostForm = { set: vi.fn() } as any;

    const options = createUpdatePostMutationOptions(
      postServiceMock,
      postQueryServiceMock,
      localQueryClient,
      showPostForm,
    );

    await options.mutationFn({ postId: 'p1', title: 'N', content: 'NC' });
    expect(postServiceMock.updatePost).toHaveBeenCalledWith('p1', { title: 'N', content: 'NC' });

    const cancelQueries = vi.fn(async () => {});
    const onMutateResult = await options.onMutate(
      { postId: 'p1', title: 'N', content: 'NC' },
      { client: { cancelQueries } },
    );
    expect(showPostForm.set).toHaveBeenCalledWith(false);
    expect(cancelQueries).toHaveBeenCalledWith({ queryKey: ['posts', 'detail', 'p1'] });
    expect(onMutateResult).toEqual({ previousData: { old: true }, queryKey: ['k'] });

    options.onError(new Error('x'), {}, { previousData: { rollback: 1 }, queryKey: ['rk'] });
    expect(setDataSpy).toHaveBeenCalledWith(['rk'], { rollback: 1 });

    await options.onSettled({}, null, { postId: 'p1' });
    expect(postQueryServiceMock.invalidatePost).toHaveBeenCalledWith('p1');
  });

  it('should execute update comment and react mutation options', async () => {
    const postServiceMock = {
      updateComment: vi.fn(() => of({ comment: { id: 'c1' } })),
    } as any;
    const postQueryServiceMock = {
      invalidatePost: vi.fn(async () => {}),
      toggleReaction: vi.fn(async () => ({ success: true, likes: 1, dislikes: 0 })),
    } as any;
    const queryClientMock = {
      cancelQueries: vi.fn(async () => {}),
      getQueryData: vi.fn(() => ({
        comments: [
          { id: 'c1', content: 'old-content' },
          { id: 'c2', content: 'second-comment' },
        ],
      })),
      setQueryData: vi.fn((queryKey: unknown, updater: unknown) => {
        if (typeof updater === 'function') {
          return updater({
            comments: [
              { id: 'c1', content: 'old-content' },
              { id: 'c2', content: 'second-comment' },
            ],
          });
        }
        return undefined;
      }),
    } as any;
    const clearEditing = vi.fn();
    const restoreEditing = vi.fn();

    const updateOptions = createUpdateCommentMutationOptions(
      postServiceMock,
      postQueryServiceMock,
      queryClientMock,
      () => 'p3',
      clearEditing,
      restoreEditing,
    );
    await updateOptions.mutationFn({ commentId: 'c1', content: 'new' });
    expect(postServiceMock.updateComment).toHaveBeenCalledWith('c1', { content: 'new' });

    const onMutateContext = await updateOptions.onMutate({ commentId: 'c1', content: 'new' });
    expect(queryClientMock.cancelQueries).toHaveBeenCalledWith({
      queryKey: ['posts', 'detail', 'p3'],
    });
    expect(queryClientMock.getQueryData).toHaveBeenCalledWith(['posts', 'detail', 'p3']);
    expect(queryClientMock.setQueryData).toHaveBeenCalled();
    expect(clearEditing).toHaveBeenCalled();
    expect(onMutateContext).toEqual({
      previousData: {
        comments: [
          { id: 'c1', content: 'old-content' },
          { id: 'c2', content: 'second-comment' },
        ],
      },
      queryKey: ['posts', 'detail', 'p3'],
      variables: { commentId: 'c1', content: 'new' },
    });

    updateOptions.onError(
      new Error('save failed'),
      { commentId: 'c1', content: 'new' },
      {
        previousData: { comments: [{ id: 'c1', content: 'old-content' }] },
        queryKey: ['posts', 'detail', 'p3'],
      },
    );
    expect(queryClientMock.setQueryData).toHaveBeenCalledWith(['posts', 'detail', 'p3'], {
      comments: [{ id: 'c1', content: 'old-content' }],
    });
    expect(restoreEditing).toHaveBeenCalledWith('c1', 'new');

    updateOptions.onError(new Error('save failed'), { commentId: 'c1', content: 'new' });
    expect(restoreEditing).toHaveBeenCalledTimes(2);

    // Covers branch when cached data has no comments
    queryClientMock.setQueryData.mockImplementationOnce((_queryKey: unknown, updater: unknown) => {
      if (typeof updater === 'function') {
        return updater({});
      }
      return undefined;
    });
    await updateOptions.onMutate({ commentId: 'c1', content: 'newer' });

    await updateOptions.onSuccess();
    expect(postQueryServiceMock.invalidatePost).toHaveBeenCalledWith('p3');

    const reactOptions = createReactToCommentMutationOptions(postQueryServiceMock, () => 'p3');
    const result = await reactOptions.mutationFn({ commentId: 'c1', reaction: 1 });
    expect(postQueryServiceMock.toggleReaction).toHaveBeenCalledWith('comment', 'c1', 1);
    expect(result).toEqual({ success: true, likes: 1, dislikes: 0 });

    await reactOptions.onSuccess();
    expect(postQueryServiceMock.invalidatePost).toHaveBeenCalledWith('p3');
  });

  it('should clear editing comment before invalidate failure', async () => {
    const postServiceMock = {
      updateComment: vi.fn(() => of({ comment: { id: 'c1' } })),
    } as any;
    const postQueryServiceMock = {
      invalidatePost: vi.fn(async () => {
        throw new Error('invalidate failed');
      }),
    } as any;
    const queryClientMock = {
      cancelQueries: vi.fn(async () => {}),
      getQueryData: vi.fn(() => ({ comments: [{ id: 'c1', content: 'old' }] })),
      setQueryData: vi.fn(),
    } as any;
    const clearEditing = vi.fn();
    const restoreEditing = vi.fn();

    const updateOptions = createUpdateCommentMutationOptions(
      postServiceMock,
      postQueryServiceMock,
      queryClientMock,
      () => 'p3',
      clearEditing,
      restoreEditing,
    );

    await updateOptions.onMutate({ commentId: 'c1', content: 'new' });
    await expect(updateOptions.onSuccess()).rejects.toThrow('invalidate failed');
    expect(clearEditing).toHaveBeenCalled();
  });

  it('should not save post when postId is empty', () => {
    const mutate = vi.fn();
    (component as any).updatePostMutation = { mutate };
    (component as any).postId = () => '';

    component.handleSavePost({ title: 'Title', content: 'Content' });

    expect(mutate).not.toHaveBeenCalled();
  });

  it('should ignore reactToComment when comment is not found', () => {
    const syncSpy = vi.spyOn(component as any, 'syncCommentReactionToServer');
    (component as any).postQuery = {
      data: () => ({ post: { id: 'p1' }, comments: [{ id: 'other' }] }),
    };

    component.reactToComment('missing', 'like');

    expect(syncSpy).not.toHaveBeenCalled();
  });

  it('should set dislike userReaction in reactToComment branch', () => {
    const syncSpy = vi.spyOn(component as any, 'syncCommentReactionToServer');
    (component as any).postQuery = {
      data: () => ({
        post: { id: 'p1' },
        comments: [{ id: 'c2', likesCount: 0, dislikesCount: 0, userReaction: null }],
      }),
    };

    component.reactToComment('c2', 'dislike');

    expect(component.getCommentUserReaction('c2')).toBe('dislike');
    expect(syncSpy).toHaveBeenCalledWith('c2', -1);
  });

  it('should fallback likes/dislikes to 0 when comment is missing', () => {
    (component as any).postQuery = {
      data: () => ({ post: { id: 'p1' }, comments: [] }),
    };

    expect(component.getCommentLikes('missing')).toBe(0);
    expect(component.getCommentDislikes('missing')).toBe(0);
  });

  it('should return false for comment permissions when user is missing', () => {
    (component as any).currentUserQuery = { data: () => null };

    expect(component.canEditComment('a1')).toBe(false);
    expect(component.canDeleteComment('a1')).toBe(false);
  });

  it('should allow post permissions via admin role branch', () => {
    (component as any).currentUserQuery = { data: () => ({ id: 'admin-id', role: 'admin' }) };
    (component as any).postQuery = {
      data: () => ({ post: { author: { id: 'author-id' } }, comments: [] }),
    };

    expect(component.canEditPost()).toBe(true);
    expect(component.canDeletePost()).toBe(true);
  });

  it('should return early when reactToComment has no post data', () => {
    const syncSpy = vi.spyOn(component as any, 'syncCommentReactionToServer');
    (component as any).postQuery = { data: () => null };

    component.reactToComment('c1', 'like');

    expect(syncSpy).not.toHaveBeenCalled();
  });

  it('should toggle dislike to neutral and decrement dislikes', () => {
    const syncSpy = vi.spyOn(component as any, 'syncCommentReactionToServer');
    (component as any).postQuery = {
      data: () => ({
        post: { id: 'p1' },
        comments: [{ id: 'c3', likesCount: 0, dislikesCount: 2, userReaction: 'dislike' }],
      }),
    };

    component.reactToComment('c3', 'dislike');

    expect(component.getCommentUserReaction('c3')).toBeNull();
    expect(component.getCommentDislikes('c3')).toBe(1);
    expect(syncSpy).toHaveBeenCalledWith('c3', 0);
  });

  it('should skip mutation in debounce callback when pending reaction removed', () => {
    vi.useFakeTimers();
    const mutate = vi.fn();
    (component as any).reactToCommentMutation = { mutate };

    (component as any).syncCommentReactionToServer('c4', 1);
    (component as any).pendingCommentReactions.delete('c4');
    vi.advanceTimersByTime(800);

    expect(mutate).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should skip ngOnDestroy mutate when pending reaction is undefined', () => {
    const mutate = vi.fn();
    (component as any).reactToCommentMutation = { mutate };

    const timer = setTimeout(() => {}, 1000);
    (component as any).commentDebounceTimers = new Map([['c5', timer]]);
    (component as any).pendingCommentReactions = new Map();

    component.ngOnDestroy();

    expect(mutate).not.toHaveBeenCalled();
  });

  it('should ignore update post onError when context is missing', async () => {
    const postServiceMock = {
      updatePost: vi.fn(() => of({ post: { id: 'p9', title: 'A', content: 'B' } })),
    } as any;
    const postQueryServiceMock = {
      optimisticUpdatePostDetail: vi.fn(() => ({ previousData: { old: true }, queryKey: ['k'] })),
      invalidatePost: vi.fn(async () => {}),
    } as any;
    const localQueryClient = new QueryClient();
    const setDataSpy = vi.spyOn(localQueryClient, 'setQueryData');
    const showPostForm = { set: vi.fn() } as any;

    const options = createUpdatePostMutationOptions(
      postServiceMock,
      postQueryServiceMock,
      localQueryClient,
      showPostForm,
    );

    options.onError(new Error('x'), {}, undefined);
    expect(setDataSpy).not.toHaveBeenCalled();
  });

  it('should evaluate currentUser computed signal', () => {
    (component as any).currentUserQuery = { data: () => ({ id: 'u-cur' }) };
    expect(component.currentUser()).toEqual({ id: 'u-cur' });
  });

  it('should replace existing comment reaction debounce timer', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    const existingTimer = setTimeout(() => {}, 1000);
    (component as any).commentDebounceTimers.set('c1', existingTimer);

    (component as any).syncCommentReactionToServer('c1', 1);

    expect(clearSpy).toHaveBeenCalled();
    expect((component as any).pendingCommentReactions.get('c1')).toBe(1);

    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should resolve post id from param map helper', () => {
    expect(resolvePostId({ get: (key: string) => (key === 'id' ? 'p1' : null) })).toBe('p1');
    expect(resolvePostId({ get: () => null })).toBe('');
    expect(resolvePostId(undefined)).toBe('');
  });

  it('should restore editing comment on real update mutation error', async () => {
    const postService = (component as any).postService;
    vi.spyOn(postService, 'updateComment').mockReturnValueOnce(
      throwError(() => new Error('update failed')),
    );

    queryClient.setQueryData(['posts', 'detail', '1'], {
      post: { id: '1' },
      comments: [{ id: 'c1', content: 'old', updatedAt: '2024-01-01T00:00:00.000Z' }],
    });

    component.startEditingComment('c1', 'old');
    component.editCommentContent.set('new');
    component.saveComment('c1');

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(component.editingCommentId()).toBe('c1');
    expect(component.editCommentContent()).toBe('new');
  });
});
