import { computed } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';

type UiState = {
  isUserMenuOpen: boolean;
  postsPage: number;
  postsLimit: number;
};

const initialState: UiState = {
  isUserMenuOpen: false,
  postsPage: 1,
  postsLimit: 3,
};

export const UiStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    hasPrevPage: computed(() => store.postsPage() > 1),
  })),
  withMethods((store) => ({
    openUserMenu: () => patchState(store, { isUserMenuOpen: true }),
    closeUserMenu: () => patchState(store, { isUserMenuOpen: false }),
    toggleUserMenu: () => patchState(store, { isUserMenuOpen: !store.isUserMenuOpen() }),
    setPostsPage: (page: number) => patchState(store, { postsPage: page }),
    nextPostsPage: () => patchState(store, { postsPage: store.postsPage() + 1 }),
    prevPostsPage: () =>
      patchState(store, { postsPage: store.hasPrevPage() ? store.postsPage() - 1 : 1 }),
    setPostsLimit: (limit: number) => patchState(store, { postsLimit: limit, postsPage: 1 }), // Reset to page 1 when changing limit
  })),
);
