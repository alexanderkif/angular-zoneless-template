import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService, type AuthUser } from '../../core/auth/session.service';
import { PostsStore } from '../../features/posts/posts.store';
import type { Post } from '../../services/post.service';
import { PostsListComponent } from './posts-list.component';

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
  currentPageData: signal<Post[]>([]),
  isListLoading: signal(false),
  listError: signal<Error | undefined>(undefined),
  page: signal(1),
  totalPosts: signal(0),
  totalPages: signal(1),
  hasNextPage: signal(false),
  hasPrevPage: signal(false),
  nextPage: vi.fn(),
  previousPage: vi.fn(),
  createPost: vi.fn(async () => undefined),
  updatePost: vi.fn(async () => undefined),
  deletePost: vi.fn(async () => undefined),
});

const createSessionMock = () => ({
  currentUser: { value: signal<AuthUser | null>(null) },
});

describe('PostsListComponent', () => {
  let component: PostsListComponent;
  let fixture: ComponentFixture<PostsListComponent>;
  let storeMock: ReturnType<typeof createStoreMock>;
  let sessionMock: ReturnType<typeof createSessionMock>;

  beforeEach(async () => {
    storeMock = createStoreMock();
    sessionMock = createSessionMock();

    await TestBed.configureTestingModule({
      imports: [PostsListComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PostsStore, useValue: storeMock },
        { provide: SessionService, useValue: sessionMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostsListComponent);
    component = fixture.componentInstance;
    // scrollIntoView is not implemented in JSDOM
    Element.prototype.scrollIntoView = vi.fn();
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose page data and current user', () => {
    sessionMock.currentUser.value.set(createUser({ id: 'u-cur' }));
    storeMock.currentPageData.set([createPost()]);

    expect(component.pageData()).toEqual([createPost()]);
    expect(component.currentUser.value()?.id).toBe('u-cur');
  });

  it('should render loading state', () => {
    storeMock.isListLoading.set(true);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading posts...');
  });

  it('should render error state', () => {
    storeMock.listError.set(new Error('boom'));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Error loading posts');
    expect(fixture.nativeElement.textContent).toContain('boom');
  });

  it('should render posts on success', async () => {
    storeMock.currentPageData.set([createPost({ title: 'Rendered Post' })]);
    storeMock.totalPosts.set(1);
    storeMock.page.set(1);
    storeMock.totalPages.set(1);
    storeMock.hasPrevPage.set(false);
    storeMock.hasNextPage.set(false);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Posts (1 total)');
    expect(fixture.nativeElement.textContent).toContain('Rendered Post');
    expect(fixture.nativeElement.textContent).toContain('Page 1 of 1');
  });

  it('should render empty list with zero total', async () => {
    storeMock.currentPageData.set([]);
    storeMock.totalPosts.set(0);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Posts (0 total)');
  });

  it('should toggle post form visibility', () => {
    expect(component.showPostForm()).toBe(false);

    component.openPostForm();
    expect(component.showPostForm()).toBe(true);

    component.closePostForm();
    expect(component.showPostForm()).toBe(false);
  });

  it('should open form in create mode and reset editing post', () => {
    component.editingPost.set(createPost());

    component.openPostForm();

    expect(component.editingPost()).toBeNull();
    expect(component.showPostForm()).toBe(true);
  });

  it('should set editing post in handleEditPost', () => {
    const post = createPost({ id: 'p100' });

    component.handleEditPost(post);

    expect(component.editingPost()).toBe(post);
    expect(component.showPostForm()).toBe(true);
  });

  it('should create post in handleSavePost when not editing', async () => {
    storeMock.createPost.mockResolvedValue(undefined);
    component.openPostForm();

    await component.handleSavePost({ title: 'T', content: 'C' });

    expect(storeMock.createPost).toHaveBeenCalledWith({ title: 'T', content: 'C' });
    expect(storeMock.updatePost).not.toHaveBeenCalled();
    expect(component.showPostForm()).toBe(false);
    expect(component.isCreateSyncPending()).toBe(false);
  });

  it('should update post in handleSavePost when editing', async () => {
    storeMock.updatePost.mockResolvedValue(undefined);
    component.handleEditPost(createPost({ id: 'p1' }));

    await component.handleSavePost({ title: 'T2', content: 'C2' });

    expect(storeMock.updatePost).toHaveBeenCalledWith('p1', { title: 'T2', content: 'C2' });
    expect(storeMock.createPost).not.toHaveBeenCalled();
    expect(component.editingPost()).toBeNull();
    expect(component.showPostForm()).toBe(false);
  });

  it('should reset submitting state when create fails', async () => {
    storeMock.createPost.mockRejectedValueOnce(new Error('create failed'));
    component.openPostForm();

    await expect(component.handleSavePost({ title: 'T', content: 'C' })).rejects.toThrow(
      'create failed',
    );

    expect(component.isCreateSyncPending()).toBe(false);
    expect(component.showPostForm()).toBe(true);
  });

  it('should go to next page when hasNextPage is true', () => {
    storeMock.hasNextPage.set(true);

    component.goToNextPage();

    expect(storeMock.nextPage).toHaveBeenCalledTimes(1);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('should not go to next page when hasNextPage is false', () => {
    storeMock.hasNextPage.set(false);

    component.goToNextPage();

    expect(storeMock.nextPage).not.toHaveBeenCalled();
  });

  it('should go to previous page when hasPrevPage is true', () => {
    storeMock.hasPrevPage.set(true);

    component.goToPreviousPage();

    expect(storeMock.previousPage).toHaveBeenCalledTimes(1);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('should not go to previous page when hasPrevPage is false', () => {
    storeMock.hasPrevPage.set(false);

    component.goToPreviousPage();

    expect(storeMock.previousPage).not.toHaveBeenCalled();
  });

  it('should tolerate pagination before the posts section is rendered', () => {
    storeMock.hasNextPage.set(true);
    storeMock.hasPrevPage.set(true);
    const isolatedFixture = TestBed.createComponent(PostsListComponent);
    const isolated = isolatedFixture.componentInstance;

    isolated.goToNextPage();
    isolated.goToPreviousPage();

    expect(storeMock.nextPage).toHaveBeenCalledTimes(1);
    expect(storeMock.previousPage).toHaveBeenCalledTimes(1);
  });

  it('should open delete dialog and confirm deletion', async () => {
    storeMock.deletePost.mockResolvedValue(undefined);

    component.handleDeletePost('p-del');
    expect(component.deleteDialogPostId()).toBe('p-del');

    await component.confirmDeletePost();

    expect(storeMock.deletePost).toHaveBeenCalledWith('p-del');
    expect(component.deleteDialogPostId()).toBeNull();
    expect(component.isDeleting()).toBe(false);
  });

  it('should close delete dialog without deletion', () => {
    component.handleDeletePost('p-del');

    component.closeDeleteDialog();

    expect(storeMock.deletePost).not.toHaveBeenCalled();
    expect(component.deleteDialogPostId()).toBeNull();
  });

  it('should ignore confirmDeletePost when dialog is closed', async () => {
    await component.confirmDeletePost();

    expect(storeMock.deletePost).not.toHaveBeenCalled();
  });

  it('should reflect locally pending state in isPostFormSubmitting', () => {
    expect(component.isPostFormSubmitting()).toBe(false);

    component.isCreateSyncPending.set(true);
    expect(component.isPostFormSubmitting()).toBe(true);

    component.isCreateSyncPending.set(false);
    expect(component.isPostFormSubmitting()).toBe(false);
  });
});
