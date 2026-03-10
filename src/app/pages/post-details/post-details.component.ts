import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnDestroy,
  type WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { injectMutation, injectQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { PostComponent } from '../../components/post/post.component';
import { PostFormComponent } from '../../components/post-form/post-form.component';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { IconButtonComponent } from '../../components/ui/icon-button/icon-button.component';
import { LinkButtonComponent } from '../../components/ui/link-button/link-button.component';
import { AuthQueryService } from '../../services/auth-query.service';
import { PostQueryService } from '../../services/post-query.service';
import { PostService } from '../../services/post.service';

export const resolvePostId = (
  paramMap: { get: (key: string) => string | null } | undefined,
): string => paramMap?.get('id') || '';

export const createCommentMutationOptions = (
  postService: PostService,
  postQueryService: PostQueryService,
  getPostId: () => string,
) => ({
  mutationFn: (content: string) =>
    postService
      .createComment({
        postId: getPostId(),
        content,
      })
      .toPromise(),
  onSuccess: async () => {
    await postQueryService.invalidatePost(getPostId());
  },
});

export const createDeleteCommentMutationOptions = (
  postService: PostService,
  postQueryService: PostQueryService,
  queryClient: QueryClient,
  getPostId: () => string,
) => ({
  mutationFn: (commentId: string) => postService.deleteComment(commentId).toPromise(),
  onMutate: async (commentId: string) => {
    const queryKey = ['posts', 'detail', getPostId()];
    await queryClient.cancelQueries({ queryKey });

    const previousData = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData?.comments) return oldData;

      return {
        ...oldData,
        comments: oldData.comments.filter((comment: any) => comment.id !== commentId),
      };
    });

    return { previousData, queryKey };
  },
  onError: (
    _error: unknown,
    _commentId: string,
    context?: { previousData?: unknown; queryKey?: unknown },
  ) => {
    if (context?.previousData && context?.queryKey) {
      queryClient.setQueryData(context.queryKey as any[], context.previousData);
    }
  },
  onSuccess: async () => {
    await postQueryService.invalidatePost(getPostId());
  },
});

export const createDeletePostMutationOptions = (
  postService: PostService,
  postQueryService: PostQueryService,
  queryClient: QueryClient,
  router: Router,
) => ({
  mutationFn: (postId: string) => postService.deletePost(postId).toPromise(),
  onMutate: async (postId: string) => {
    const detailQueryKey = ['posts', 'detail', postId];

    await queryClient.cancelQueries({ queryKey: detailQueryKey });
    await queryClient.cancelQueries({ queryKey: ['posts', 'list'] });

    const previousDetailData = queryClient.getQueryData(detailQueryKey);
    const previousListData = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['posts', 'list'] })
      .map((query) => ({ queryKey: query.queryKey, data: query.state.data }));

    for (const cachedList of previousListData) {
      queryClient.setQueryData(cachedList.queryKey as any[], (oldData: any) => {
        if (!oldData?.posts) return oldData;

        return {
          ...oldData,
          posts: oldData.posts.filter((post: any) => post.id !== postId),
        };
      });
    }

    queryClient.removeQueries({ queryKey: detailQueryKey });

    return { detailQueryKey, previousDetailData, previousListData };
  },
  onError: (
    _error: unknown,
    _postId: string,
    context?: {
      detailQueryKey?: unknown;
      previousDetailData?: unknown;
      previousListData?: Array<{ queryKey: unknown; data: unknown }>;
    },
  ) => {
    if (context?.detailQueryKey) {
      queryClient.setQueryData(context.detailQueryKey as any[], context.previousDetailData);
    }

    for (const cachedList of context?.previousListData ?? []) {
      queryClient.setQueryData(cachedList.queryKey as any[], cachedList.data);
    }
  },
  onSuccess: () => {
    void postQueryService.invalidatePosts();
    router.navigate(['/posts']);
  },
});

export const createUpdatePostMutationOptions = (
  postService: PostService,
  postQueryService: PostQueryService,
  queryClient: QueryClient,
  showPostForm: WritableSignal<boolean>,
) => ({
  mutationFn: (data: { postId: string; title: string; content: string }) =>
    postService.updatePost(data.postId, { title: data.title, content: data.content }).toPromise(),
  onMutate: async (
    variables: { postId: string; title: string; content: string },
    context: { client: { cancelQueries: (params: { queryKey: string[] }) => Promise<void> } },
  ) => {
    showPostForm.set(false);

    const queryKey = ['posts', 'detail', variables.postId];
    await context.client.cancelQueries({ queryKey });

    const detailUpdate = postQueryService.optimisticUpdatePostDetail(variables.postId, {
      title: variables.title,
      content: variables.content,
    });

    return detailUpdate;
  },
  onError: (
    _error: unknown,
    _variables: unknown,
    context?: { previousData?: unknown; queryKey?: unknown },
  ) => {
    if (context?.previousData && context?.queryKey) {
      queryClient.setQueryData(context.queryKey as any[], context.previousData);
    }
  },
  onSettled: async (_data: unknown, _error: unknown, variables: { postId: string }) => {
    await postQueryService.invalidatePost(variables.postId);
  },
});

