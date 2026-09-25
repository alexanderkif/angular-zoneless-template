# MIGRATION-NG22 — Интерактивный чек-лист

> Цель: перевести проект с **Angular 21** на **Angular 22**, полностью удалить **TanStack Query**,
> заменить серверное состояние на встроенные `resource()` / `rxResource()` / `httpResource()`,
> упростить архитектуру под Standalone + **NgRx Signal Store**, и сделать редизайн в стиле
> [angular.dev](https://angular.dev) (тёмная/светлая тема).
>
> Правила разработки для будущих сессий зафиксированы в [`../AGENTS.md`](../AGENTS.md).
>
> **Статус:** `[ ]` не начато · `[~]` в работе · `[x]` готово · `[!]` заблокировано

---

## 0. Контекст и принятые решения (не менять без обсуждения)

| Вопрос | Решение |
| --- | --- |
| TanStack Query | **Удаляем полностью** |
| Классический NgRx (actions/reducers/effects) | **Не используем** |
| Состояние | **`@ngrx/signals` (Signal Store)** — важна поддержка DevTools |
| Асинхронщина в сторе | **`resource()` / `rxResource()` / `httpResource()`** (stable в v22) |
| Формы | **Signal Forms** (`form()` + `[formField]`) |
| Компоненты | Standalone + `ChangeDetectionStrategy.OnPush` по умолчанию |
| Ленивая загрузка | Router `loadComponent` + `@defer` |
| Дизайн | angular.dev: футуристичная светлая/тёмная тема |
| Тестовое покрытие | 100% (statements/branches/functions/lines) сохраняем |
| Prefetch пагинации постов | Удаляем (оверхед для RnD) |

### Факты по версиям (проверено по npm)

| Пакет | Было | Целевое |
| --- | --- | --- |
| `@angular/*` | `21.2.x` | `22.1.7` |
| `@angular/ssr`, `@angular/build` | `21.2.x` | `22.1.8` |
| `@angular/cli` | `21.2.13` | `22.1.8` |
| `@ngrx/signals` | `21.1.0` | `22.0.1` |
| `typescript` | `~5.9.2` | `~6.0.3` (требование compiler-cli: `>=6.0 <6.1`) |
| `vitest` / `@vitest/*` | `4.0.16` | `4.1.11` (`@angular/build@22` peer: `vitest ^4.0.8`) |
| `@analogjs/vite-plugin-angular` | `2.5.3` | `2.7.2` |
| `@tanstack/angular-query-experimental` | `5.90.x` | **удалить** |

> ⚠️ Не обновлять `typescript` до `7.x` и `vitest` до `5.x` — несовместимо с Angular 22.1.x.

---

## ✅ PoC — выполнено (2026-09-23)

Первые файлы новой архитектуры (ещё **не подключены** к роутам и не заменили TanStack-код):

- [x] `src/app/core/auth/session.service.ts` — `resource()` вместо `AuthQueryService`:
      `ensureUser()` с дедупликацией (аналог `ensureQueryData`), коалесинг `refreshSession()`,
      SSR-кэш через `id: 'auth/currentUser'`
- [x] `src/app/features/posts/posts.store.ts` — NgRx Signal Store + `withDevtools('posts')`:
      `httpResource()` для списка, `rxResource()` для деталей, оптимистичные `createPost`/`deletePost`
      с rollback, `reset()`; prefetch удалён
- [x] ~~`src/app/features/auth-pages/login/signal-login-form.component.ts`~~ — PoC удалён: реальный
      `login.component` уже на Signal Forms (Phase 7), держать дубль смысла нет
- [x] Проверка PoC: `tsc --noEmit` (замыкание файлов) — чисто; `eslint --max-warnings=0` — чисто
- [ ] Подключить `SessionService` в guards/страницы и заменить `PostQueryService` (Phase 2–3)
- [ ] Полный `ng build`/template type-check — заблокирован оставшимися импортами TanStack

> API-уточнение: у `httpResource()` **нет** опции `id` — SSR transfer cache настраивается на
> самом запросе (`transferCache`), ключ выводится из запроса. Опция `id` есть только у
> generic `resource()`.

---

## Phase 0 — Страховочная сетка

- [ ] Создать ветку `chore/ng22-resource-migration`
- [ ] Зафиксировать зелёный baseline: `npm run lint && npm test`
- [ ] Зафиксировать baseline E2E: `npx playwright test --project=chromium`
- [ ] Сохранить вывод `npm run build` (какие `dist/.../server/*.mjs` создаются — понадобится для сверки с `patch-server.js`)
- [ ] Записать текущие размеры главного бандла (budget в `angular.json`: warning 600kB / error 1MB)
- [ ] Убедиться, что `npm ci` воспроизводим (lock-файл актуален)

---

## Phase 1 — Angular 21 → 22

- [~] `npx ng update @angular/core@22 @angular/cli@22 @angular/ssr@22`
      (версии в `package.json` уже подняты вручную, зависимости переустановлены; авто-миграции ещё не применялись)
- [ ] Просмотреть и применить авто-миграции, отдельно проверить:
  - [ ] изменения в `provideZonelessChangeDetection()` (остался ли обязательным)
  - [ ] изменения API `@angular/ssr` (`provideServerRendering`, `ServerRoute`, `RenderMode`)
  - [ ] удаление устаревшего синтаксиса (`standalone: true` уже дефолт с v19)
- [x] Обновить спутников: `@angular/build`, `@angular/compiler-cli`, `@ngrx/signals@22`, `@analogjs/vite-plugin-angular@2.7.2`
- [x] Поднять `typescript` до `~6.0.3`, `vitest`/`@vitest/*` до `4.1.11`
- [x] Проверить требования Angular 22 к Node — ⚠️ **Angular CLI 22 требует Node `>=22.22.3 || >=24.15.0 || >=26.0.0`**
      (текущий Node `v22.16.0`) → `ng build` заблокирован; `ngc`/`tsc`/`eslint` проходят. Нужно обновить Node и `README.md`
- [x] Установить зависимости (`npm install`) — peer-конфликтов нет; `@ngrx/store` не установлен (опциональный peer)
- [ ] Собрать: `npm run build` — сверить набор `*.mjs` с baseline Phase 0
- [x] **Убрать `patch-server.js` из `build`-скрипта** и заменить хак на официальные механизмы:
  - [x] host-валидация: закрывается `NG_ALLOWED_HOSTS` в `api/index.ts` — regex-патч удалён
  - [x] `index`: использовать единый `src/index.html`; Angular 22 генерирует
        `browser/index.csr.html` и `server/index.server.html` для соответствующих runtime
  - [x] `patch-server.js` удалён, `build` = `ng build`
- [ ] Переименовать CSP nonce `angular-ssr-safe-v21` → `angular-ssr-safe` в `src/index.html`, `vercel.json`, `api/index.ts`
- [ ] Прогнать `npm run lint && npm test && npm run build`
- [ ] Smoke-проверка SSR: `npm run dev`, открыть `/`, `/posts`, проверить отсутствие ошибок гидратации
- [ ] **Коммит-чекпоинт:** `chore: upgrade Angular 21 → 22 and align tooling`

---

## Phase 2 — ТаnsStack → SessionService (auth через `resource()`)

Заменить `QueryClient` в auth-слое на root-сервис `core/auth/session.service.ts`.

- [x] Создать `SessionService`:
  - [x] `currentUser` как `resource<AuthUser | null, void>({ loader, defaultValue: null, id: 'auth/currentUser' })`
  - [x] `ensureUser(): Promise<AuthUser | null>` с дедупликацией in-flight промиса (аналог `ensureQueryData`)
  - [x] метод `login()` → после успеха `currentUser.value.set(user)`
  - [x] метод `register()` → `currentUser.value.set(user)` (вместо `reload()`, чтобы не было лишнего GET)
  - [x] метод `logout()` → POST, затем `currentUser.value.set(null)` (+ `logoutState` для UI)
  - [x] метод `refreshSession()` с коалесингом (перенесён из `auth-refresh-coordinator.service.ts`)
  - [x] метод `verifyEmail(token)` / `resendVerification(payload)`
  - [x] состояния действий `loginState` / `registerState` / `logoutState` / `verifyEmailState` / `resendState`
        (`isPending` + `error`) — замена TanStack `mutation.isPending()` / `mutation.error()`
  - [x] `reloadCurrentUser()` — асинхронная замена `refetchUser()` (используется в OAuth-callback и ожидается до навигации)
- [x] Удалить `services/auth-query.service.ts` (и spec)
- [x] Удалить `services/auth-refresh-coordinator.service.ts` (логика внутри `SessionService`)
- [x] `guards/auth-guard.ts`: убрать `QueryClient`/`ensureQueryData` → `SessionService.ensureUser()`; убрать `removeQueries`
- [x] `guards/public.guard.ts`: то же
- [x] `interceptors/token-refresh.interceptor.ts`: вызывать `SessionService.refreshSession()`
- [x] Обновить потребителей: `panel`, `user-menu`, `login`, `register`, `verify-email`, `auth-callback`,
      а также auth-часть `posts-list` / `post-details` и тип `AuthUser` в `post.component`
      (`settings` auth не использовал)
- [x] В шаблонах: `loginMutation.*` → `session.loginState.*`, `registerMutation.*` → `session.registerState.*`,
      `currentUserQuery.data()` → `currentUser.value()`
- [x] Проверка: `tsc` (auth closure) и `eslint --max-warnings=0` — чисто
- [ ] **Коммит-чекпоинт:** `refactor(auth): replace TanStack with SessionService + resource()`

> ⚠️ Сброс доменных сторов при logout (`PostsStore.reset()`) будет подключён в Phase 3, когда стор появится.
> Auth-related spec-файлы (`auth-guard.spec`, `public.guard.spec`, `login/register/verify-email.spec`,
> `panel/user-menu/header.spec`, `token-refresh.interceptor.spec`, `app.spec`) пока ссылаются на удалённые
> сервисы/TanStack — их переписывание в **Phase 8**. `ng build` остаётся красным до Phase 3 (posts ещё на TanStack).

### Скетч `SessionService`

```ts
@Injectable({ providedIn: 'root' })
export class SessionService {
  private http = inject(HttpClient);
  private api = inject(API_BASE_URL);

  private load = async (): Promise<AuthUser | null> => {
    try {
      const r = await firstValueFrom(
        this.http.get<{ user: AuthUser }>(`${this.api}/user/me`, { withCredentials: true }),
      );
      return r.user;
    } catch (e: unknown) {
      if (isHttpError(e, 401)) return null;
      throw e;
    }
  };

  readonly currentUser = resource<AuthUser | null, void>({
    loader: this.load,
    defaultValue: null,
    id: 'auth/currentUser', // встроенный SSR TransferState-кэш
  });

  private pending?: Promise<AuthUser | null>;

  ensureUser = (): Promise<AuthUser | null> => {
    if (this.currentUser.hasValue()) return Promise.resolve(this.currentUser.value());
    this.pending ??= this.load()
      .then((u) => {
        this.currentUser.value.set(u);
        return u;
      })
      .finally(() => (this.pending = undefined));
    return this.pending;
  };
}
```

---

## Phase 3 — ТаnsStack → ресурсы для posts/comments/reactions

- [x] Создать `features/posts/posts.store.ts` (NgRx Signal Store, `providedIn: 'root'`)
  - [x] `page` / `limit` / `selectedPostId` как состояние стора
  - [x] `list` как `httpResource<PostsResponse>(() => ({ url, params, withCredentials }))`
  - [x] `detail` как `rxResource<PostWithComments, string | undefined>`
  - [x] методы `createPost` / `updatePost` / `deletePost` / `createComment` / `updateComment` /
        `deleteComment` / `toggleReaction` с оптимистичным обновлением и rollback
  - [x] `reset()` + `withDevtools('posts')` + `withComputed(hasNextPage/hasPrevPage/totalPosts)`
- [x] Удалить из `posts-list.component.ts` фабрики `create*MutationOptions` и injection-factories (~290 строк)
- [x] `post-details`: `postQuery` → `store.detail` (`rxResource`); `injectMutation` → методы стора + локальные pending-сигналы
- [x] `post.component.ts` и реакции комментариев: `PostService.toggleReaction` + `reload()`; `QueryClient` убран
- [x] Удалить prefetch пагинации (`prefetchNextPage` / `prefetchPreviousPage`)
- [x] Удалить `services/post-query.service.ts` (и spec); `toggleReaction` перенесён в `PostService`
- [x] **Коммит-чекпоинт:** `refactor(posts): replace TanStack with httpResource + optimistic store`

> ⚠️ Поправка: у `httpResource()` **нет** опции `id` — SSR transfer cache задаётся на запросе
> (`transferCache`), ключ выводится из запроса. `id` есть только у generic `resource()`.
> Пагинация перенесена из `UiStore` в `PostsStore` (settings → `postsStore.setLimit`).

### Скетч стора с `httpResource`

```ts
export const PostsStore = signalStore(
  { providedIn: 'root' },
  withState({ page: 1, limit: 3, isSaving: false }),
  withProps((store) => {
    const http = inject(HttpClient);
    const api = inject(API_BASE_URL);
    return {
      list: httpResource<PostsResponse>(
        () => ({
          url: `${api}/posts`,
          params: { page: store.page(), limit: store.limit() },
          withCredentials: true,
        }),
        { id: () => `posts-${store.page()}-${store.limit()}` },
      ),
    };
  }),
  withMethods((store) => ({
    nextPage: () => patchState(store, (s) => ({ page: s.page + 1 })),
  })),
);
```

> Оптимистичное обновление: `list.value.update(...)` → запрос → `list.reload()`; в `catch` вернуть
> сохранённый `previous` через `list.value.set(previous)`.

- [ ] Проверить, что `httpResource` подхватывает `ssrCookieInterceptor` и `tokenRefreshInterceptor` (ходит через `HttpClient`)

---

## Phase 4 — SSR-гидратация

- [x] Удалить `src/app/ssr-tanstack-hydration.ts` и `ssr-tanstack-hydration.spec.ts`
- [x] Убрать вызов `hydrateTanStackQuery()` из `app.ts`
- [x] Убрать `declare global { window.__TANSTACK_QUERY_CLIENT__ }` и блок `provideAppInitializer` из `app.config.ts`
- [x] Опираться на встроенный TransferState ресурсов + `provideClientHydration()`
      (в `SessionService.currentUser` — `resource({ id: 'auth/currentUser' })`)
- [x] Проверить `withHttpTransferCacheOptions` — оставлен для обычных HTTP-запросов;
      у `httpResource` transfer cache живёт на самом запросе (`transferCache`, без `id`)
- [x] Оптимизировать `app.routes.server.ts`:
  - [x] `Client` для `auth/callback`, `verify-email` (чисто клиентские)
  - [x] `Server` для остального (данные зависят от cookies)
  - [ ] `Prerender` для `''`/`about` — отложено: app shell (header → user-menu) читает
        `currentUser` (resource → HTTP), пререндер дёргал бы API на этапе build
- [ ] (Опционально) включить `withIncrementalHydration()` и `@defer` для комментариев/футера
- [ ] Проверить в DevTools, что `/user/me` не запрашивается дважды после гидратации
- [ ] **Коммит-чекпоинт:** `refactor(ssr): drop TanStack dehydration, use resource TransferState`

---

## Phase 5 — Упрощение структуры

- [~] Перейти на структуру `core/` / `features/` / `shared/` / `data/`
  - [x] `core/auth` (`SessionService`), `features/posts` (`PostsStore`), `features/auth-pages/login`
  - [ ] Остальные страницы/компоненты (`shared/`, `data/`) — механический перенос отложен (высокий churn)
- [x] Удалить `store/ui/ui.store.ts` (+spec):
  - [x] pagination → в `PostsStore`
  - [x] `isUserMenuOpen` → локальный сигнал в `UserMenuComponent`
- [x] Привести `verify-email/*` к `verify-email.component.ts|html|css`
- [ ] Переименовать `server/_lib` → `server/lib` (отложено: трогает импорты в `api/**`)
- [x] Почистить `.unimportedrc.json` (удалён мёртвый `main-content` и отсутствующие пакеты)
- [x] Убрать избыточный `standalone: true` в `button.component.ts`
- [ ] **Коммит-чекпоинт:** `refactor: feature-based folder structure`
- [ ] **Коммит-чекпоинт:** `chore: remove TanStack/NgRx artifacts`

---

## Phase 6 — Редизайн под angular.dev

- [x] Вынести токены дизайна (реализовано в `src/styles.css`, без дробления на tokens/base)
  - [x] палитра/градиент angular.dev — **OKLCH-токены сняты с реального angular.dev** (см. ниже)
  - [x] тёмная/светлая тема через `light-dark()` + `color-scheme` и хук `html[data-theme]`
  - [x] радиусы, elevation, spacing-scale, типографика (Inter / Inter Tight / DM Mono)
- [x] Хедер: sticky, полупрозрачный фон + `backdrop-filter: blur(16px)`, активный пункт как pill (`routerLinkActive`)
- [x] Футер в стиле angular.dev
- [x] UI-примитивы (`button`): primary = брендовый градиент, secondary = outline, `:focus-visible` ring
- [x] Карточки `post`: surface + border + radius + hover-lift
- [x] **Фон на всех страницах** — как на angular.dev: SVG-тайл 72px, масштабированный маской
      до **22px** (`mask-image: var(--pattern-url)`), поверх — **conic-gradient**
      (`from var(--gradient-angle)`, стопы `transparent 17% / #f627e3 25% / #6911d2 32% /
      transparent 38% / 61% / #6911d2 71% / #f627e3 81% / transparent 91%`). Прозрачные стопы
      дают мягкое затухание к центру и противоположным секторам — текст остаётся читаемым.
      Анимация угла `--gradient-angle` 0→360° (10s linear infinite; `prefers-reduced-motion` отключает)
- [x] Хедер — `position: fixed` (не убегает при скролле), контент с `margin-top: var(--header-height)`
- [x] **Переключатель тем** в `user-menu__list` (`ThemeService`, `localStorage.themePreference`,
      `data-theme` на `<html>`, SSR-safe, `matchMedia`-guard; без иконки — только текст)
- [x] Хардкод светлых цветов в CSS компонентов заменён на токены (home/about/login/register/post-form/verify-email)
- [ ] Перевести `user-menu` и модалки на **Angular Aria** — отложено (крупный отдельный рефакторинг)
- [x] Роутер: `withComponentInputBinding()`. `withViewTransitions()` **убран** — он крашил
      WebKit при навигации (в Chromium/Firefox работал). Скролл: на детальной — `window.scrollTo(0)`,
      при пагинации — `scrollIntoView` с `scroll-margin-top` под fixed-хедер
- [ ] `post-details`: `id = input.required<string>()` — отложено (сломало бы 100%-спек `post-details`)
- [x] Заголовки роутов через `title`
- [x] Формы (`login`, `register`, `post-form`) на Signal Forms (см. Phase 7)
- [x] Контраст и `skip-link` сохранены (skip-link на брендовом градиенте)
- [ ] **Коммит-чекпоинт:** `feat(ui): angular.dev design system + component restyle`

> Палитра снята с https://angular.dev: `--electric-violet`, `--french-violet`, `--vivid-pink`,
> `--hot-red`, `--orange-red`, `--bright-blue`, `--super-green` (OKLCH), 8-ступенчатая шкала
> `--*-contrast`, градиент `orange-red → vivid-pink → electric-violet`.
> ⚠️ Внешние шрифты Google **не подключены** — CSP (`font-src 'self'`) запрещает; Inter
> используется, если установлен локально, иначе системный стек.

---

## Phase 7 — Формы на Signal Forms

- [x] `login.component.ts`: модель `signal({ email, password })` + `form(model, schema)` + `[formField]`
- [x] `register.component.ts`: те же принципы, включая `confirmPassword`
- [x] `post-form.component.ts`: `ReactiveFormsModule` заменён на `form()` + `[formField]`
- [x] Валидация через схему: `required`, `email`, `minLength`, `maxLength` из `@angular/forms/signals`
- [x] Состояния читать как `field().valid()`, `field().touched()`, `field().errors()`
- [x] Обновить шаблоны: `[formField]` вместо `formControlName`
- [ ] Обновить/добавить spec-файлы (Phase 8)
- [x] **Коммит-чекпоинт:** `refactor(forms): migrate to Signal Forms`

> ⚠️ Signal Forms запрещает `[disabled]` на `[formField]`-узлах (NG8022) — управление disabled
> делается схемой (`disabled()` rule), а не биндингом. Учтено.

> ⚠️ **Поправка по API.** Публичный API Signal Forms v22 — это `form()`, `FieldTree` и директива
> `[formField]` из `@angular/forms/signals`. Класс `SignalFormControl` существует, но это
> **`@experimental`** мост совместимости с Reactive Forms (`@angular/forms/signals/compat`),
> а `SignalFormGroup` как публичного API **нет**. Основной путь — модельный `form()`; `compatForm`
> использовать только для постепенной миграции.

---

## Phase 8 — Тесты и верификация

- [x] Переписать spec-файлы, завязанные на `provideTanStackQuery` / `QueryClient` (по факту 18 файлов):
  - [x] `app.spec.ts`, `app.routes.spec.ts`, `panel`, `header`, `user-menu`, `post`, `posts-list`, `post-details`, `post-form`
  - [x] `login`, `register`, `verify-email`, `auth-callback`
  - [x] `auth-guard`, `public.guard`, `token-refresh.interceptor`, `settings`, `app.routes.server`
  - [x] `auth-query.service.spec.ts`, `post-query.service.spec.ts`, `ssr-tanstack-hydration.spec.ts` — удалены
- [x] В тестах: `provideHttpClient()` + `provideHttpClientTesting()` + `HttpTestingController`
- [x] Для ресурсов — `TestBed.tick()` / `ApplicationRef.whenStable()` (без flush HTTP `whenStable` дедлочится)
- [x] Добавлены `session.service.spec.ts` и `posts.store.spec.ts` (дедуп, coalescing, optimistic rollback, режимы роутов)
- [x] **100% coverage** (statements/branches/functions/lines) — 40 файлов, 364 теста
- [x] `npm run lint && npm run build && npm test` — зелёные
- [ ] `npx playwright test --project=chromium` — не запускалось
- [ ] Проверить SSR-гидратацию и тёмную/светлую тему в браузере (после Phase 6)
- [ ] **Коммит-чекпоинт:** `test: rewrite query tests for resources`

---

## Phase 9 — Документация и инструменты

- [x] Обновить `README.md`: Angular 22, TypeScript 6.0, `resource()`/`httpResource()`, Signal Forms, Signal Store + DevTools, TanStack убран
- [x] Обновить `.vscode/mcp.json`: удалить `tanstack`, зафиксировать версию `@angular/cli@22`
- [ ] Решить судьбу `docfork` (дублирует `search_documentation` из Angular CLI MCP) — на усмотрение
- [x] Проверить `.unimportedrc.json` / `vercel.json` / `angular.json` на актуальность (почищены)
- [ ] **Финальный коммит:** `docs: update README and tooling`

---

## CSS/BEM-аудит (выполнено)

Все компоненты приведены к строгой BEM-нотации `block__element--modifier`:

- `home`, `about`, `logo`, `panel` — блоки/элементы (`home__card`, `about__tech`, `logo__link`,
  `panel__link--active`, `panel__link--disabled`);
- `post`, `post-form`, `avatar` — `post__title`, `post--details`, `post--skeleton`,
  `post-form__field`, `post-form__input--invalid`, `avatar__placeholder`, `avatar__badge--admin`;
- `login`, `register` — `login__*`, `register__*` (включая `--github`/`--google`);
- `verify-email`, `auth-callback`, `posts-list`, `post-details` — `*__*`; диалог подтверждения
  оставлен отдельным блоком `confirm-modal` с `confirm-modal__overlay/__title/__text/__actions`.
- Тесты, привязанные к классам, обновлены: `avatar.component.spec.ts`, `tests/app.spec.ts`
  (`.logo__link`), `tests/auth.setup.ts` (`panel__link--disabled`).
- Правило зафиксировано в [`AGENTS.md` §4.1](../AGENTS.md).

> DoD по BEM закрыт: удалён неиспользуемый `app.css` (`.app-loader`/`.spinner`),
> тег-селекторы (bare `h1/p/ul/li/a/input/textarea/label/strong/small/span/svg` и их
> descendant-варианты) заменены на явные элементы (`login__input`, `settings__label`,
> `posts__title`, `post-details__comment-input` и т.д.). Тег-селекторов в компонентном CSS
> больше не осталось.

---

## Фоновая ревалидация без «мигания» (UX-фикс)

`httpResource` / `rxResource` при `reload()` переходят в статус **`reloading`**, а `isLoading()`
в нём = `true`. Старый шаблон показывал скелет по `isLoading()`, из-за чего любой фоновый
рефетч (лайк/дизлайк, создание/удаление) на пару секунд подменял список на «Loading posts…».

Исправлено:
- шаблоны `posts-list` / `post-details` показывают скелет только при `status() === 'loading'`
  (первичная загрузка); при `reloading` рендерятся текущие данные (`value()` сохраняется);
- реакции (`PostsStore.toggleReaction`) больше **не вызывают `reload()`** — счётчики патчатся
  на месте из ответа API (`likes`/`dislikes`/`userReaction`), поэтому лайк/дизлайк мгновенный
  и без сетевого «мигания»; комментарии — так же;
- остальные оптимистичные операции (`create/update/delete` post/comment) сохраняют оптимистичный
  патч + фоновый `reload()` — теперь он невидим для пользователя.

---

## Кэш загруженных страниц постов (store)

TanStack-подобное «мгновенное возвращение» на страницу восстановлено без сторонних библиотек:

Состояние сведено к минимуму без дублирования:

```ts
{
  page,            // текущая страница (курсор)
  limit,
  total,           // всего постов (глобально)
  totalPages,      // всего страниц (глобально)
  pages,           // Record<page, Post[]> — кэш последних MAX_CACHED_PAGES страниц
  selectedPostId,
}
```

- `pages` хранит **только посты**; `pagination` из ответа API больше не дублируется на каждую
  страницу (раньше в каждой странице лежали page/limit/total/totalPages/hasNext/hasPrev).
- `hasNextPage` / `hasPrevPage` — вычисляемые на корне (`page < totalPages`, `page > 1`).
- Кэш ограничен `MAX_CACHED_PAGES = 5`: при переполнении выкидываются страницы, **самые далёкие
  от текущей** (без отдельного массива порядка).
- `listRequest` — `resource()` с **cache-first** loader: страница из `pages` отдаётся без HTTP,
  иначе грузится и кладётся в стор вместе с `total`/`totalPages`.
- `setLimit` и `reset()` очищают кэш; перезагрузка страницы — естественно (стор в памяти).
- Мутации (`create/update/delete post`, `toggleReaction`) патчат **все** закэшированные страницы
  и детали, с откатом по снапшоту при ошибке.
- Детальная: пост **мгновенно из кэша** (`selectedPost`), догружаются только комментарии; реакции
  — оптимистично с откатом при ошибке.

> Компромисс: кэш «свеж» до первого изменения на сервере другими пользователями — обновление
> придёт при смене limit, logout или перезагрузке. Для шаблона/RnD это осознанный выбор.

---

## Подготовка к деплою (security/quality-аудит)

Применено:
- **HSTS** добавлен в `vercel.json` (`max-age=63072000; includeSubDomains; preload`).
- **Host-валидация SSR**: `api/index.ts` больше не доверяет входящим `Host`/`X-Forwarded-Host` —
  allow-list строится только из `NG_ALLOWED_HOSTS`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`,
  `FRONTEND_URL` (устранён host-header poisoning на cold-start).
- **Avatar-proxy**: отклоняет не-`image/*` (415) и тела > 5 МБ (413).
- **Email**: пользовательский `name` экранируется перед вставкой в HTML письма.
- **Ошибки БД**: клиенту — обезличенное `Service temporarily unavailable` (детали только в логах).
- **DevTools**: `withDevtools('posts')` только в dev (`withDevToolsStub` в проде).
- **Coverage-порог 100%** в `vitest.config.ts` (падает при недоборе на `test:coverage`).
- Убраны избыточные `standalone: true`, зависимость `@types/pg`; обновлён устаревший
  `.github/copilot-instructions.md` (Angular 22 + resources вместо TanStack); `.env.example` —
  комментарий вынесен из значения.

Осознанно отложено (нужно решение/инфра):
- **nodemailer ≤ 9.1.0 — high** (`npm audit`): фикс только в `nodemailer@10` (breaking) — нужен
  реальный smoke-тест отправки.
- **Rate limiting** in-memory на инстанс (`server/_lib/security.ts`); на write-эндпоинтах лимитов
  нет — для прода нужен shared store (Redis/KV).
- **CSP nonce статичный** (`angular-ssr-safe-v21`): для настоящей защиты нужен per-request nonce
  (генерация в `api/index.ts` + проброс в Angular `CSP_NONCE`), сейчас значение совпадает везде.
- **XSRF-конфиг** в `app.config.ts` фактически неактивен (сервер не ставит `XSRF-TOKEN`); CSRF
  держится на `SameSite=Lax` — либо реализовать double-submit, либо задокументировать.
- **Линт не покрывает `api/**` и `server/**`**; `@typescript-eslint/no-explicit-any` выключен.
- `@defer` не используется; `webkit` E2E флейки на Windows (в CI гоняем chromium).

---

## Карта замен TanStack → Angular 22

| TanStack | Angular 22 |
| --- | --- |
| `queryFn` / кэш | `httpResource()` |
| реактивный `queryKey` | `params`-функция ресурса |
| `staleTime` / `gcTime` | нет аналога — общий стейт через root-стор |
| `isPending` / `isFetching` | `status()`, `isLoading()` |
| `isError` / `error` | `error()`, `status() === 'error'` |
| `data()` | `value()` / `hasValue()` |
| `setQueryData` | `resource.value.set()/update()` |
| `invalidateQueries` | `resource.reload()` |
| `ensureQueryData` | `await store.ensureX()` |
| mutations (`onMutate`/`onSuccess`) | async-методы стора + сигналы pending/error |
| optimistic + rollback | `.value.update()` → `.reload()` / `.value.set(prev)` |
| prefetch | удалено |
| dehydrate/hydrate | встроенный TransferState (`id` опции ресурса) |

---

## Диаграмма состояний ресурса (v22)

```
idle ──(params заданы)──▶ loading ──▶ resolved
                             │           │
                             │           ├─(reload)──▶ reloading ──▶ resolved
                             ▼           │
                           error         └─(set/update)──▶ local ──(reload)──▶ loading
```

---

## Definition of Done

- [x] В проекте нет `@tanstack/angular-query-experimental` и упоминаний TanStack
- [x] Нет импортов `QueryClient` / `injectQuery` / `injectMutation`
- [x] `resource()` / `httpResource()` / `rxResource()` используются для серверных данных
- [x] `@ngrx/signals` (PostsStore) + `withDevtools` (`@ngrx-toolkit/core`)
- [x] Нет `patch-server.js` в build
- [x] Все компоненты Standalone + OnPush, формы на Signal Forms
- [x] Тёмная/светлая тема в стиле angular.dev (OKLCH-токены, `light-dark()`)
- [~] `lint` + `build` + `test` (100%) — зелёные; Playwright chromium — не запускался
