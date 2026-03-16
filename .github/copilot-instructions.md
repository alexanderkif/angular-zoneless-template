# Angular Zoneless Template - AI Coding Instructions

## Project Overview

Modern Angular 21 application with **Zoneless Change Detection**, SSR, and a Vercel/Supabase backend.

## Core Architecture & Patterns

### 1. Angular & Reactivity

- **Zoneless**: No `Zone.js`. Use `provideZonelessChangeDetection()` in [src/app/app.config.ts](src/app/app.config.ts).
- **Signals**: Use `signal()`, `computed()`, and `effect()` for local state.
- **Dependency Injection**: Use the `inject()` function instead of constructor injection.
- **Forms**: Use Signal-based forms from `@angular/forms/signals` (e.g., `form()`, `Field`). See [src/app/pages/login/login.component.ts](src/app/pages/login/login.component.ts).

### 2. State Management

- **UI State**: Use `@ngrx/signals` `signalStore` with `withState`, `withMethods`, `withComputed` and `patchState`. See [src/app/store/ui/ui.store.ts](src/app/store/ui/ui.store.ts).
- **Server State**: Use **TanStack Query** (`injectQuery`, `injectMutation`) for all API data — caching, pagination, optimistic updates. See [src/app/services/auth-query.service.ts](src/app/services/auth-query.service.ts).
- **No classic NgRx**: Do NOT use `createFeature`, `createActionGroup`, `createReducer`, `createEffect` or `Store` — these are not used in this project.
- **Inject stores**: Use `inject(UiStore)` in components to access signal store state directly as signals.

### 3. Backend (Vercel Functions)

- **Location**: [api/](api/) directory.
- **Tech**: Node.js, Zod for validation, Supabase for DB, JWT for auth.
- **Auth**: HttpOnly cookies for tokens, refresh token rotation, Argon2id for hashing.
- **CORS**: Handled in [api/\_lib/cors.ts](api/_lib/cors.ts).

### 4. SSR & Hydration

- **Hydration**: Enabled with `provideClientHydration(withHttpTransferCacheOptions(...))`.
- **SSR-Awareness**: Use `isPlatformBrowser(inject(PLATFORM_ID))` or the `WINDOW` token for browser-only code.
- **Interceptors**: [src/app/interceptors/ssr-cookie.interceptor.ts](src/app/interceptors/ssr-cookie.interceptor.ts) forwards cookies from SSR to API.

## Developer Workflows

### Critical Commands

- `npm run dev`: Starts both API (port 3000) and Angular SSR (port 4200).
- `npm test`: Runs Vitest unit tests (aim for 100% coverage).
- `npx playwright test`: Runs E2E tests.
- `npm run lint`: Runs ESLint with strict rules (arrow functions preferred).

### Testing Patterns

- **Vitest**: Native ESM support. Use `vi.mock()` for mocking.
- **Zoneless Testing**: Use `ComponentFixture.whenStable()` or `fixture.detectChanges()` as usual, but be aware of zoneless behavior.

## Coding Conventions

- **Arrow Functions**: Preferred for all functions (enforced by ESLint).
- **Component Inputs**: Use signal-based `input()`, `output()`, `viewChild()` instead of `@Input()`, `@Output()`, `@ViewChild()` decorators.
- **Imports**: Alphabetized (enforced by ESLint).
- **Types**: Strict TypeScript. Avoid `any`. Use Zod for runtime validation in API.
- **Security**: Always use `withCredentials: true` for API calls to include HttpOnly cookies.
