import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { PostComponent } from '../../components/post/post.component';
import { PostFormComponent } from '../../components/post-form/post-form.component';
import type { AuthUser } from '../../services/auth-query.service';
import { AuthQueryService } from '../../services/auth-query.service';
import { PostQueryService } from '../../services/post-query.service';
import { PostService } from '../../services/post.service';
import type { CreatePostDto, Post } from '../../services/post.service';
import { UiStore } from '../../store/ui/ui.store';

type PostsUiStore = {
  postsPage: () => number;
  postsLimit: () => number;
};

export const createPostsListQueryKey = (uiStore: PostsUiStore) =>
  ['posts', 'list', { page: uiStore.postsPage(), limit: uiStore.postsLimit() }] as const;

export const createPostsListQueryOptions = (
  postQueryService: PostQueryService,
  uiStore: PostsUiStore,
) => ({
  queryKey: createPostsListQueryKey(uiStore),
  queryFn: () => postQueryService.fetchPosts(uiStore.postsPage(), uiStore.postsLimit()),
});

export const createCreatePostMutationOptions = (
  postService: PostService,
  postQueryService: PostQueryService,
  showPostForm: WritableSignal<boolean>,
  getPostsQueryKey: () => readonly unknown[],
  getCurrentUser: () => AuthUser | null | undefined,
  setIsCreateSyncPending: (value: boolean) => void,
) => ({
  mutationFn: (data: CreatePostDto) => lastValueFrom(postService.createPost(data)),
  onMutate: async (
    data: CreatePostDto,
    context: {
      client: {
        cancelQueries: (params: { queryKey: readonly unknown[] }) => Promise<void>;
        getQueryData: (queryKey: readonly unknown[]) => unknown;
        setQueryData: (
          queryKey: readonly unknown[],
          updater: (oldData: unknown) => unknown,
        ) => void;
      };
    },
  ) => {
    const queryKey = getPostsQueryKey();
    await context.client.cancelQueries({ queryKey });

    const previousPosts = context.client.getQueryData(queryKey);
    const currentUser = getCurrentUser();
    const optimisticId = `optimistic-${Date.now()}`;
    const nowIso = new Date().toISOString();

    context.client.setQueryData(queryKey, (oldData: any) => {
      if (!oldData?.posts || !oldData?.pagination) return oldData;

      const optimisticPost: Post = {
        id: optimisticId,
        title: data.title,
        content: data.content,
        createdAt: nowIso,
        updatedAt: nowIso,
        author: {
          id: currentUser?.id ?? 'optimistic-user',
          name: currentUser?.name ?? 'You',
          email: currentUser?.email ?? '',
          avatarUrl: currentUser?.avatarUrl ?? null,
          role: currentUser?.role ?? 'user',
        },
        commentsCount: 0,
        likes: 0,
        dislikes: 0,
        userReaction: null,
      };

      return {
        ...oldData,
        posts: [optimisticPost, ...oldData.posts],
        pagination: {
          ...oldData.pagination,
          total: oldData.pagination.total + 1,
        },
      };
    });

    showPostForm.set(false);
    setIsCreateSyncPending(true);

    return { previousPosts, queryKey, optimisticId };
  },
  onSuccess: (
    result: { post: Post },
    _variables: CreatePostDto,
    context: { queryKey?: readonly unknown[]; optimisticId?: string } | undefined,
    mutationContext: {
      client: {
        setQueryData: (
          queryKey: readonly unknown[],
          updater: (oldData: unknown) => unknown,
        ) => void;
      };
    },
  ) => {
    if (context?.queryKey && context.optimisticId) {
      mutationContext.client.setQueryData(context.queryKey, (oldData: any) => {
        if (!oldData?.posts) return oldData;

        return {
          ...oldData,
          posts: oldData.posts.map((post: Post) =>
            post.id === context.optimisticId ? result.post : post,
          ),
        };
      });
    }

    postQueryService.invalidatePosts();
  },
  onError: (
    _error: unknown,
    _variables: CreatePostDto,
    context: { previousPosts?: unknown; queryKey?: readonly unknown[] } | undefined,
    mutationContext: {
      client: { setQueryData: (queryKey: readonly unknown[], data: unknown) => void };
    },
  ) => {
    if (context?.previousPosts && context.queryKey) {
      mutationContext.client.setQueryData(context.queryKey, context.previousPosts);
    }
    setIsCreateSyncPending(false);
  },
  onSettled: () => {
    setIsCreateSyncPending(false);
  },
});

