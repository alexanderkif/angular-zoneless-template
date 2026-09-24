import { HttpClient } from '@angular/common/http';
import { computed, inject, isDevMode, resource } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withProps, withState } from '@ngrx/signals';
import { updateState, withDevtools, withDevToolsStub } from '@ngrx-toolkit/core';
import { firstValueFrom } from 'rxjs';
import {
  PostService,
  type Comment,
  type CreatePostDto,
  type Post,
  type PostWithComments,
  type PostsResponse,
  type UpdatePostDto,
} from '../../services/post.service';
import { API_BASE_URL } from '../../tokens/api-url.token';

/** Сколько последних посещённых страниц держим в кэше (5 или 10). */
const MAX_CACHED_PAGES = 5;

interface PostsState {
  /** Текущая страница (курсор). */
  page: number;
  limit: number;
  /** Всего постов и всего страниц (из последнего ответа API) — глобальные, не на страницу. */
  total: number;
  totalPages: number;
  /** Кэш: `page -> posts` (в pagination нет нужды — метаданные выводятся). */
  pages: Record<number, Post[]>;
  selectedPostId: string | undefined;
}

const initialState: PostsState = {
  page: 1,
  limit: 3,
  total: 0,
  totalPages: 1,
  pages: {},
  selectedPostId: undefined,
};

