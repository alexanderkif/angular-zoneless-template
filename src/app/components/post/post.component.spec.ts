import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import {
  createDetailsModeGetter,
  createPostGetter,
  createPostReactionMutationInjectionFactory,
  createPostReactionMutationOptions,
  PostComponent,
} from './post.component';

describe('PostComponent', () => {
  let component: PostComponent;
  let fixture: ComponentFixture<PostComponent>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let queryClient: QueryClient;

  beforeEach(async () => {
    const routerSpy = { navigate: vi.fn() };

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    await TestBed.configureTestingModule({
      imports: [PostComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTanStackQuery(queryClient),
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router) as any;
    fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to the correct post details page', () => {
    const postId = '123';

    component.openDetails(postId);

    expect(router.navigate).toHaveBeenCalledWith([`/posts/${postId}`]);
  });

  it('should deny edit/delete when user or post is missing', () => {
    fixture.componentRef.setInput('currentUser', null);
    fixture.componentRef.setInput('post', undefined);

    expect(component.canEdit()).toBe(false);
    expect(component.canDelete()).toBe(false);
  });

  it('should allow edit/delete for author and admin', () => {
    fixture.componentRef.setInput('post', {
      id: 'p1',
      title: 'T',
      content: 'C',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: 'u1',
        name: 'Author',
        email: 'a@a.com',
        avatarUrl: null,
        role: 'user',
      },
    } as any);

    fixture.componentRef.setInput('currentUser', {
      id: 'u1',
      email: 'a@a.com',
      name: 'Author',
      avatarUrl: null,
      provider: 'local',
      emailVerified: true,
      role: 'user',
    });
    expect(component.canEdit()).toBe(true);
    expect(component.canDelete()).toBe(true);

    fixture.componentRef.setInput('currentUser', {
      id: 'admin',
      email: 'admin@a.com',
      name: 'Admin',
      avatarUrl: null,
      provider: 'local',
      emailVerified: true,
      role: 'admin',
    });
    expect(component.canEdit()).toBe(true);
    expect(component.canDelete()).toBe(true);
  });

  it('should deny edit/delete for non-author non-admin user', () => {
    fixture.componentRef.setInput('post', {
      id: 'p1',
      title: 'T',
      content: 'C',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: 'author-1',
        name: 'Author',
        email: 'author@example.com',
        avatarUrl: null,
        role: 'user',
      },
    } as any);

    fixture.componentRef.setInput('currentUser', {
      id: 'other-user',
      email: 'other@example.com',
      name: 'Other',
      avatarUrl: null,
      provider: 'local',
      emailVerified: true,
      role: 'user',
    });

    expect(component.canEdit()).toBe(false);
    expect(component.canDelete()).toBe(false);
  });

  it('should emit edit event and stop propagation', () => {
    const postData = {
      id: 'p1',
      title: 'T',
      content: 'C',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: 'u1', name: 'A', email: 'a@a.com', avatarUrl: null, role: 'user' },
    } as any;
    fixture.componentRef.setInput('post', postData);

    const stopPropagation = vi.fn();
    const editSpy = vi.fn();
    component.edit.subscribe(editSpy);

    component.handleEdit({ stopPropagation } as any);

    expect(stopPropagation).toHaveBeenCalled();
    expect(editSpy).toHaveBeenCalledWith(postData);
  });

  it('should emit delete event and stop propagation', () => {
    fixture.componentRef.setInput('post', {
      id: 'p1',
      title: 'T',
      content: 'C',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: 'u1', name: 'A', email: 'a@a.com', avatarUrl: null, role: 'user' },
    } as any);

    const stopPropagation = vi.fn();
    const deleteSpy = vi.fn();
    component.delete.subscribe(deleteSpy);

    component.handleDelete({ stopPropagation } as any);

    expect(stopPropagation).toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalledWith('p1');
  });

  it('should no-op handleEdit/handleDelete when post is missing', () => {
    fixture.componentRef.setInput('post', undefined);
    const stopPropagation = vi.fn();
    const editSpy = vi.fn();
    const deleteSpy = vi.fn();
    component.edit.subscribe(editSpy);
    component.delete.subscribe(deleteSpy);

    component.handleEdit({ stopPropagation } as any);
    component.handleDelete({ stopPropagation } as any);

    expect(stopPropagation).toHaveBeenCalledTimes(2);
    expect(editSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('should use post reaction values when local state is empty', () => {
    fixture.componentRef.setInput('post', {
      id: 'p1',
      title: 'T',
      content: 'C',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: 4,
      dislikes: 2,
      userReaction: 1,
      author: { id: 'u1', name: 'A', email: 'a@a.com', avatarUrl: null, role: 'user' },
    } as any);

    expect(component.getLikes()).toBe(4);
    expect(component.getDislikes()).toBe(2);
    expect(component.getUserReaction()).toBe(1);
  });

  it('should handle like/dislike reactions with optimistic local updates', () => {
    fixture.componentRef.setInput('post', {
      id: 'p1',
      title: 'T',
      content: 'C',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: 1,
      dislikes: 0,
      userReaction: null,
      author: { id: 'u1', name: 'A', email: 'a@a.com', avatarUrl: null, role: 'user' },
    } as any);

    const stopPropagation = vi.fn();
    const syncSpy = vi.spyOn(component as any, 'syncReactionToServer');

    component.handleLike({ stopPropagation } as any);
    expect(stopPropagation).toHaveBeenCalled();
    expect(component.getLikes()).toBe(2);
    expect(component.getUserReaction()).toBe(1);
    expect(syncSpy).toHaveBeenCalledWith(1);

    component.handleLike({ stopPropagation } as any);
    expect(component.getLikes()).toBe(1);
    expect(component.getUserReaction()).toBeNull();

    component.handleDislike({ stopPropagation } as any);
    expect(component.getDislikes()).toBe(1);
    expect(component.getUserReaction()).toBe(-1);
    expect(syncSpy).toHaveBeenCalledWith(-1);
  });

  it('should convert like to dislike path in handleDislike', () => {
    fixture.componentRef.setInput('post', {
      id: 'p2',
      title: 'T',
      content: 'C',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: 2,
      dislikes: 0,
      userReaction: 1,
      author: { id: 'u1', name: 'A', email: 'a@a.com', avatarUrl: null, role: 'user' },
    } as any);

    const stopPropagation = vi.fn();
    component.handleDislike({ stopPropagation } as any);

    expect(stopPropagation).toHaveBeenCalled();
    expect(component.getLikes()).toBe(1);
    expect(component.getDislikes()).toBe(1);
    expect(component.getUserReaction()).toBe(-1);
  });

  it('should convert dislike to like path in handleLike', () => {
    fixture.componentRef.setInput('post', {
      id: 'p4',
      title: 'T',
      content: 'C',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: 0,
      dislikes: 2,
      userReaction: -1,
      author: { id: 'u1', name: 'A', email: 'a@a.com', avatarUrl: null, role: 'user' },
    } as any);

    const stopPropagation = vi.fn();
    component.handleLike({ stopPropagation } as any);

    expect(stopPropagation).toHaveBeenCalled();
    expect(component.getLikes()).toBe(1);
    expect(component.getDislikes()).toBe(1);
    expect(component.getUserReaction()).toBe(1);
  });

  it('should toggle dislike off when already disliked', () => {
    fixture.componentRef.setInput('post', {
      id: 'p3',
      title: 'T',
      content: 'C',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: 0,
      dislikes: 2,
      userReaction: -1,
      author: { id: 'u1', name: 'A', email: 'a@a.com', avatarUrl: null, role: 'user' },
    } as any);

    const stopPropagation = vi.fn();
    component.handleDislike({ stopPropagation } as any);

    expect(stopPropagation).toHaveBeenCalled();
    expect(component.getDislikes()).toBe(1);
    expect(component.getUserReaction()).toBeNull();
  });

  it('should ignore like/dislike when post is missing', () => {
    fixture.componentRef.setInput('post', undefined);
    const stopPropagation = vi.fn();
    const syncSpy = vi.spyOn(component as any, 'syncReactionToServer');

    component.handleLike({ stopPropagation } as any);
    component.handleDislike({ stopPropagation } as any);

    expect(stopPropagation).toHaveBeenCalledTimes(2);
    expect(syncSpy).not.toHaveBeenCalled();
  });

  it('should flush pending reaction on destroy', () => {
    const mutate = vi.fn();
    (component as any).reactionMutation = { mutate };
    fixture.componentRef.setInput('post', {
      id: 'p1',
      title: 'T',
      content: 'C',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: 'u1', name: 'A', email: 'a@a.com', avatarUrl: null, role: 'user' },
    } as any);

    const timer = setTimeout(() => {}, 1000);
    (component as any).debounceTimer = timer;
    (component as any).pendingReaction = -1;

    component.ngOnDestroy();

    expect(mutate).toHaveBeenCalledWith(-1);
  });

  it('should build reaction mutation options and invalidate details query', async () => {
    const postQueryServiceMock = {
      toggleReaction: vi.fn(async () => ({ success: true, likes: 1, dislikes: 0 })),
    } as any;
    const localClient = new QueryClient();
    const invalidateSpy = vi.spyOn(localClient, 'invalidateQueries');
    const uiStoreMock = { postsPage: vi.fn(() => 2), postsLimit: vi.fn(() => 5) } as any;
    const post = { id: 'p1' } as any;

    const options = createPostReactionMutationOptions(
      postQueryServiceMock,
      localClient,
      uiStoreMock,
      () => post,
      () => true,
    );

    const result = await options.mutationFn(1);
    expect(result).toEqual({ success: true, likes: 1, dislikes: 0 });

    options.onSuccess();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['posts', 'detail', 'p1'] });
  });

  it('should invalidate list query in reaction options for list mode', () => {
    const postQueryServiceMock = { toggleReaction: vi.fn(async () => ({ success: true })) } as any;
    const localClient = new QueryClient();
    const invalidateSpy = vi.spyOn(localClient, 'invalidateQueries');
    const uiStoreMock = { postsPage: vi.fn(() => 3), postsLimit: vi.fn(() => 10) } as any;
    const post = { id: 'p2' } as any;

    const options = createPostReactionMutationOptions(
      postQueryServiceMock,
      localClient,
      uiStoreMock,
      () => post,
      () => false,
    );

    options.onSuccess();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['posts', 'list', { page: 3, limit: 10 }],
    });
  });

  it('should no-op reaction onSuccess when post is missing', () => {
    const postQueryServiceMock = { toggleReaction: vi.fn(async () => ({ success: true })) } as any;
    const localClient = new QueryClient();
    const invalidateSpy = vi.spyOn(localClient, 'invalidateQueries');
    const uiStoreMock = { postsPage: vi.fn(() => 1), postsLimit: vi.fn(() => 3) } as any;

    const options = createPostReactionMutationOptions(
      postQueryServiceMock,
      localClient,
      uiStoreMock,
      () => undefined,
      () => true,
    );

    options.onSuccess();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('should execute debounced sync callback and clear timer state', () => {
    vi.useFakeTimers();
    const mutate = vi.fn();
    (component as any).reactionMutation = { mutate };

    (component as any).syncReactionToServer(1);
    vi.advanceTimersByTime(800);

    expect(mutate).toHaveBeenCalledWith(1);
    expect((component as any).pendingReaction).toBeNull();
    expect((component as any).debounceTimer).toBeNull();
    vi.useRealTimers();
  });

  it('should clear timer without mutate when pending reaction is null in debounce callback', () => {
    vi.useFakeTimers();
    const mutate = vi.fn();
    (component as any).reactionMutation = { mutate };

    (component as any).syncReactionToServer(1);
    (component as any).pendingReaction = null;
    vi.advanceTimersByTime(800);

    expect(mutate).not.toHaveBeenCalled();
    expect((component as any).debounceTimer).toBeNull();
    vi.useRealTimers();
  });

  it('should clear timer on destroy without mutating when post missing', () => {
    const mutate = vi.fn();
    (component as any).reactionMutation = { mutate };
    fixture.componentRef.setInput('post', undefined);

    const timer = setTimeout(() => {}, 1000);
    (component as any).debounceTimer = timer;
    (component as any).pendingReaction = 1;

    component.ngOnDestroy();

    expect(mutate).not.toHaveBeenCalled();
  });

  it('should return default values when no post and no local reaction', () => {
    fixture.componentRef.setInput('post', undefined);

    expect(component.getLikes()).toBe(0);
    expect(component.getDislikes()).toBe(0);
    expect(component.getUserReaction()).toBeNull();
  });

  it('should create reaction mutation injection factory callback', () => {
    const postQueryServiceMock = { toggleReaction: vi.fn(async () => ({ success: true })) } as any;
    const localClient = new QueryClient();
    const uiStoreMock = { postsPage: vi.fn(() => 1), postsLimit: vi.fn(() => 10) } as any;

    const factory = createPostReactionMutationInjectionFactory(
      postQueryServiceMock,
      localClient,
      uiStoreMock,
      () => ({ id: 'p1' }) as any,
      () => false,
    );

    const options = factory();
    expect(typeof options.mutationFn).toBe('function');
    expect(typeof options.onSuccess).toBe('function');
  });

  it('should create getters for post and detailsMode', () => {
    fixture.componentRef.setInput('post', { id: 'px' } as any);
    fixture.componentRef.setInput('detailsMode', true);

    const postGetter = createPostGetter(component);
    const detailsModeGetter = createDetailsModeGetter(component);

    expect(postGetter()).toEqual({ id: 'px' });
    expect(detailsModeGetter()).toBe(true);
  });
});