export const createUpdatePostMutationOptions = (
  postService: PostService,
  postQueryService: PostQueryService,
  showPostForm: WritableSignal<boolean>,
  editingPost: WritableSignal<Post | null>,
  getPostsQueryKey: () => readonly unknown[],
) => ({
  mutationFn: ({ id, data }: { id: string; data: { title: string; content: string } }) =>
    lastValueFrom(postService.updatePost(id, data)),
  onMutate: async (
    variables: { id: string; data: { title: string; content: string } },
    context: {
      client: { cancelQueries: (params: { queryKey: readonly unknown[] }) => Promise<void> };
    },
  ) => {
    showPostForm.set(false);
    editingPost.set(null);

    const queryKey = getPostsQueryKey();
    await context.client.cancelQueries({ queryKey });

    const previousPosts = postQueryService.optimisticUpdatePostInList(
      variables.id,
      variables.data,
      queryKey,
    );

    return { previousPosts };
  },
  onError: (
    _err: unknown,
    _variables: unknown,
    onMutateResult: { previousPosts?: unknown } | undefined,
    context: { client: { setQueryData: (queryKey: readonly unknown[], data: unknown) => void } },
  ) => {
    if (onMutateResult?.previousPosts) {
      context.client.setQueryData(getPostsQueryKey(), onMutateResult.previousPosts);
    }
  },
  onSettled: () => {
    postQueryService.invalidatePosts();
  },
});

export const createDeletePostMutationOptions = (
  postService: PostService,
  postQueryService: PostQueryService,
  getPostsQueryKey: () => readonly unknown[],
) => ({
  mutationFn: (postId: string) => lastValueFrom(postService.deletePost(postId)),
  onMutate: async (
    postId: string,
    context: {
      client: {
        cancelQueries: (params: { queryKey: readonly unknown[] }) => Promise<void>;
        getQueryData: (queryKey: readonly unknown[]) => unknown;
        setQueryData: (
          queryKey: readonly unknown[],
          updater: (oldData: unknown) => unknown,
        ) => void;
      };
    },
  ) => {
    const queryKey = getPostsQueryKey();
    await context.client.cancelQueries({ queryKey });

    const previousPosts = context.client.getQueryData(queryKey);
    context.client.setQueryData(queryKey, (oldData: any) => {
      if (!oldData?.posts) return oldData;

      return {
        ...oldData,
        posts: oldData.posts.filter((post: any) => post.id !== postId),
      };
    });

    return { previousPosts, queryKey };
  },
  onError: (
    _error: unknown,
    _postId: string,
    context: { previousPosts?: unknown; queryKey?: readonly unknown[] } | undefined,
    mutationContext: {
      client: { setQueryData: (queryKey: readonly unknown[], data: unknown) => void };
    },
  ) => {
    if (context?.previousPosts && context.queryKey) {
      mutationContext.client.setQueryData(context.queryKey, context.previousPosts);
    }
  },
  onSettled: () => {
    postQueryService.invalidatePosts();
  },
});

export const createPostsListQueryInjectionFactory =
  (postQueryService: PostQueryService, uiStore: PostsUiStore) => () =>
    createPostsListQueryOptions(postQueryService, uiStore);

export const createCreatePostMutationInjectionFactory =
  (
    postService: PostService,
    postQueryService: PostQueryService,
    showPostForm: WritableSignal<boolean>,
    getPostsQueryKey: () => readonly unknown[],
    getCurrentUser: () => AuthUser | null | undefined,
    setIsCreateSyncPending: (value: boolean) => void,
  ) =>
  () =>
    createCreatePostMutationOptions(
      postService,
      postQueryService,
      showPostForm,
      getPostsQueryKey,
      getCurrentUser,
      setIsCreateSyncPending,
    );