const buildOptimisticPost = (dto: CreatePostDto): Post => {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${Date.now()}`,
    title: dto.title,
    content: dto.content,
    createdAt: now,
    updatedAt: now,
    author: { id: 'optimistic', name: 'You', avatarUrl: null },
    commentsCount: 0,
    likes: 0,
    dislikes: 0,
    userReaction: null,
  };
};

/** Оптимистично пересчитывает счётчики поста под новую реакцию. */
const applyPostReaction = (post: Post, userReaction: 1 | -1 | null): Post => {
  const previous = post.userReaction ?? null;
  let likes = post.likes ?? 0;
  let dislikes = post.dislikes ?? 0;
  if (previous === 1) likes--;
  if (previous === -1) dislikes--;
  if (userReaction === 1) likes++;
  if (userReaction === -1) dislikes++;
  return { ...post, likes, dislikes, userReaction };
};

/** Оптимистично пересчитывает счётчики комментария под новую реакцию. */
const applyCommentReaction = (
  comment: Comment,
  userReaction: 'like' | 'dislike' | null,
): Comment => {
  const previous = comment.userReaction ?? null;
  let likesCount = comment.likesCount ?? 0;
  let dislikesCount = comment.dislikesCount ?? 0;
  if (previous === 'like') likesCount--;
  if (previous === 'dislike') dislikesCount--;
  if (userReaction === 'like') likesCount++;
  if (userReaction === 'dislike') dislikesCount++;
  return { ...comment, likesCount, dislikesCount, userReaction };
};

/** Находит пост во всех закэшированных страницах (для мгновенного рендера деталей). */
const findCachedPost = (
  pages: Record<number, Post[]>,
  postId: string | undefined,
): Post | undefined => {
  if (!postId) return undefined;
  for (const posts of Object.values(pages)) {
    const found = posts.find((post) => post.id === postId);
    if (found) return found;
  }
  return undefined;
};

/** Применяет маппер к посту во всех закэшированных страницах. */
const mapCachedPost = (
  pages: Record<number, Post[]>,
  postId: string,
  mapper: (post: Post) => Post,
): Record<number, Post[]> => {
  const next: Record<number, Post[]> = {};
  for (const [key, posts] of Object.entries(pages)) {
    next[Number(key)] = posts.map((post) => (post.id === postId ? mapper(post) : post));
  }
  return next;
};

/** Ограничивает кэш: при переполнении выкидывает страницы, самые далёкие от текущей. */
const capCachedPages = (
  pages: Record<number, Post[]>,
  currentPage: number,
): Record<number, Post[]> => {
  const keys = Object.keys(pages).map(Number);
  if (keys.length <= MAX_CACHED_PAGES) return pages;

  // Ближайшие к текущей — первыми; в хвосте остаются самые далёкие, их и удаляем.
  keys.sort((a, b) => Math.abs(a - currentPage) - Math.abs(b - currentPage));
  const next = { ...pages };
  for (const key of keys.slice(MAX_CACHED_PAGES)) {
    delete next[key];
  }
  return next;
};

/**
 * PostsStore — единый источник серверного состояния для постов/комментариев.
 *
 * Хранит только необходимое: `{ page, limit, total, pages, selectedPostId }`.
 * `pages` — кэш `page -> Post[]` (последние `MAX_CACHED_PAGES` страниц, видно в DevTools).
 * `totalPages` / `hasNextPage` / `hasPrevPage` — вычисляемые, а не дублируются в стейте.
 * Возврат на просмотренную страницу рендерится мгновенно; деталь берёт пост из кэша.
 */
export const PostsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withProps((store) => {
    const http = inject(HttpClient);
    const apiUrl = inject(API_BASE_URL);

    return {
      /** Cache-first загрузчик: отдаёт страницу из `pages` или грузит и кладёт в стор. */
      listRequest: resource<Post[] | undefined, { page: number; limit: number }>({
        params: () => ({ page: store.page(), limit: store.limit() }),
        loader: async ({ params }) => {
          const cached = store.pages()[params.page];
          if (cached) return cached;

          const response = await firstValueFrom(
            http.get<PostsResponse>(`${apiUrl}/posts`, {
              params: { page: params.page, limit: params.limit },
              withCredentials: true,
            }),
          );

          patchState(store, (state) => ({
            pages: capCachedPages(
              { ...state.pages, [params.page]: response.posts },
              params.page,
            ),
            total: response.pagination.total,
            totalPages: response.pagination.totalPages,
          }));
          return response.posts;
        },
      }),

      /** Комментарии к выбранному посту (пост берём из кэша списка). */
      detail: rxResource<PostWithComments | undefined, string | undefined>({
        params: () => store.selectedPostId(),
        stream: ({ params: postId }) =>
          http.get<PostWithComments>(`${apiUrl}/posts/${postId}`, { withCredentials: true }),
      }),
    };
  }),
  // В проде — стаб, чтобы не тащить DevTools-инструментацию в бандл.
  /* v8 ignore next */
  isDevMode() ? withDevtools('posts') : withDevToolsStub('posts'),
  withComputed((store) => ({
    /** Посты текущей страницы (пустой массив, пока не загружено). */
    currentPageData: computed(() => store.pages()[store.page()] ?? []),
    isListLoading: computed(
      () => store.listRequest.status() === 'loading' && !store.pages()[store.page()],
    ),
    listError: computed(() => store.listRequest.error()),
    selectedPost: computed(
      () => store.detail.value()?.post ?? findCachedPost(store.pages(), store.selectedPostId()),
    ),
    comments: computed(() => store.detail.value()?.comments ?? []),
    totalPosts: computed(() => store.total()),
    hasNextPage: computed(() => store.page() < store.totalPages()),
    hasPrevPage: computed(() => store.page() > 1),
  })),
  withMethods((store) => {
    const postService = inject(PostService);

    const reloadDetailIfSelected = () => {
      if (store.selectedPostId() !== undefined) {
        store.detail.reload();
      }
    };

    return {
      nextPage: (): void => updateState(store, '[Posts] next page', { page: store.page() + 1 }),

      previousPage: (): void =>
        updateState(store, '[Posts] previous page', { page: Math.max(1, store.page() - 1) }),

      /** Смена `limit` сбрасывает кэш и возвращает на первую страницу. */
      setLimit: (limit: number): void =>
        updateState(store, '[Posts] set limit', {
          limit,
          page: 1,
          pages: {},
          total: 0,
          totalPages: 1,
        }),

      selectPost: (postId: string | undefined): void =>
        updateState(store, '[Posts] select post', { selectedPostId: postId }),

      createPost: async (dto: CreatePostDto): Promise<void> => {
        const page = store.page();
        const previousPages = store.pages();
        const previousTotal = store.total();
        const optimistic = buildOptimisticPost(dto);

        patchState(store, (state) => {
          const posts = state.pages[page];
          if (!posts) return state;
          return {
            pages: { ...state.pages, [page]: [optimistic, ...posts] },
            total: state.total + 1,
          };
        });

        try {
          const result = await firstValueFrom(postService.createPost(dto));
          patchState(store, (state) => {
            const posts = state.pages[page];
            if (!posts) return state;
            return {
              pages: {
                ...state.pages,
                [page]: posts.map((post) => (post.id === optimistic.id ? result.post : post)),
              },
            };
          });
        } catch (error: unknown) {
          patchState(store, { pages: previousPages, total: previousTotal });
          throw error;
        }
      },

      updatePost: async (postId: string, data: UpdatePostDto): Promise<void> => {
        const previousPages = store.pages();
        const previousDetail = store.detail.value();
        const updatedAt = new Date().toISOString();

        patchState(store, {
          pages: mapCachedPost(store.pages(), postId, (post) => ({ ...post, ...data, updatedAt })),
        });
        store.detail.value.update((current) =>
          current ? { ...current, post: { ...current.post, ...data, updatedAt } } : current,
        );

        try {
          await firstValueFrom(postService.updatePost(postId, data));
        } catch (error: unknown) {
          patchState(store, { pages: previousPages });
          store.detail.value.set(previousDetail);
          throw error;
        }
      },

      deletePost: async (postId: string): Promise<void> => {
        const previousPages = store.pages();
        const previousTotal = store.total();

        patchState(store, (state) => {
          const next: Record<number, Post[]> = {};
          for (const [key, posts] of Object.entries(state.pages)) {
            next[Number(key)] = posts.filter((post) => post.id !== postId);
          }
          return { pages: next, total: Math.max(0, state.total - 1) };
        });

        try {
          await firstValueFrom(postService.deletePost(postId));
        } catch (error: unknown) {
          patchState(store, { pages: previousPages, total: previousTotal });
          throw error;
        }
      },

      createComment: async (content: string): Promise<void> => {
        const postId = store.selectedPostId();
        if (!postId) return;

        await firstValueFrom(postService.createComment({ postId, content }));
        reloadDetailIfSelected();
      },

      updateComment: async (commentId: string, content: string): Promise<void> => {
        const previous = store.detail.value();
        const updatedAt = new Date().toISOString();

        store.detail.value.update((current) =>
          current
            ? {
                ...current,
                comments: current.comments.map((comment) =>
                  comment.id === commentId ? { ...comment, content, updatedAt } : comment,
                ),
              }
            : current,
        );

        try {
          await firstValueFrom(postService.updateComment(commentId, { content }));
          reloadDetailIfSelected();
        } catch (error: unknown) {
          store.detail.value.set(previous);
          throw error;
        }
      },

      deleteComment: async (commentId: string): Promise<void> => {
        const previous = store.detail.value();

        store.detail.value.update((current) =>
          current
            ? { ...current, comments: current.comments.filter((comment) => comment.id !== commentId) }
            : current,
        );

        try {
          await firstValueFrom(postService.deleteComment(commentId));
          reloadDetailIfSelected();
        } catch (error: unknown) {
          store.detail.value.set(previous);
          throw error;
        }
      },

      /**
       * Реакции на пост/комментарий: оптимистично меняем счётчики сразу (во всех
       * закэшированных страницах и в detail), затем запрос; успех — уточняем из ответа,
       * ошибка — откат к снапшоту.
       */
      toggleReaction: async (
        targetType: 'post' | 'comment',
        targetId: string,
        reaction: 1 | -1 | 0,
      ): Promise<{ success: boolean; likes: number; dislikes: number }> => {
        const previousPages = store.pages();
        const previousDetail = store.detail.value();
        const postReaction: 1 | -1 | null = reaction === 0 ? null : reaction;
        const commentReaction: 'like' | 'dislike' | null =
          reaction === 1 ? 'like' : reaction === -1 ? 'dislike' : null;

        if (targetType === 'post') {
          patchState(store, {
            pages: mapCachedPost(store.pages(), targetId, (post) =>
              applyPostReaction(post, postReaction),
            ),
          });
          store.detail.value.update((current) =>
            current && current.post.id === targetId
              ? { ...current, post: applyPostReaction(current.post, postReaction) }
              : current,
          );
        } else {
          store.detail.value.update((current) =>
            current
              ? {
                  ...current,
                  comments: current.comments.map((comment) =>
                    comment.id === targetId
                      ? applyCommentReaction(comment, commentReaction)
                      : comment,
                  ),
                }
              : current,
          );
        }

        try {
          const result = await firstValueFrom(
            postService.toggleReaction(targetType, targetId, reaction),
          );

          if (targetType === 'post') {
            patchState(store, {
              pages: mapCachedPost(store.pages(), targetId, (post) => ({
                ...post,
                likes: result.likes,
                dislikes: result.dislikes,
                userReaction: postReaction,
              })),
            });
            store.detail.value.update((current) =>
              current && current.post.id === targetId
                ? {
                    ...current,
                    post: {
                      ...current.post,
                      likes: result.likes,
                      dislikes: result.dislikes,
                      userReaction: postReaction,
                    },
                  }
                : current,
            );
          } else {
            store.detail.value.update((current) =>
              current
                ? {
                    ...current,
                    comments: current.comments.map((comment) =>
                      comment.id === targetId
                        ? {
                            ...comment,
                            likesCount: result.likes,
                            dislikesCount: result.dislikes,
                            userReaction: commentReaction,
                          }
                        : comment,
                    ),
                  }
                : current,
            );
          }

          return result;
        } catch (error: unknown) {
          patchState(store, { pages: previousPages });
          store.detail.value.set(previousDetail);
          throw error;
        }
      },

      /** Сброс кэша при logout: чистим состояние и перезапрашиваем первую страницу. */
      reset: (): void => {
        patchState(store, initialState);
        store.listRequest.reload();
      },
    };
  }),
);
