import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { PostComponent } from '../../components/post/post.component';
import { PostFormComponent } from '../../components/post-form/post-form.component';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { SessionService } from '../../core/auth/session.service';
import { PostsStore } from '../../features/posts/posts.store';
import type { Post } from '../../services/post.service';

@Component({
  selector: 'app-posts-list',
  imports: [ButtonComponent, PostComponent, PostFormComponent],
  templateUrl: './posts-list.component.html',
  styleUrl: './posts-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostsListComponent {
  private store = inject(PostsStore);
  readonly session = inject(SessionService);

  private postsSection = viewChild<ElementRef<HTMLElement>>('postsSection');

  // Серверное состояние — из кэша страниц в PostsStore
  readonly pageData = this.store.currentPageData;
  readonly isListLoading = this.store.isListLoading;
  readonly listError = this.store.listError;
  readonly page = this.store.page;
  readonly totalPosts = this.store.totalPosts;
  readonly totalPages = this.store.totalPages;
  readonly hasNextPage = this.store.hasNextPage;
  readonly hasPrevPage = this.store.hasPrevPage;
  readonly currentUser = this.session.currentUser;

  // Состояние модального окна формы
  showPostForm = signal(false);
  editingPost = signal<Post | null>(null);
  deleteDialogPostId = signal<string | null>(null);
  isCreateSyncPending = signal(false);
  isDeleting = signal(false);

  readonly isPostFormSubmitting = computed(() => this.isCreateSyncPending());

  goToNextPage = () => {
    if (this.hasNextPage()) {
      this.store.nextPage();
      this.postsSection()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  goToPreviousPage = () => {
    if (this.hasPrevPage()) {
      this.store.previousPage();
      this.postsSection()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  openPostForm = () => {
    this.editingPost.set(null);
    this.showPostForm.set(true);
  };

  closePostForm = () => {
    this.showPostForm.set(false);
    this.editingPost.set(null);
  };

  handleSavePost = async (data: { title: string; content: string }): Promise<void> => {
    const editing = this.editingPost();
    this.isCreateSyncPending.set(true);
    try {
      if (editing) {
        await this.store.updatePost(editing.id, data);
      } else {
        await this.store.createPost(data);
      }
      this.closePostForm();
    } finally {
      this.isCreateSyncPending.set(false);
    }
  };

  handleEditPost = (post: Post) => {
    this.editingPost.set(post);
    this.showPostForm.set(true);
  };

  handleDeletePost = (postId: string) => {
    this.deleteDialogPostId.set(postId);
  };

  closeDeleteDialog = () => {
    this.deleteDialogPostId.set(null);
  };

  confirmDeletePost = async (): Promise<void> => {
    const postId = this.deleteDialogPostId();
    if (!postId) return;

    this.isDeleting.set(true);
    try {
      await this.store.deletePost(postId);
    } finally {
      this.isDeleting.set(false);
      this.closeDeleteDialog();
    }
  };
}
