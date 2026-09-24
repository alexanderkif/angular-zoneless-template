import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { SessionService, type AuthUser } from '../../core/auth/session.service';
import { PostsStore } from '../../features/posts/posts.store';
import type { Comment, Post, PostWithComments } from '../../services/post.service';
import { WINDOW } from '../../tokens/window.token';
import { PostDetailsComponent, resolvePostId } from './post-details.component';

const createPost = (overrides: Partial<Post> = {}): Post => ({
  id: 'p1',
  title: 'Title',
  content: 'Content',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  author: { id: 'u1', name: 'User One', avatarUrl: null, role: 'user' },
  likes: 0,
  dislikes: 0,
  userReaction: null,
  commentsCount: 0,
  ...overrides,
});

const createComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 'c1',
  content: 'Comment',
  postId: 'p1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  author: { id: 'u1', name: 'User One', avatarUrl: null, role: 'user' },
  likesCount: 0,
  dislikesCount: 0,
  userReaction: null,
  ...overrides,
});

const createUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'u1',
  email: 'user@test.dev',
  name: 'User One',
  avatarUrl: null,
  provider: 'email',
  emailVerified: true,
  role: 'user',
  ...overrides,
});

const createStoreMock = () => ({
  detail: {
    value: signal<PostWithComments | undefined>(undefined),
    status: signal('resolved'),
    error: signal<Error | undefined>(undefined),
    reload: vi.fn(),
  },
  selectedPost: signal<Post | undefined>(undefined),
  comments: signal<Comment[]>([]),
  selectedPostId: signal<string | undefined>(undefined),
  selectPost: vi.fn(),
  createComment: vi.fn(async () => undefined),
  updateComment: vi.fn(async () => undefined),
  deleteComment: vi.fn(async () => undefined),
  deletePost: vi.fn(async () => undefined),
  updatePost: vi.fn(async () => undefined),
  toggleReaction: vi.fn(async () => ({ success: true, likes: 0, dislikes: 0 })),
});

const createSessionMock = () => ({
  currentUser: { value: signal<AuthUser | null>(null) },
});

