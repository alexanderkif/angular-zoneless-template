# AGENTS.md — Правила разработки

> Область действия: весь репозиторий `angular-zoneless-template`.
> Обязательно для любых AI-сессий и людей, работающих с кодом.
> Парный документ: [`docs/MIGRATION-NG22.md`](docs/MIGRATION-NG22.md).
>
> Это RnD-проект на **Angular 22**. Правила ниже — не рекомендации, а требования.

---

## 1. Архитектура и данные

### 1.1. TanStack Query удалён полностью

- ❌ **Запрещено** использовать `@tanstack/angular-query-experimental`, `QueryClient`,
  `injectQuery`, `injectMutation`, `provideTanStackQuery`, `dehydrate`/`hydrate`.
- ❌ Не добавлять TanStack обратно и не вводить любой другой внешний кэш серверного состояния
  (SWR, RTK Query, Apollo и т.п.).
- Причина: лёгкость шаблона и переход на встроенные механизмы Angular 22.

### 1.2. Состояние — `@ngrx/signals` (NgRx Signal Store)

- ✅ Используем **только** `@ngrx/signals`: `signalStore`, `withState`, `withProps`,
  `withComputed`, `withMethods`, `patchState`.
- ❌ **Запрещён классический NgRx**: `@ngrx/store`, `@ngrx/effects`, `@ngrx/entity`,
  actions, reducers, selectors.
- Мотивация: нужна поддержка **DevTools** для отладки состояния.
- Сторы — root-level (`{ providedIn: 'root' }`) для общих данных (`posts`, session/layout).
- Локальное UI-состояние (открыт ли dropdown/модалка) держим в сигналах компонента,
  не выносим в глобальный стор без причины.
- Интеграция с **Redux DevTools** — миксин **`withDevtools`** из пакета
  **`@ngrx-toolkit/core`** (`^22.0.1`). Подключаем непосредственно в стор:

  ```ts
  import { withDevtools, updateState } from '@ngrx-toolkit/core';

  export const PostsStore = signalStore(
    { providedIn: 'root' },
    withState({ page: 1, limit: 3 }),
    withDevtools('posts'), // имя стора в Redux DevTools
    withMethods((store) => ({
      nextPage: () => updateState(store, '[Posts] next page', (s) => ({ page: s.page + 1 })),
    })),
  );
  ```

- `withDevtools(name, ...features)` принимает имя стора и опциональные фичи:
  `withGlitchTracking()`, `withMapper(fn)`, `withDisabledNameIndices()`.
- Для осмысленных имён действий в DevTools использовать `updateState(store, 'action name', ...)`
  вместо `patchState`; для глобальной конфигурации — `provideDevtoolsConfig(...)`.
- `@ngrx-toolkit/core` объявляет `@ngrx/store` как **опциональный** peer.
  `@ngrx/store` в проект **не ставится** и не используется — есть только `@ngrx/signals`.
  Это не нарушает запрет из §8.
- Stub `withDevToolsStub` можно использовать, чтобы отключать DevTools в production-сборке.

### 1.3. Асинхронность внутри стора — `resource()` / `rxResource()` / `httpResource()`

Стабильные встроенные API Angular 22 (не TanStack):

- ✅ `httpResource()` — для HTTP-запросов (идёт через `HttpClient`, значит работают interceptors).
- ✅ `resource()` — для любого асинхронного загрузчика (`Promise`), не обязательно HTTP.
- ✅ `rxResource()` — когда источник уже `Observable` (`@angular/core/rxjs-interop`).

Правила:

- Ресурсы создаются в **injection context** (в `signalStore` — внутри `withProps`/`withComputed`,
  в компонентах — на уровне полей класса).
- Общие серверные данные (currentUser, список постов) живут **в одном root-сторе/сервисе**,
  а не в ресурсе каждого компонента — глобального кэша больше нет.
- `staleTime`/`gcTime`/`prefetch` — нет аналогов. Кэш — это сам стор. После мутаций вызываем
  `resource.reload()`.
- SSR-гидратация — через встроенный TransferState ресурса (опция `id`), вручную ничего не сериализуем.
- Для forms/state используем сигнальные API; `isLoading()`, `error()`, `status()`, `value()`,
  `hasValue()` — стандартные источники UI-состояний.
- Мутаций как отдельного API в Angular 22 нет: пишем async-методы, pending/error — сигналы,
  оптимистичные апдейты — через `resource.value.update(...)` с rollback через `value.set(prev)`.

---

## 2. Стандарты Angular 22

### 2.1. Standalone + OnPush