export const createUpdateCommentMutationOptions = (
  postService: PostService,
  postQueryService: PostQueryService,
  queryClient: QueryClient,
  getPostId: () => string,
  clearEditingComment: () => void,
  restoreEditingComment: (commentId: string, content: string) => void,
) => ({
  mutationFn: (data: { commentId: string; content: string }) =>
    postService.updateComment(data.commentId, { content: data.content }).toPromise(),
  onMutate: async (variables: { commentId: string; content: string }) => {
    const queryKey = ['posts', 'detail', getPostId()];
    await queryClient.cancelQueries({ queryKey });

    const previousData = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData?.comments) return oldData;

      return {
        ...oldData,
        comments: oldData.comments.map((comment: any) =>
          comment.id === variables.commentId
            ? {
                ...comment,
                content: variables.content,
                updatedAt: new Date().toISOString(),
              }
            : comment,
        ),
      };
    });

    clearEditingComment();

    return { previousData, queryKey, variables };
  },
  onError: (
    _error: unknown,
    variables: { commentId: string; content: string },
    context?: { previousData?: unknown; queryKey?: unknown },
  ) => {
    if (context?.previousData && context?.queryKey) {
      queryClient.setQueryData(context.queryKey as any[], context.previousData);
    }

    restoreEditingComment(variables.commentId, variables.content);
  },
  onSuccess: async () => {
    await postQueryService.invalidatePost(getPostId());
  },
});

