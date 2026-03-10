import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  Output,
  EventEmitter,
  signal,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import { injectMutation, QueryClient } from '@tanstack/angular-query-experimental';
import type { AuthUser } from '../../services/auth-query.service';
import { PostQueryService } from '../../services/post-query.service';
import type { Post } from '../../services/post.service';
import { UiStore } from '../../store/ui/ui.store';
import { AvatarComponent } from '../avatar/avatar.component';
import { IconButtonComponent } from '../ui/icon-button/icon-button.component';

type PostsPaginationStore = {
  postsPage: () => number;
  postsLimit: () => number;
};

export const createPostReactionMutationOptions = (
  postQueryService: PostQueryService,
  queryClient: QueryClient,
  uiStore: PostsPaginationStore,
  getPost: () => Post | undefined,
  detailsMode: () => boolean,
) => ({
  mutationFn: (reaction: 1 | -1 | 0) =>
    postQueryService.toggleReaction('post', getPost()!.id, reaction),
  onSuccess: () => {
    const post = getPost();
    if (!post) return;

    if (detailsMode()) {
      queryClient.invalidateQueries({ queryKey: ['posts', 'detail', post.id] });
    } else {
      const queryKey = [
        'posts',
        'list',
        { page: uiStore.postsPage(), limit: uiStore.postsLimit() },
      ];
      queryClient.invalidateQueries({ queryKey });
    }
  },
});

export const createPostReactionMutationInjectionFactory =
  (
    postQueryService: PostQueryService,
    queryClient: QueryClient,
    uiStore: PostsPaginationStore,
    getPost: () => Post | undefined,
    detailsMode: () => boolean,
  ) =>
  () =>
    createPostReactionMutationOptions(postQueryService, queryClient, uiStore, getPost, detailsMode);

export const createPostGetter = (component: PostComponent) => () => component.post;
export const createDetailsModeGetter = (component: PostComponent) => () => component.detailsMode;

@Component({
  selector: 'app-post',
  imports: [DatePipe, AvatarComponent, IconButtonComponent],
  templateUrl: './post.component.html',
  styleUrl: './post.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostComponent implements OnDestroy {
  @Input() post?: Post;
  @Input() currentUser?: AuthUser | null;
  @Input() isLoading = false;
  @Input() detailsMode = false;
  @Output() edit = new EventEmitter<Post>();
  @Output() delete = new EventEmitter<string>();

  private router = inject(Router);
  private postQueryService = inject(PostQueryService);
  private queryClient = inject(QueryClient);
  private uiStore = inject(UiStore);

  private getPost = createPostGetter(this);
  private getDetailsMode = createDetailsModeGetter(this);

  // Локальное состояние реакций с дебаунсом
  private localReaction = signal<{
    likes: number;
    dislikes: number;
    userReaction: 1 | -1 | null;
  } | null>(null);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingReaction: 1 | -1 | 0 | null = null;

  ngOnDestroy() {
    // Отправляем pending реакцию немедленно перед уничтожением компонента
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      if (this.pendingReaction !== null && this.post) {
        this.reactionMutation.mutate(this.pendingReaction);
      }
    }
  }

  // Простая мутация для реакций без оптимистических обновлений
  reactionMutation = injectMutation(
    createPostReactionMutationInjectionFactory(
      this.postQueryService,
      this.queryClient,
      this.uiStore,
      this.getPost,
      this.getDetailsMode,
    ),
  );

  // Проверка прав
  canEdit() {
    if (!this.currentUser || !this.post) return false;
    return this.currentUser.id === this.post.author.id || this.currentUser.role === 'admin';
  }

  canDelete() {
    if (!this.currentUser || !this.post) return false;
    return this.currentUser.id === this.post.author.id || this.currentUser.role === 'admin';
  }

  handleEdit(event: Event) {
    event.stopPropagation();
    if (!this.post) return;
    this.edit.emit(this.post);
  }

  handleDelete(event: Event) {
    event.stopPropagation();
    if (!this.post) return;
    this.delete.emit(this.post.id);
  }

  openDetails(id: string) {
    this.router.navigate([`/posts/${id}`]);
  }

  // Debounced синхронизация с сервером
  private syncReactionToServer(reaction: 1 | -1 | 0) {
    // Сбрасываем предыдущий таймер
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Запоминаем реакцию для отправки
    this.pendingReaction = reaction;

    // Ставим новый таймер на 800мс
    this.debounceTimer = setTimeout(() => {
      if (this.pendingReaction !== null) {
        this.reactionMutation.mutate(this.pendingReaction);
        this.pendingReaction = null;
      }
      this.debounceTimer = null;
    }, 800);
  }

  handleLike(event: Event) {
    event.stopPropagation();
    if (!this.post) return;

    // Получаем текущую реакцию (локальную или из поста)
    const currentReaction = this.getUserReaction();
    const newReaction: 1 | 0 = currentReaction === 1 ? 0 : 1;

    // Мгновенно обновляем локальное состояние
    let likes = this.getLikes();
    let dislikes = this.getDislikes();

    // Убираем старую реакцию
    if (currentReaction === 1) likes--;
    if (currentReaction === -1) dislikes--;

    // Добавляем новую реакцию
    if (newReaction === 1) likes++;

    // Обновляем локальное состояние
    this.localReaction.set({
      likes,
      dislikes,
      userReaction: newReaction === 0 ? null : newReaction,
    });

    // Debounced отправка на сервер
    this.syncReactionToServer(newReaction);
  }

  handleDislike(event: Event) {
    event.stopPropagation();
    if (!this.post) return;

    // Получаем текущую реакцию (локальную или из поста)
    const currentReaction = this.getUserReaction();
    const newReaction: -1 | 0 = currentReaction === -1 ? 0 : -1;

    // Мгновенно обновляем локальное состояние
    let likes = this.getLikes();
    let dislikes = this.getDislikes();

    // Убираем старую реакцию
    if (currentReaction === 1) likes--;
    if (currentReaction === -1) dislikes--;

    // Добавляем новую реакцию
    if (newReaction === -1) dislikes++;

    // Обновляем локальное состояние
    this.localReaction.set({
      likes,
      dislikes,
      userReaction: newReaction === 0 ? null : newReaction,
    });

    // Debounced отправка на сервер
    this.syncReactionToServer(newReaction);
  }

  getLikes() {
    const local = this.localReaction();
    if (local) return local.likes;
    return this.post?.likes ?? 0;
  }

  getDislikes() {
    const local = this.localReaction();
    if (local) return local.dislikes;
    return this.post?.dislikes ?? 0;
  }

  getUserReaction() {
    const local = this.localReaction();
    if (local) return local.userReaction;
    return this.post?.userReaction ?? null;
  }
}