- ✅ **Только Standalone-компоненты/директивы/пайпы.** Никаких `NgModule`.
- ✅ `ChangeDetectionStrategy.OnPush` **по умолчанию** у каждого компонента.
- ✅ Зонлесс (`provideZonelessChangeDetection()` остаётся, если актуален в v22) — не вводить `zone.js`.
- ✅ Новый синтаксис шаблонов: `@if`, `@for`, `@switch`, `@let`.
- ❌ Не писать `standalone: true` явно — это дефолт с v19.
- ❌ Не использовать `ngClass`/`ngStyle`/`NgIf`/`NgFor` из `@angular/common`, если хватает
  встроенного синтаксиса и байндингов.
- Управление состоянием — сигналы (`signal`, `computed`, `linkedSignal`, `input()`, `output()`,
  `viewChild()`, `model()`).
- Роут-параметры — через `withComponentInputBinding()` и `input.required<T>()`,
  а не через `toSignal(route.paramMap)`.

### 2.2. Формы — Signal Forms

- ✅ Новые и переписываемые формы — на **Signal Forms**: `form(model, schema)` + директива
  `[formField]`, импорт из `@angular/forms/signals`.
- ✅ Модель — `signal(...)`; валидация — схема (`required`, `email`, `minLength`, `validate`, …).
- ✅ Состояние поля читаем вызовом узла: `field().valid()`, `field().touched()`, `field().errors()`.
- ❌ **Не импортировать** `FormControl`/`FormGroup`/`FormArray`/`FormBuilder` из `@angular/forms`
  для нового кода.
- ⚠️ **Важная поправка по API (v22):**
  - Публичный API — это `form()` / `FieldTree` / `[formField]`.
  - `SignalFormControl` существует, но это **`@experimental`** мост совместимости
    (`@angular/forms/signals/compat`) для поэтапной миграции с Reactive Forms.
  - **`SignalFormGroup` как публичного API не существует** — не выдумывать его.
  - В `form()`-модели избегать `null`; использовать нейтральные значения (`''`, `0`).

### 2.3. Ленивая загрузка и отложенный рендеринг

- ✅ Роуты — ленивые через `loadComponent` (как сейчас) / `loadChildren`.
- ✅ Тяжёлые и ниже-сгиба секции — через `@defer` с осмысленными `@placeholder`/`@loading`/
  `@error` и, где уместно, триггерами (`on viewport`, `on idle`, `on interaction`).
- ✅ `@defer` использовать осознанно, не оборачивать всё подряд.
- ✅ Для роутера подключать `withComponentInputBinding()`.
- ❌ Не включать `withViewTransitions()` — на текущей сборке WebKit он крашит браузер при
  навигации (проверено E2E). Если включать — только с отключённым webkit-проектом в E2E.

---

## 3. Редизайн: стиль angular.dev

