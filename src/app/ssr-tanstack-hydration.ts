import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { inject, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { dehydrate, hydrate, QueryClient } from '@tanstack/angular-query-experimental';

export const QUERY_STATE_KEY = makeStateKey<any>('TANSTACK_QUERY_STATE');

/**
 * SSR Hydration for TanStack Query (Angular 21+ Best Practice)
 *
 * This function serializes the TanStack Query cache on the server and rehydrates it on the client.
 * This ensures that the client doesn't refetch data that was already fetched on the server.
 *
 * Usage:
 * - Call this in the root component constructor.
 * - On SSR: The query cache is serialized to TransferState after queries are executed.
 * - On Client: The query cache is rehydrated from TransferState before rendering.
 *
 * Example:
 * ```typescript
 * constructor() {
 *   hydrateTanStackQuery();
 * }
 * ```
 */
export const hydrateTanStackQuery = () => {
  const queryClient = inject(QueryClient);
  const transferState = inject(TransferState);
  const platformId = inject(PLATFORM_ID);

  if (isPlatformServer(platformId)) {
    const dehydratedState = dehydrate(queryClient);
    transferState.set(QUERY_STATE_KEY, dehydratedState);
  }

  if (isPlatformBrowser(platformId)) {
    const dehydratedState = transferState.get(QUERY_STATE_KEY, null);
    if (dehydratedState) {
      hydrate(queryClient, dehydratedState);
    }
  }
};
