import { DatePipe, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { PostComponent } from '../../components/post/post.component';
import { PostFormComponent } from '../../components/post-form/post-form.component';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { IconButtonComponent } from '../../components/ui/icon-button/icon-button.component';
import { LinkButtonComponent } from '../../components/ui/link-button/link-button.component';
import { SessionService } from '../../core/auth/session.service';
import { PostsStore } from '../../features/posts/posts.store';
import { WINDOW } from '../../tokens/window.token';

export const resolvePostId = (
  paramMap: { get: (key: string) => string | null } | undefined,
): string => paramMap?.get('id') || '';

@Component({
  selector: 'app-post-details',
  imports: [
    ButtonComponent,
    IconButtonComponent,
    LinkButtonComponent,
    DatePipe,
    FormsModule,
    AvatarComponent,
    PostComponent,
    PostFormComponent,
  ],
  templateUrl: './post-details.component.html',
  styleUrl: './post-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetailsComponent implements OnDestroy {
  private actRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(PostsStore);
  private session = inject(SessionService);
  private window = inject(WINDOW);
  private platformId = inject(PLATFORM_ID);
  private host = inject(ElementRef<HTMLElement>);

  // Convert route params to signal
  private paramMap = toSignal(this.actRoute.paramMap);

  readonly postId = computed(() => resolvePostId(this.paramMap()));

  // Детали (комментарии) — из PostsStore; пост рендерим мгновенно из кэша списка
  readonly postQuery = this.store.detail;
  readonly post = this.store.selectedPost;
  readonly comments = this.store.comments;
  readonly currentUser = computed(() => this.session.currentUser.value());

  // Modal state for post editing
  showPostForm = signal(false);

  // Modal state for delete confirmation
  deleteDialog = signal<{
    type: 'post' | 'comment';
    targetId: string;
  } | null>(null);

  // Editing state for comments
  editingCommentId = signal<string | null>(null);
  editCommentContent = signal('');

  newCommentText = signal('');

  // Локальные pending-состояния действий (замена mutation.isPending())
  isCreatingComment = signal(false);
  isUpdatingComment = signal(false);
  isDeletingComment = signal(false);
  isDeletingPost = signal(false);
  isUpdatingPost = signal(false);

  // Локальное состояние реакций на комментарии
  private localCommentReactions = signal<
    Map<
      string,
      {
        likesCount: number;
        dislikesCount: number;
        userReaction: 'like' | 'dislike' | null;
      }
    >
  >(new Map());

  private commentDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingCommentReactions = new Map<string, 1 | -1 | 0>();

  constructor() {
    // Синхронизируем id из роута в стор, чтобы загрузился detail-ресурс
    effect(() => {
      this.store.selectPost(this.postId());
    });

    // Скроллим наверх ПОСЛЕ рендера — иначе контент ещё не отрисован и скролл не виден.
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.scrollToTop();
      }
    });
  }

  /** Плавный скролл наверх (как при пагинации); при `prefers-reduced-motion` — мгновенно. */
  private scrollToTop(): void {
    const reduceMotion = this.window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.host.nativeElement.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  ngOnDestroy() {
    // Отправляем все pending реакции немедленно перед закрытием
    this.commentDebounceTimers.forEach((timer, commentId) => {
      clearTimeout(timer);
      const pendingReaction = this.pendingCommentReactions.get(commentId);
      if (pendingReaction !== undefined) {
        void this.store
          .toggleReaction('comment', commentId, pendingReaction)
          .catch(() => this.revertLocalCommentReaction(commentId));
      }
    });
    this.commentDebounceTimers.clear();
    this.pendingCommentReactions.clear();
  }

  // Check permissions
  canEditPost = computed(() => {
    const user = this.currentUser();
    const post = this.store.selectedPost();
    if (!user || !post) return false;
    return user.id === post.author.id || user.role === 'admin';
  });

  canDeletePost = computed(() => {
    const user = this.currentUser();
    const post = this.store.selectedPost();
    if (!user || !post) return false;
    return user.id === post.author.id || user.role === 'admin';
  });

  canEditComment = (authorId: string) => {
    const user = this.currentUser();
    if (!user) return false;
    return user.id === authorId || user.role === 'admin';
  };

  canDeleteComment = (authorId: string) => {
    const user = this.currentUser();
    if (!user) return false;
    return user.id === authorId || user.role === 'admin';
  };

  // Post editing - modal
  startEditingPost() {
    this.showPostForm.set(true);
  }

  closePostForm() {
    this.showPostForm.set(false);
  }

  handleSavePost = async (data: { title: string; content: string }): Promise<void> => {
    const postId = this.postId();
    if (!postId || !data.title.trim() || !data.content.trim()) return;

    this.isUpdatingPost.set(true);
    try {
      await this.store.updatePost(postId, { title: data.title, content: data.content });
      this.closePostForm();
    } finally {
      this.isUpdatingPost.set(false);
    }
  };

  // Comment editing
  startEditingComment(commentId: string, content: string) {
    this.editCommentContent.set(content);
    this.editingCommentId.set(commentId);
  }

  cancelEditingComment() {
    this.editingCommentId.set(null);
  }

  saveComment = async (commentId: string): Promise<void> => {
    if (!this.editCommentContent().trim()) return;

    this.isUpdatingComment.set(true);
    try {
      await this.store.updateComment(commentId, this.editCommentContent());
      this.cancelEditingComment();
    } finally {
      this.isUpdatingComment.set(false);
    }
  };

  submitComment = async (content: string): Promise<void> => {
    if (!content.trim()) return;

    this.isCreatingComment.set(true);
    try {
      await this.store.createComment(content);
      this.newCommentText.set('');
    } finally {
      this.isCreatingComment.set(false);
    }
  };

  requestDeleteComment(commentId: string) {
    this.deleteDialog.set({ type: 'comment', targetId: commentId });
  }

  requestDeletePost(postId: string) {
    this.deleteDialog.set({ type: 'post', targetId: postId });
  }

  closeDeleteDialog() {
    this.deleteDialog.set(null);
  }

  confirmDelete = async (): Promise<void> => {
    const dialog = this.deleteDialog();
    if (!dialog) return;

    if (dialog.type === 'comment') {
      this.isDeletingComment.set(true);
      try {
        await this.store.deleteComment(dialog.targetId);
      } finally {
        this.isDeletingComment.set(false);
      }
    } else {
      this.isDeletingPost.set(true);
      try {
        await this.store.deletePost(dialog.targetId);
        this.router.navigate(['/posts']);
      } finally {
        this.isDeletingPost.set(false);
      }
    }

    this.closeDeleteDialog();
  };

  // Получение локального состояния комментария или из серверных данных
  getCommentLikes(commentId: string): number {
    const local = this.localCommentReactions().get(commentId);
    if (local) return local.likesCount;
    const comment = this.comments().find((c) => c.id === commentId);
    return comment?.likesCount ?? 0;
  }

  getCommentDislikes(commentId: string): number {
    const local = this.localCommentReactions().get(commentId);
    if (local) return local.dislikesCount;
    const comment = this.comments().find((c) => c.id === commentId);
    return comment?.dislikesCount ?? 0;
  }

  getCommentUserReaction(commentId: string): 'like' | 'dislike' | null {
    const local = this.localCommentReactions().get(commentId);
    if (local) return local.userReaction;
    const comment = this.comments().find((c) => c.id === commentId);
    return comment?.userReaction ?? null;
  }

  /** Откат локальной оптимистичной реакции комментария (при ошибке запроса). */
  private revertLocalCommentReaction(commentId: string) {
    const next = new Map(this.localCommentReactions());
    next.delete(commentId);
    this.localCommentReactions.set(next);
  }

  // Debounced синхронизация с сервером
  private syncCommentReactionToServer(commentId: string, reaction: 1 | -1 | 0) {
    const existingTimer = this.commentDebounceTimers.get(commentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.pendingCommentReactions.set(commentId, reaction);

    const timer = setTimeout(() => {
      const pendingReaction = this.pendingCommentReactions.get(commentId);
      if (pendingReaction !== undefined) {
        void this.store
          .toggleReaction('comment', commentId, pendingReaction)
          .catch(() => this.revertLocalCommentReaction(commentId));
        this.pendingCommentReactions.delete(commentId);
      }
      this.commentDebounceTimers.delete(commentId);
    }, 800);

    this.commentDebounceTimers.set(commentId, timer);
  }

  reactToComment(commentId: string, type: 'like' | 'dislike') {
    const comment = this.comments().find((c) => c.id === commentId);
    if (!comment) return;

    const currentReaction = this.getCommentUserReaction(commentId);
    let newReaction: 1 | -1 | 0;

    if (type === 'like') {
      newReaction = currentReaction === 'like' ? 0 : 1;
    } else {
      newReaction = currentReaction === 'dislike' ? 0 : -1;
    }

    // Мгновенно обновляем локальное состояние
    let likesCount = this.getCommentLikes(commentId);
    let dislikesCount = this.getCommentDislikes(commentId);

    if (currentReaction === 'like') likesCount--;
    if (currentReaction === 'dislike') dislikesCount--;
    if (newReaction === 1) likesCount++;
    if (newReaction === -1) dislikesCount++;

    const newMap = new Map(this.localCommentReactions());
    newMap.set(commentId, {
      likesCount,
      dislikesCount,
      userReaction: newReaction === 0 ? null : newReaction === 1 ? 'like' : 'dislike',
    });
    this.localCommentReactions.set(newMap);

    // Debounced отправка на сервер
    this.syncCommentReactionToServer(commentId, newReaction);
  }
}