- Целевой визуал — официальный [angular.dev](https://angular.dev): футуристичная
  светлая/тёмная тема, чистые поверхности, аккуратная типографика, мягкие радиусы и тени.
- ✅ Единые **design tokens** в `src/styles/` (палитра, брендовый градиент, spacing, radius,
  shadow, typography). Никаких магических hex/px по компонентам.
- ✅ Обязательна поддержка **тёмной и светлой** темы: `color-scheme: light dark`,
  `@media (prefers-color-scheme: dark)` + хук `[data-theme]`.
- ✅ Стили — изолированные в компонентах или через общий token-слой; переиспользуемые
  примитивы — в `shared/ui`.
- ✅ Доступность: сохранять skip-link, `:focus-visible` ring, проверять контраст (мелкий текст
  на брендовом цвете особенно).
- ✅ Для сложных интерактивных паттернов (меню, диалоги) предпочитать **Angular Aria** (stable
  в v22) вместо рукописного ARIA.
- ✅ Тема — через `ThemeService` (`data-theme` на `<html>`, `localStorage.themePreference`).
- ✅ Фон-паттерн — `body::before`: SVG-тайл (72px → `mask-size: 22px`) маскирует
  `conic-gradient(from var(--gradient-angle), …)` с анимированным углом (10s). Прозрачные
  стопы conic дают мягкое затухание к центру, чтобы текст оставался читаемым.
- ✅ Хедер — `position: fixed`; контент — `margin-top: var(--header-height)`.
- ❌ Никаких «магических» цветов в компонентах — только токены из `styles.css`.
- ❌ Не тащить тяжёлый UI-фреймворк (Material/Ant/Primeng) без явного решения.

---

## 4. Соглашения по файлам и коду

- Структура — по фичам: `core/` (singletons, config, guards, interceptors), `features/`
  (домены: posts, auth-pages, …), `shared/` (ui, layout, avatar), `data/` (HTTP-сервисы и модели).
- Именование компонентов: `*.component.ts|html|css`; сервисы: `*.service.ts`; сторы:
  `*.store.ts`; модели: `data/models.ts`. Никаких смешанных `verify-email/verify-email.ts`.
- Один компонент — одна ответственность; UI-примитивы не знают о домене.
- TypeScript strict (как сейчас). Типы API — в `data/models.ts`, не размазаны по компонентам.
- Не дублировать HTTP-логику: `data/*.service.ts` — только транспорт; кэш/состояние — в сторах.

### 4.1. CSS — строго BEM

- Стили — только по классам в нотации **BEM**: `block__element--modifier`.
  - блок — корневой класс компонента: `post`, `user-menu`, `post-form`, `button`;
  - элемент — `block__element`: `post__title`, `user-menu__item`, `panel__link`;
  - модификатор — `block--modifier` / `block__element--modifier`: `post--details`,
    `button--primary`, `panel__link--active`.
- ❌ Не использовать «свободные» классы без блока (`title`, `text`, `error-message`),
  селекторы по тегам/`#id` для стилей и сокращения (`btn`, `col`).
- ❌ Не использовать `is-*` / `has-*` / утилитарные хелперы; состояние — через
  модификаторы, `:disabled`, `[aria-*]`.
- Имена — `kebab-case`; вложенность — только через `&` внутри блока.
- При переносе/переименовании класса обновлять и CSS, и шаблон; тесты привязывать
  к `data-testid`/ролям, а не к стилевым классам.

---

## 5. SSR и гидратация

- SSR включён (`outputMode: server`). Не ломать серверный рендеринг ради клиентских удобств.
- Гидратация — `provideClientHydration()`; данные — через встроенный TransferState ресурсов (`id`).
- `app.routes.server.ts`: `Prerender` для статики, `Server` для данных-зависимых роутов.
  Новый роут — осознанно выбрать `RenderMode`.
- Не хардкодить version-specific CSP nonce (`...-v21`); использовать нейтральное имя.
- Cookies на сервере прокидываются `ssrCookieInterceptor`; не отключать `withCredentials`.

---

## 6. Тесты

- Vitest + Playwright сохраняем. Цель покрытия — **100%**.
- HTTP в тестах — `provideHttpClient()` + `provideHttpClientTesting()` + `HttpTestingController`.
- Ресурсы асинхронны: дожидаться стабилизации (`await fixture.whenStable()` / `TestBed.tick()` —
  точный API v22 уточнить).
- Каждый публичный метод стора/сервиса — покрыт; оптимистичные апдейты и rollback — отдельные тесты.

---

## 7. Инструменты и MCP

- MCP-конфиг — [`.vscode/mcp.json`](.vscode/mcp.json).
- ✅ `angular-cli` MCP — основной помощник (best practices, search_documentation,
  onpush/zoneless migration, при необходимости experimental build/test). Версию фиксировать (`@angular/cli@22`).
- ❌ `tanstack` MCP — удалён вместе с библиотекой.
- ✅ `playwright-test` — E2E. ✅ `supabase` — если база на Supabase.
- ❌ `docfork` — удалён (дублировал `search_documentation` из Angular CLI MCP).
- Не добавлять MCP-серверы «на всякий случай».

---

## 8. Запрещённые зависимости и паттерны

- ❌ `@tanstack/angular-query-experimental` и любой TanStack кэш.
- ❌ `@ngrx/store`, `@ngrx/effects`, `@ngrx/entity`, `@ngrx/router-store`. Единственное
  исключение — **опциональный** peer `@ngrx/store` у `@ngrx-toolkit/core`:
  он не устанавливается и не используется напрямую.
- ❌ `NgModule`.
- ❌ `zone.js` / `provideZoneChangeDetection`.
- ❌ Reactive/Template-driven forms в новом коде (кроме compat-моста при миграции).
- ❌ `patch-server.js`-подобные regex-патчи собранных бандлов; использовать официальные механизмы.
- ❌ `ChangeDetectionStrategy.Default`.
- ❌ Ручная сериализация SSR-кэша.
- ❌ `typescript@7`, `vitest@5` до подтверждённой поддержки в Angular 22 (compiler-cli требует `TS >=6.0 <6.1`).

---

## 9. Definition of Done для любой задачи

- [ ] Нет TanStack и следов `QueryClient`.
- [ ] Состояние — Signal Store; асинхронщина — `resource()`/`rxResource()`/`httpResource()`.
- [ ] Standalone + OnPush; формы на Signal Forms.
- [ ] Тёмная/светлая тема в стиле angular.dev (если затронут UI).
- [ ] `npm run lint` без warnings.
- [ ] `npm run build` + SSR smoke.
- [ ] `npm test` с 100% покрытием затронутого кода.
- [ ] E2E chromium зелёные (если затронут пользовательский поток).