export const createReactToCommentMutationOptions = (
  postQueryService: PostQueryService,
  getPostId: () => string,
) => ({
  mutationFn: (data: { commentId: string; reaction: 1 | -1 | 0 }) =>
    postQueryService.toggleReaction('comment', data.commentId, data.reaction),
  onSuccess: async () => {
    await postQueryService.invalidatePost(getPostId());
  },
});

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
  private postQueryService = inject(PostQueryService);
  private postService = inject(PostService);
  private authQueryService = inject(AuthQueryService);
  private queryClient = inject(QueryClient);

  // Convert route params to signal
  private paramMap = toSignal(this.actRoute.paramMap);

  readonly postId = computed(() => resolvePostId(this.paramMap()));

  readonly postQuery = this.postQueryService.postQuery(this.postId());
  readonly currentUserQuery = injectQuery(() => this.authQueryService.currentUserQueryOptions());

  // Modal state for post editing
  showPostForm = signal(false);

  // Modal state for delete confirmation
  deleteDialog = signal<{
    type: 'post' | 'comment';
    targetId: string;
  } | null>(null);

  // Editing state for comments
  editingCommentId: string | null = null;
  editCommentContent = '';

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

  ngOnDestroy() {
    // Отправляем все pending реакции немедленно перед закрытием
    this.commentDebounceTimers.forEach((timer, commentId) => {
      clearTimeout(timer);
      const pendingReaction = this.pendingCommentReactions.get(commentId);
      if (pendingReaction !== undefined) {
        this.reactToCommentMutation.mutate({ commentId, reaction: pendingReaction });
      }
    });
    this.commentDebounceTimers.clear();
    this.pendingCommentReactions.clear();
  }

  // Mutation for creating comments
  readonly createCommentMutation = injectMutation(() =>
    createCommentMutationOptions(this.postService, this.postQueryService, this.postId),
  );

  // Mutation for deleting comments
  readonly deleteCommentMutation = injectMutation(() =>
    createDeleteCommentMutationOptions(
      this.postService,
      this.postQueryService,
      this.queryClient,
      this.postId,
    ),
  );

  // Mutation for deleting post
  readonly deletePostMutation = injectMutation(() =>
    createDeletePostMutationOptions(
      this.postService,
      this.postQueryService,
      this.queryClient,
      this.router,
    ),
  );

  // Mutation for updating post with optimistic updates
  readonly updatePostMutation = injectMutation(() =>
    createUpdatePostMutationOptions(
      this.postService,
      this.postQueryService,
      this.queryClient,
      this.showPostForm,
    ),
  );

  // Mutation for updating comment
  readonly updateCommentMutation = injectMutation(() =>
    createUpdateCommentMutationOptions(
      this.postService,
      this.postQueryService,
      this.queryClient,
      this.postId,
      () => this.cancelEditingComment(),
      (commentId: string, content: string) => this.startEditingComment(commentId, content),
    ),
  );

  // Простая мутация для реакций на комментарии
  readonly reactToCommentMutation = injectMutation(() =>
    createReactToCommentMutationOptions(this.postQueryService, this.postId),
  );

  newCommentText = '';

  currentUser = computed(() => this.currentUserQuery.data());

  // Получение локального состояния комментария или из серверных данных
  getCommentLikes(commentId: string): number {
    const local = this.localCommentReactions().get(commentId);
    if (local) return local.likesCount;
    const comment = this.postQuery.data()?.comments.find((c) => c.id === commentId);
    return comment?.likesCount ?? 0;
  }

  getCommentDislikes(commentId: string): number {
    const local = this.localCommentReactions().get(commentId);
    if (local) return local.dislikesCount;
    const comment = this.postQuery.data()?.comments.find((c) => c.id === commentId);
    return comment?.dislikesCount ?? 0;
  }

  getCommentUserReaction(commentId: string): 'like' | 'dislike' | null {
    const local = this.localCommentReactions().get(commentId);
    if (local) return local.userReaction;
    const comment = this.postQuery.data()?.comments.find((c) => c.id === commentId);
    return comment?.userReaction ?? null;
  }

  // Debounced синхронизация с сервером
  private syncCommentReactionToServer(commentId: string, reaction: 1 | -1 | 0) {
    // Сбрасываем предыдущий таймер для этого комментария
    const existingTimer = this.commentDebounceTimers.get(commentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Запоминаем реакцию для отправки
    this.pendingCommentReactions.set(commentId, reaction);

    // Ставим новый таймер на 800мс
    const timer = setTimeout(() => {
      const pendingReaction = this.pendingCommentReactions.get(commentId);
      if (pendingReaction !== undefined) {
        this.reactToCommentMutation.mutate({ commentId, reaction: pendingReaction });
        this.pendingCommentReactions.delete(commentId);
      }
      this.commentDebounceTimers.delete(commentId);
    }, 800);

    this.commentDebounceTimers.set(commentId, timer);
  }

  // Check permissions
  canEditPost = computed(() => {
    const user = this.currentUserQuery.data();
    const post = this.postQuery.data()?.post;
    if (!user || !post) return false;
    return user.id === post.author.id || user.role === 'admin';
  });

  canDeletePost = computed(() => {
    const user = this.currentUserQuery.data();
    const post = this.postQuery.data()?.post;
    if (!user || !post) return false;
    return user.id === post.author.id || user.role === 'admin';
  });

  canEditComment = (authorId: string) => {
    const user = this.currentUserQuery.data();
    if (!user) return false;
    return user.id === authorId || user.role === 'admin';
  };

  canDeleteComment = (authorId: string) => {
    const user = this.currentUserQuery.data();
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

  handleSavePost(data: { title: string; content: string }) {
    const postId = this.postId();
    if (postId && data.title.trim() && data.content.trim()) {
      this.updatePostMutation.mutate({
        postId,
        title: data.title,
        content: data.content,
      });
    }
  }

  // Comment editing
  startEditingComment(commentId: string, content: string) {
    this.editCommentContent = content;
    this.editingCommentId = commentId;
  }

  cancelEditingComment() {
    this.editingCommentId = null;
  }

  saveComment(commentId: string) {
    if (this.editCommentContent.trim()) {
      this.updateCommentMutation.mutate({
        commentId,
        content: this.editCommentContent,
      });
    }
  }

  submitComment(content: string) {
    if (content.trim()) {
      this.createCommentMutation.mutate(content, {
        onSuccess: () => {
          this.newCommentText = '';
        },
      });
    }
  }

  requestDeleteComment(commentId: string) {
    this.deleteDialog.set({ type: 'comment', targetId: commentId });
  }

  requestDeletePost(postId: string) {
    this.deleteDialog.set({ type: 'post', targetId: postId });
  }

  closeDeleteDialog() {
    this.deleteDialog.set(null);
  }

  confirmDelete() {
    const dialog = this.deleteDialog();
    if (!dialog) return;

    if (dialog.type === 'comment') {
      this.deleteCommentMutation.mutate(dialog.targetId);
    } else {
      this.deletePostMutation.mutate(dialog.targetId);
    }

    this.closeDeleteDialog();
  }

  reactToComment(commentId: string, type: 'like' | 'dislike') {
    const post = this.postQuery.data();
    if (!post) return;

    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment) return;

    // Получаем текущую реакцию (локальную или с сервера)
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

    // Убираем старую реакцию
    if (currentReaction === 'like') likesCount--;
    if (currentReaction === 'dislike') dislikesCount--;

    // Добавляем новую реакцию
    if (newReaction === 1) likesCount++;
    if (newReaction === -1) dislikesCount++;

    // Обновляем локальное состояние
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
