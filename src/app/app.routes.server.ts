import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * SSR-стратегия (Angular 22).
 *
 * - `auth/callback` и `verify-email` — чисто клиентские (зависят от query params/cookies),
 *   рендерим на клиенте (CSR), чтобы не тратить SSR.
 * - Остальное — SSR на каждый запрос (`Server`): данные зависят от cookies пользователя.
 *
 * Осознанно НЕ используем `Prerender` для `''`/`about`: app shell (header → user-menu)
 * читает `SessionService.currentUser` (`resource()` → HTTP), и пререндер дёргал бы API
 * на этапе сборки. Статические страницы можно пререндерить позже, когда session-ресурс
 * станет ленивым/SSR-безопасным.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'auth/callback', renderMode: RenderMode.Client },
  { path: 'verify-email', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