describe('PostDetailsComponent', () => {
  let component: PostDetailsComponent;
  let fixture: ComponentFixture<PostDetailsComponent>;
  let storeMock: ReturnType<typeof createStoreMock>;
  let sessionMock: ReturnType<typeof createSessionMock>;
  let windowMock: { matchMedia: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    storeMock = createStoreMock();
    sessionMock = createSessionMock();
    windowMock = { matchMedia: vi.fn(() => ({ matches: false })) };
    // scrollIntoView is not implemented in JSDOM
    Element.prototype.scrollIntoView = vi.fn();

    await TestBed.configureTestingModule({
      imports: [PostDetailsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PostsStore, useValue: storeMock },
        { provide: SessionService, useValue: sessionMock },
        { provide: WINDOW, useValue: windowMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'p1' })) },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(PostDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should smoothly scroll into view after render in the browser', () => {
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('should scroll instantly when reduced motion is preferred', async () => {
    windowMock.matchMedia.mockReturnValue({ matches: true });

    const reducedFixture = TestBed.createComponent(PostDetailsComponent);
    reducedFixture.detectChanges();
    await reducedFixture.whenStable();

    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({
      behavior: 'auto',
      block: 'start',
    });
  });

  it('should not scroll when the platform is not a browser', async () => {
    TestBed.resetTestingModule();
    vi.mocked(Element.prototype.scrollIntoView).mockClear();
    const serverWindow = { matchMedia: vi.fn(() => ({ matches: false })) };

    await TestBed.configureTestingModule({
      imports: [PostDetailsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PostsStore, useValue: storeMock },
        { provide: SessionService, useValue: sessionMock },
        { provide: WINDOW, useValue: serverWindow },
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'p1' })) },
        },
      ],
    }).compileComponents();

    const serverFixture = TestBed.createComponent(PostDetailsComponent);
    serverFixture.detectChanges();
    await serverFixture.whenStable();

    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('should expose post query', () => {
    expect(component.postQuery).toBeDefined();
  });

  it('should select the route post id in the store', () => {
    expect(component.postId()).toBe('p1');
    expect(storeMock.selectPost).toHaveBeenCalledWith('p1');
  });

  it('should render loading state', () => {
    storeMock.detail.status.set('loading');

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading post...');
  });

  it('should render error state', () => {
    storeMock.detail.status.set('error');
    storeMock.detail.error.set(new Error('kaboom'));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Error loading post: kaboom');
  });

  it('should render post and comments on success', async () => {
    storeMock.selectedPost.set(createPost({ title: 'Rendered Title' }));
    storeMock.comments.set([createComment({ id: 'c1', content: 'Rendered Comment' })]);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Rendered Title');
    expect(fixture.nativeElement.textContent).toContain('Comments (1)');
    expect(fixture.nativeElement.textContent).toContain('Rendered Comment');
  });

  it('should render no post found when there is no data', () => {
    expect(fixture.nativeElement.textContent).toContain('No post found');
  });

  it('should compute post permissions for the author', () => {
    sessionMock.currentUser.value.set(createUser({ id: 'u1', role: 'user' }));
    storeMock.selectedPost.set(createPost({ author: createPost().author }));

    expect(component.canEditPost()).toBe(true);
    expect(component.canDeletePost()).toBe(true);
  });

  it('should compute post permissions for an admin', () => {
    sessionMock.currentUser.value.set(createUser({ id: 'admin-id', role: 'admin' }));
    storeMock.selectedPost.set(createPost());

    expect(component.canEditPost()).toBe(true);
    expect(component.canDeletePost()).toBe(true);
  });

  it('should deny post permissions for another regular user', () => {
    sessionMock.currentUser.value.set(createUser({ id: 'u2', role: 'user' }));
    storeMock.selectedPost.set(createPost());

    expect(component.canEditPost()).toBe(false);
    expect(component.canDeletePost()).toBe(false);
  });

  it('should deny post permissions when user or post is missing', () => {
    expect(component.canEditPost()).toBe(false);
    expect(component.canDeletePost()).toBe(false);
  });

  it('should check comment permissions', () => {
    sessionMock.currentUser.value.set(createUser({ id: 'u1', role: 'user' }));

    expect(component.canEditComment('u1')).toBe(true);
    expect(component.canDeleteComment('u1')).toBe(true);
    expect(component.canEditComment('u2')).toBe(false);

    sessionMock.currentUser.value.set(createUser({ id: 'u3', role: 'admin' }));
    expect(component.canDeleteComment('u2')).toBe(true);
  });

  it('should return false for comment permissions when user is missing', () => {
    expect(component.canEditComment('a1')).toBe(false);
    expect(component.canDeleteComment('a1')).toBe(false);
  });

  it('should evaluate currentUser computed signal', () => {
    sessionMock.currentUser.value.set(createUser({ id: 'u-cur' }));

    expect(component.currentUser()?.id).toBe('u-cur');
  });

  it('should handle post form state and save post', async () => {
    storeMock.updatePost.mockResolvedValue(undefined);

    component.startEditingPost();
    expect(component.showPostForm()).toBe(true);

    await component.handleSavePost({ title: 'A', content: 'B' });

    expect(storeMock.updatePost).toHaveBeenCalledWith('p1', { title: 'A', content: 'B' });
    expect(component.isUpdatingPost()).toBe(false);
    expect(component.showPostForm()).toBe(false);
  });

  it('should ignore save post with empty data', async () => {
    await component.handleSavePost({ title: '   ', content: '   ' });

    expect(storeMock.updatePost).not.toHaveBeenCalled();
  });

  it('should ignore save post when postId is empty', async () => {
    (component as unknown as { postId: () => string }).postId = () => '';

    await component.handleSavePost({ title: 'Title', content: 'Content' });

    expect(storeMock.updatePost).not.toHaveBeenCalled();
  });

  it('should handle comment editing lifecycle', async () => {
    storeMock.updateComment.mockResolvedValue(undefined);

    component.startEditingComment('c1', 'old');
    expect(component.editingCommentId()).toBe('c1');
    expect(component.editCommentContent()).toBe('old');

    component.editCommentContent.set('new');
    await component.saveComment('c1');

    expect(storeMock.updateComment).toHaveBeenCalledWith('c1', 'new');
    expect(component.editingCommentId()).toBeNull();
    expect(component.isUpdatingComment()).toBe(false);

    component.cancelEditingComment();
    expect(component.editingCommentId()).toBeNull();
  });

  it('should not save empty comment', async () => {
    component.editCommentContent.set('   ');

    await component.saveComment('c1');

    expect(storeMock.updateComment).not.toHaveBeenCalled();
  });

  it('should submit comment and clear input on success', async () => {
    storeMock.createComment.mockResolvedValue(undefined);
    component.newCommentText.set('hello');

    await component.submitComment('hello');

    expect(storeMock.createComment).toHaveBeenCalledWith('hello');
    expect(component.newCommentText()).toBe('');
    expect(component.isCreatingComment()).toBe(false);
  });

  it('should skip submit for empty comment', async () => {
    await component.submitComment('   ');

    expect(storeMock.createComment).not.toHaveBeenCalled();
  });

  it('should open and confirm delete dialog for a comment', async () => {
    storeMock.deleteComment.mockResolvedValue(undefined);

    component.requestDeleteComment('c1');
    expect(component.deleteDialog()).toEqual({ type: 'comment', targetId: 'c1' });

    await component.confirmDelete();

    expect(storeMock.deleteComment).toHaveBeenCalledWith('c1');
    expect(component.deleteDialog()).toBeNull();
    expect(component.isDeletingComment()).toBe(false);
  });

  it('should open and confirm delete dialog for a post and navigate', async () => {
    storeMock.deletePost.mockResolvedValue(undefined);

    component.requestDeletePost('p9');
    expect(component.deleteDialog()).toEqual({ type: 'post', targetId: 'p9' });

    await component.confirmDelete();

    expect(storeMock.deletePost).toHaveBeenCalledWith('p9');
    expect(router.navigate).toHaveBeenCalledWith(['/posts']);
    expect(component.deleteDialog()).toBeNull();
    expect(component.isDeletingPost()).toBe(false);
  });

  it('should close delete dialog', () => {
    component.requestDeleteComment('c1');

    component.closeDeleteDialog();

    expect(component.deleteDialog()).toBeNull();
  });

  it('should ignore confirmDelete when dialog is closed', async () => {
    await component.confirmDelete();

    expect(storeMock.deleteComment).not.toHaveBeenCalled();
    expect(storeMock.deletePost).not.toHaveBeenCalled();
  });

  it('should read comment reactions from server fallback', () => {
    storeMock.comments.set([
      createComment({ id: 'c1', likesCount: 2, dislikesCount: 1, userReaction: 'like' }),
    ]);

    expect(component.getCommentLikes('c1')).toBe(2);
    expect(component.getCommentDislikes('c1')).toBe(1);
    expect(component.getCommentUserReaction('c1')).toBe('like');
  });

  it('should fallback likes and dislikes to 0 when comment is missing', () => {
    storeMock.comments.set([]);

    expect(component.getCommentLikes('missing')).toBe(0);
    expect(component.getCommentDislikes('missing')).toBe(0);
    expect(component.getCommentUserReaction('missing')).toBeNull();
  });

  it('should optimistically react to a comment and schedule sync', () => {
    const syncSpy = vi
      .spyOn(component as unknown as Record<string, (...args: unknown[]) => void>, 'syncCommentReactionToServer')
      .mockImplementation(() => undefined);
    storeMock.comments.set([createComment({ id: 'c1' })]);

    component.reactToComment('c1', 'like');

    expect(component.getCommentLikes('c1')).toBe(1);
    expect(component.getCommentUserReaction('c1')).toBe('like');
    expect(syncSpy).toHaveBeenCalledWith('c1', 1);

    component.reactToComment('c1', 'like');

    expect(component.getCommentUserReaction('c1')).toBeNull();
    expect(syncSpy).toHaveBeenLastCalledWith('c1', 0);
  });

  it('should set dislike reaction in reactToComment', () => {
    const syncSpy = vi
      .spyOn(component as unknown as Record<string, (...args: unknown[]) => void>, 'syncCommentReactionToServer')
      .mockImplementation(() => undefined);
    storeMock.comments.set([createComment({ id: 'c2' })]);

    component.reactToComment('c2', 'dislike');

    expect(component.getCommentUserReaction('c2')).toBe('dislike');
    expect(component.getCommentDislikes('c2')).toBe(1);
    expect(syncSpy).toHaveBeenCalledWith('c2', -1);
  });

  it('should toggle dislike back to neutral', () => {
    const syncSpy = vi
      .spyOn(component as unknown as Record<string, (...args: unknown[]) => void>, 'syncCommentReactionToServer')
      .mockImplementation(() => undefined);
    storeMock.comments.set([
      createComment({ id: 'c3', dislikesCount: 2, userReaction: 'dislike' }),
    ]);

    component.reactToComment('c3', 'dislike');

    expect(component.getCommentUserReaction('c3')).toBeNull();
    expect(component.getCommentDislikes('c3')).toBe(1);
    expect(syncSpy).toHaveBeenCalledWith('c3', 0);
  });

  it('should ignore reactToComment when comment is not found', () => {
    const syncSpy = vi
      .spyOn(component as unknown as Record<string, (...args: unknown[]) => void>, 'syncCommentReactionToServer')
      .mockImplementation(() => undefined);
    storeMock.comments.set([createComment({ id: 'other' })]);

    component.reactToComment('missing', 'like');

    expect(syncSpy).not.toHaveBeenCalled();
  });

  it('should return early when reactToComment has no post data', () => {
    const syncSpy = vi
      .spyOn(component as unknown as Record<string, (...args: unknown[]) => void>, 'syncCommentReactionToServer')
      .mockImplementation(() => undefined);

    component.reactToComment('c1', 'like');

    expect(syncSpy).not.toHaveBeenCalled();
  });

  it('should clear timers and flush pending reactions on destroy', () => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    timers.set(
      'c1',
      setTimeout(() => undefined, 1000),
    );
    (component as unknown as { commentDebounceTimers: Map<string, ReturnType<typeof setTimeout>> }).commentDebounceTimers = timers;
    (
      component as unknown as { pendingCommentReactions: Map<string, 1 | -1 | 0> }
    ).pendingCommentReactions = new Map([['c1', -1]]);

    component.ngOnDestroy();

    expect(storeMock.toggleReaction).toHaveBeenCalledWith('comment', 'c1', -1);
    expect((component as unknown as { commentDebounceTimers: Map<string, unknown> }).commentDebounceTimers.size).toBe(0);
    expect(
      (component as unknown as { pendingCommentReactions: Map<string, unknown> })
        .pendingCommentReactions.size,
    ).toBe(0);
  });

  it('should skip ngOnDestroy mutation when pending reaction is undefined', () => {
    const timer = setTimeout(() => undefined, 1000);
    (component as unknown as { commentDebounceTimers: Map<string, ReturnType<typeof setTimeout>> }).commentDebounceTimers = new Map([
      ['c5', timer],
    ]);
    (
      component as unknown as { pendingCommentReactions: Map<string, 1 | -1 | 0> }
    ).pendingCommentReactions = new Map();

    component.ngOnDestroy();

    expect(storeMock.toggleReaction).not.toHaveBeenCalled();
  });

  it('should send a debounced reaction to the store', () => {
    vi.useFakeTimers();

    (
      component as unknown as {
        syncCommentReactionToServer: (commentId: string, reaction: 1 | -1 | 0) => void;
      }
    ).syncCommentReactionToServer('c9', 1);

    vi.advanceTimersByTime(800);

    expect(storeMock.toggleReaction).toHaveBeenCalledWith('comment', 'c9', 1);
  });

  it('should skip debounced reaction when pending reaction was removed', () => {
    vi.useFakeTimers();

    (
      component as unknown as {
        syncCommentReactionToServer: (commentId: string, reaction: 1 | -1 | 0) => void;
      }
    ).syncCommentReactionToServer('c4', 1);
    (
      component as unknown as { pendingCommentReactions: Map<string, 1 | -1 | 0> }
    ).pendingCommentReactions.delete('c4');

    vi.advanceTimersByTime(800);

    expect(storeMock.toggleReaction).not.toHaveBeenCalled();
  });

  it('should replace an existing comment reaction debounce timer', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    const existingTimer = setTimeout(() => undefined, 1000);
    (
      component as unknown as { commentDebounceTimers: Map<string, ReturnType<typeof setTimeout>> }
    ).commentDebounceTimers.set('c1', existingTimer);

    (
      component as unknown as {
        syncCommentReactionToServer: (commentId: string, reaction: 1 | -1 | 0) => void;
      }
    ).syncCommentReactionToServer('c1', 1);

    expect(clearSpy).toHaveBeenCalled();
    expect(
      (component as unknown as { pendingCommentReactions: Map<string, 1 | -1 | 0> })
        .pendingCommentReactions.get('c1'),
    ).toBe(1);

    vi.runOnlyPendingTimers();
  });

  it('should revert a local comment reaction when the destroy flush fails', async () => {
    vi.useFakeTimers();
    storeMock.toggleReaction.mockRejectedValueOnce(new Error('destroy failed'));
    storeMock.comments.set([createComment({ id: 'c6' })]);

    component.reactToComment('c6', 'like');
    expect(component.getCommentUserReaction('c6')).toBe('like');

    component.ngOnDestroy();
    await vi.advanceTimersByTimeAsync(0);

    expect(storeMock.toggleReaction).toHaveBeenCalledWith('comment', 'c6', 1);
    expect(component.getCommentUserReaction('c6')).toBeNull();
  });

  it('should revert a local comment reaction when the debounced sync fails', async () => {
    vi.useFakeTimers();
    storeMock.toggleReaction.mockRejectedValueOnce(new Error('sync failed'));
    storeMock.comments.set([createComment({ id: 'c8' })]);

    component.reactToComment('c8', 'like');
    expect(component.getCommentUserReaction('c8')).toBe('like');

    await vi.advanceTimersByTimeAsync(800);

    expect(storeMock.toggleReaction).toHaveBeenCalledWith('comment', 'c8', 1);
    expect(component.getCommentUserReaction('c8')).toBeNull();
  });

  it('should resolve post id from param map helper', () => {
    expect(resolvePostId({ get: (key: string) => (key === 'id' ? 'p1' : null) })).toBe('p1');
    expect(resolvePostId({ get: () => null })).toBe('');
    expect(resolvePostId(undefined)).toBe('');
  });
});
