import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { AuthUser } from '../../core/auth/session.service';
import { PostsStore } from '../../features/posts/posts.store';
import type { Post } from '../../services/post.service';
import { PostComponent } from './post.component';

const createPost = (overrides: Partial<Post> = {}): Post => ({
  id: 'p1',
  title: 'Title',
  content: 'Content',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  author: { id: 'u1', name: 'Author', email: 'a@a.com', avatarUrl: null, role: 'user' },
  likes: 0,
  dislikes: 0,
  userReaction: null,
  commentsCount: 0,
  ...overrides,
});

const createUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'u1',
  email: 'author@example.com',
  name: 'Author',
  avatarUrl: null,
  provider: 'local',
  emailVerified: true,
  role: 'user',
  ...overrides,
});

const createStopEvent = () => ({ stopPropagation: vi.fn() });

describe('PostComponent', () => {
  let component: PostComponent;
  let fixture: ComponentFixture<PostComponent>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let storeMock: {
    toggleReaction: ReturnType<typeof vi.fn>;
    list: { reload: ReturnType<typeof vi.fn> };
    detail: { reload: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    router = { navigate: vi.fn() };
    storeMock = {
      toggleReaction: vi.fn(() => Promise.resolve({ success: true, likes: 1, dislikes: 0 })),
      list: { reload: vi.fn() },
      detail: { reload: vi.fn() },
    };

    await TestBed.configureTestingModule({
      imports: [PostComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: router },
        { provide: PostsStore, useValue: storeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the loading skeleton while loading', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Loading...');
  });

  it('should render post content when a post is present', () => {
    fixture.componentRef.setInput('post', createPost({ title: 'Hello', content: 'World' }));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hello');
    expect(text).toContain('World');
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
    fixture.componentRef.setInput('post', createPost({ author: createUser({ id: 'u1' }) as Post['author'] }));

    fixture.componentRef.setInput('currentUser', createUser({ id: 'u1', role: 'user' }));
    expect(component.canEdit()).toBe(true);
    expect(component.canDelete()).toBe(true);

    fixture.componentRef.setInput('currentUser', createUser({ id: 'admin', role: 'admin' }));
    expect(component.canEdit()).toBe(true);
    expect(component.canDelete()).toBe(true);
  });

  it('should deny edit/delete for non-author non-admin user', () => {
    fixture.componentRef.setInput(
      'post',
      createPost({ author: createUser({ id: 'author-1' }) as Post['author'] }),
    );
    fixture.componentRef.setInput('currentUser', createUser({ id: 'other-user', role: 'user' }));

    expect(component.canEdit()).toBe(false);
    expect(component.canDelete()).toBe(false);
  });

  it('should emit edit event and stop propagation', () => {
    const post = createPost({ id: 'p1' });
    fixture.componentRef.setInput('post', post);

    const stopPropagation = vi.fn();
    const editSpy = vi.fn();
    component.edit.subscribe(editSpy);

    component.handleEdit({ stopPropagation } as unknown as Event);

    expect(stopPropagation).toHaveBeenCalled();
    expect(editSpy).toHaveBeenCalledWith(post);
  });

  it('should emit delete event and stop propagation', () => {
    fixture.componentRef.setInput('post', createPost({ id: 'p1' }));

    const stopPropagation = vi.fn();
    const deleteSpy = vi.fn();
    component.delete.subscribe(deleteSpy);

    component.handleDelete({ stopPropagation } as unknown as Event);

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

    component.handleEdit({ stopPropagation } as unknown as Event);
    component.handleDelete({ stopPropagation } as unknown as Event);

    expect(stopPropagation).toHaveBeenCalledTimes(2);
    expect(editSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('should use post reaction values when local state is empty', () => {
    fixture.componentRef.setInput('post', createPost({ likes: 4, dislikes: 2, userReaction: 1 }));

    expect(component.getLikes()).toBe(4);
    expect(component.getDislikes()).toBe(2);
    expect(component.getUserReaction()).toBe(1);
  });

  it('should handle like/dislike reactions with optimistic local updates', () => {
    fixture.componentRef.setInput(
      'post',
      createPost({ id: 'p1', likes: 1, dislikes: 0, userReaction: null }),
    );
    const syncSpy = vi
      .spyOn(component as any, 'syncReactionToServer')
      .mockImplementation(() => undefined);

    component.handleLike(createStopEvent() as unknown as Event);
    expect(component.getLikes()).toBe(2);
    expect(component.getUserReaction()).toBe(1);
    expect(syncSpy).toHaveBeenCalledWith(1);

    component.handleLike(createStopEvent() as unknown as Event);
    expect(component.getLikes()).toBe(1);
    expect(component.getUserReaction()).toBeNull();
    expect(syncSpy).toHaveBeenLastCalledWith(0);

    component.handleDislike(createStopEvent() as unknown as Event);
    expect(component.getDislikes()).toBe(1);
    expect(component.getUserReaction()).toBe(-1);
    expect(syncSpy).toHaveBeenLastCalledWith(-1);
  });

  it('should convert like to dislike path in handleDislike', () => {
    fixture.componentRef.setInput(
      'post',
      createPost({ id: 'p2', likes: 2, dislikes: 0, userReaction: 1 }),
    );
    vi.spyOn(component as any, 'syncReactionToServer').mockImplementation(() => undefined);

    const stopPropagation = vi.fn();
    component.handleDislike({ stopPropagation } as unknown as Event);

    expect(stopPropagation).toHaveBeenCalled();
    expect(component.getLikes()).toBe(1);
    expect(component.getDislikes()).toBe(1);
    expect(component.getUserReaction()).toBe(-1);
  });

  it('should convert dislike to like path in handleLike', () => {
    fixture.componentRef.setInput(
      'post',
      createPost({ id: 'p4', likes: 0, dislikes: 2, userReaction: -1 }),
    );
    vi.spyOn(component as any, 'syncReactionToServer').mockImplementation(() => undefined);

    const stopPropagation = vi.fn();
    component.handleLike({ stopPropagation } as unknown as Event);

    expect(stopPropagation).toHaveBeenCalled();
    expect(component.getLikes()).toBe(1);
    expect(component.getDislikes()).toBe(1);
    expect(component.getUserReaction()).toBe(1);
  });

  it('should toggle dislike off when already disliked', () => {
    fixture.componentRef.setInput(
      'post',
      createPost({ id: 'p3', likes: 0, dislikes: 2, userReaction: -1 }),
    );
    vi.spyOn(component as any, 'syncReactionToServer').mockImplementation(() => undefined);

    const stopPropagation = vi.fn();
    component.handleDislike({ stopPropagation } as unknown as Event);

    expect(stopPropagation).toHaveBeenCalled();
    expect(component.getDislikes()).toBe(1);
    expect(component.getUserReaction()).toBeNull();
  });

  it('should ignore like/dislike when post is missing', () => {
    fixture.componentRef.setInput('post', undefined);
    const syncSpy = vi.spyOn(component as any, 'syncReactionToServer');

    const stopPropagation = vi.fn();
    component.handleLike({ stopPropagation } as unknown as Event);
    component.handleDislike({ stopPropagation } as unknown as Event);

    expect(stopPropagation).toHaveBeenCalledTimes(2);
    expect(syncSpy).not.toHaveBeenCalled();
  });

  it('should debounce and sync like reaction to the store', async () => {
    fixture.componentRef.setInput('post', createPost({ id: 'p1' }));
    vi.useFakeTimers();
    try {
      component.handleLike(createStopEvent() as unknown as Event);

      expect(storeMock.toggleReaction).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(800);

      expect(storeMock.toggleReaction).toHaveBeenCalledWith('post', 'p1', 1);
      expect(storeMock.list.reload).not.toHaveBeenCalled();
      expect(storeMock.detail.reload).not.toHaveBeenCalled();
      expect((component as any).pendingReaction).toBeNull();
      expect((component as any).debounceTimer).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should sync debounced reaction to the store in details mode', async () => {
    fixture.componentRef.setInput('post', createPost({ id: 'p1' }));
    fixture.componentRef.setInput('detailsMode', true);
    vi.useFakeTimers();
    try {
      component.handleDislike(createStopEvent() as unknown as Event);

      await vi.advanceTimersByTimeAsync(800);

      expect(storeMock.toggleReaction).toHaveBeenCalledWith('post', 'p1', -1);
      expect(storeMock.list.reload).not.toHaveBeenCalled();
      expect(storeMock.detail.reload).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should swallow errors thrown while sending a debounced reaction', async () => {
    fixture.componentRef.setInput('post', createPost({ id: 'p1' }));
    storeMock.toggleReaction.mockRejectedValueOnce(new Error('boom'));
    vi.useFakeTimers();
    try {
      component.handleLike(createStopEvent() as unknown as Event);

      await vi.advanceTimersByTimeAsync(800);

      expect(storeMock.toggleReaction).toHaveBeenCalledWith('post', 'p1', 1);
      expect(storeMock.list.reload).not.toHaveBeenCalled();
      expect(storeMock.detail.reload).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should resolve without calling the store when sending a reaction without a post', async () => {
    fixture.componentRef.setInput('post', undefined);

    await expect((component as any).sendReaction(1)).resolves.toBeUndefined();
    expect(storeMock.toggleReaction).not.toHaveBeenCalled();
  });

  it('should debounce rapid reactions into a single request', async () => {
    fixture.componentRef.setInput('post', createPost({ id: 'p1', likes: 1, userReaction: null }));
    vi.useFakeTimers();
    try {
      component.handleLike(createStopEvent() as unknown as Event);
      component.handleLike(createStopEvent() as unknown as Event);

      await vi.advanceTimersByTimeAsync(800);

      expect(storeMock.toggleReaction).toHaveBeenCalledTimes(1);
      expect(storeMock.toggleReaction).toHaveBeenCalledWith('post', 'p1', 0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should clear the debounce timer without sending when pending reaction is cleared', async () => {
    fixture.componentRef.setInput('post', createPost({ id: 'p1' }));
    vi.useFakeTimers();
    try {
      (component as any).syncReactionToServer(1);
      (component as any).pendingReaction = null;

      await vi.advanceTimersByTimeAsync(800);

      expect(storeMock.toggleReaction).not.toHaveBeenCalled();
      expect((component as any).debounceTimer).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should flush pending reaction on destroy', () => {
    fixture.componentRef.setInput('post', createPost({ id: 'p1' }));
    (component as any).debounceTimer = setTimeout(() => {}, 1000);
    (component as any).pendingReaction = -1;

    component.ngOnDestroy();

    expect(storeMock.toggleReaction).toHaveBeenCalledWith('post', 'p1', -1);
  });

  it('should clear timer on destroy without sending when post is missing', () => {
    fixture.componentRef.setInput('post', undefined);
    (component as any).debounceTimer = setTimeout(() => {}, 1000);
    (component as any).pendingReaction = 1;

    component.ngOnDestroy();

    expect(storeMock.toggleReaction).not.toHaveBeenCalled();
  });

  it('should return default values when no post and no local reaction', () => {
    fixture.componentRef.setInput('post', undefined);

    expect(component.getLikes()).toBe(0);
    expect(component.getDislikes()).toBe(0);
    expect(component.getUserReaction()).toBeNull();
  });
});