export const createUpdatePostMutationInjectionFactory =
  (
    postService: PostService,
    postQueryService: PostQueryService,
    showPostForm: WritableSignal<boolean>,
    editingPost: WritableSignal<Post | null>,
    getPostsQueryKey: () => readonly unknown[],
  ) =>
  () =>
    createUpdatePostMutationOptions(
      postService,
      postQueryService,
      showPostForm,
      editingPost,
      getPostsQueryKey,
    );

export const createDeletePostMutationInjectionFactory =
  (
    postService: PostService,
    postQueryService: PostQueryService,
    getPostsQueryKey: () => readonly unknown[],
  ) =>
  () =>
    createDeletePostMutationOptions(postService, postQueryService, getPostsQueryKey);

@Component({
  selector: 'app-posts-list',
  imports: [PostComponent, PostFormComponent],
  templateUrl: './posts-list.component.html',
  styleUrl: './posts-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostsListComponent {
  private postQueryService = inject(PostQueryService);
  private postService = inject(PostService);
  private authQueryService = inject(AuthQueryService);
  readonly uiStore = inject(UiStore);

  // Состояние модального окна формы
  showPostForm = signal(false);
  editingPost = signal<Post | null>(null);
  deleteDialogPostId = signal<string | null>(null);
  isCreateSyncPending = signal(false);

  // Current user query
  readonly currentUserQuery = injectQuery(this.authQueryService.currentUserQueryOptions);

  // Helper for posts query key
  private getPostsQueryKey = () => createPostsListQueryKey(this.uiStore);

  // Create reactive query that responds to page and limit changes
  readonly postsQuery = injectQuery(
    createPostsListQueryInjectionFactory(this.postQueryService, this.uiStore),
  );

  // Мутация для создания поста
  createPostMutation = injectMutation(
    createCreatePostMutationInjectionFactory(
      this.postService,
      this.postQueryService,
      this.showPostForm,
      this.getPostsQueryKey,
      () => this.currentUserQuery.data(),
      (value: boolean) => this.isCreateSyncPending.set(value),
    ),
  );

  // Мутация для обновления поста
  updatePostMutation = injectMutation(
    createUpdatePostMutationInjectionFactory(
      this.postService,
      this.postQueryService,
      this.showPostForm,
      this.editingPost,
      this.getPostsQueryKey,
    ),
  );

  // Мутация для удаления поста
  deletePostMutation = injectMutation(
    createDeletePostMutationInjectionFactory(
      this.postService,
      this.postQueryService,
      this.getPostsQueryKey,
    ),
  );

  readonly isPostFormSubmitting = computed(
    () => this.createPostMutation.isPending() || this.updatePostMutation.isPending(),
  );

  goToNextPage = () => {
    const currentData = this.postsQuery.data();
    if (currentData?.pagination.hasNext) {
      this.uiStore.nextPostsPage();
      // Prefetch next page for better UX
      this.postQueryService.prefetchNextPage(this.uiStore.postsPage(), this.uiStore.postsLimit());
    }
  };

  goToPreviousPage = () => {
    if (this.uiStore.postsPage() > 1) {
      this.uiStore.prevPostsPage();
      // Prefetch previous page
      this.postQueryService.prefetchPreviousPage(
        this.uiStore.postsPage(),
        this.uiStore.postsLimit(),
      );
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

  handleSavePost = (data: { title: string; content: string }) => {
    const editing = this.editingPost();
    if (editing) {
      this.updatePostMutation.mutate({ id: editing.id, data });
    } else {
      this.createPostMutation.mutate(data);
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

  confirmDeletePost = () => {
    const postId = this.deleteDialogPostId();
    if (!postId) return;

    this.deletePostMutation.mutate(postId);
    this.closeDeleteDialog();
  };
}
