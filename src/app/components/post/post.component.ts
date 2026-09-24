import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import type { AuthUser } from '../../core/auth/session.service';
import { PostsStore } from '../../features/posts/posts.store';
import type { Post } from '../../services/post.service';
import { AvatarComponent } from '../avatar/avatar.component';
import { IconButtonComponent } from '../ui/icon-button/icon-button.component';

@Component({
  selector: 'app-post',
  imports: [DatePipe, AvatarComponent, IconButtonComponent],
  templateUrl: './post.component.html',
  styleUrl: './post.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostComponent implements OnDestroy {
  post = input<Post>();
  currentUser = input<AuthUser | null>();
  isLoading = input(false);
  detailsMode = input(false);
  edit = output<Post>();
  delete = output<string>();

  private router = inject(Router);
  private store = inject(PostsStore);

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
      if (this.pendingReaction !== null && this.post()) {
        void this.sendReaction(this.pendingReaction);
      }
    }
  }

  // Проверка прав
  canEdit() {
    const user = this.currentUser();
    const post = this.post();
    if (!user || !post) return false;
    return user.id === post.author.id || user.role === 'admin';
  }

  canDelete() {
    const user = this.currentUser();
    const post = this.post();
    if (!user || !post) return false;
    return user.id === post.author.id || user.role === 'admin';
  }

  handleEdit(event: Event) {
    event.stopPropagation();
    const post = this.post();
    if (!post) return;
    this.edit.emit(post);
  }

  handleDelete(event: Event) {
    event.stopPropagation();
    const post = this.post();
    if (!post) return;
    this.delete.emit(post.id);
  }

  openDetails(id: string) {
    this.router.navigate([`/posts/${id}`]);
  }

  // Реакция: патчим счётчики в сторе без полного reload (фон, без мигания)
  private sendReaction(reaction: 1 | -1 | 0): Promise<void> {
    const post = this.post();
    if (!post) return Promise.resolve();

    return this.store
      .toggleReaction('post', post.id, reaction)
      .then(() => undefined)
      .catch(() => {
        // Откат: стор уже вернул прежнее состояние — показываем серверное значение.
        this.localReaction.set(null);
        return undefined;
      });
  }

  // Debounced синхронизация с сервером
  private syncReactionToServer(reaction: 1 | -1 | 0) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.pendingReaction = reaction;

    this.debounceTimer = setTimeout(() => {
      if (this.pendingReaction !== null) {
        void this.sendReaction(this.pendingReaction);
        this.pendingReaction = null;
      }
      this.debounceTimer = null;
    }, 800);
  }

  handleLike(event: Event) {
    event.stopPropagation();
    if (!this.post()) return;

    const currentReaction = this.getUserReaction();
    const newReaction: 1 | 0 = currentReaction === 1 ? 0 : 1;

    let likes = this.getLikes();
    let dislikes = this.getDislikes();

    if (currentReaction === 1) likes--;
    if (currentReaction === -1) dislikes--;
    if (newReaction === 1) likes++;

    this.localReaction.set({
      likes,
      dislikes,
      userReaction: newReaction === 0 ? null : newReaction,
    });

    this.syncReactionToServer(newReaction);
  }

  handleDislike(event: Event) {
    event.stopPropagation();
    if (!this.post()) return;

    const currentReaction = this.getUserReaction();
    const newReaction: -1 | 0 = currentReaction === -1 ? 0 : -1;

    let likes = this.getLikes();
    let dislikes = this.getDislikes();

    if (currentReaction === 1) likes--;
    if (currentReaction === -1) dislikes--;
    if (newReaction === -1) dislikes++;

    this.localReaction.set({
      likes,
      dislikes,
      userReaction: newReaction === 0 ? null : newReaction,
    });

    this.syncReactionToServer(newReaction);
  }

  getLikes() {
    const local = this.localReaction();
    if (local) return local.likes;
    return this.post()?.likes ?? 0;
  }

  getDislikes() {
    const local = this.localReaction();
    if (local) return local.dislikes;
    return this.post()?.dislikes ?? 0;
  }

  getUserReaction() {
    const local = this.localReaction();
    if (local) return local.userReaction;
    return this.post()?.userReaction ?? null;
  }
}
