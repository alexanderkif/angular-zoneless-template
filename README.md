# Angular Zoneless Template

Production-ready Angular 21 template with zoneless change detection, SSR, secure authentication, and a Vercel/Supabase-friendly backend.

## Highlights

- Angular 21 + standalone architecture
- Zoneless change detection (`provideZonelessChangeDetection`)
- SSR + hydration (including TanStack Query dehydration/rehydration)
- Email/password + OAuth (GitHub, Google)
- HttpOnly cookie auth with refresh token rotation
- TanStack Query for server state, NgRx Signal Store for UI state
- Vitest unit tests + Playwright E2E
- Strict ESLint + TypeScript

## Stack

### Frontend

- Angular 21
- TypeScript 5.9
- RxJS
- TanStack Query (`@tanstack/angular-query-experimental`)
- NgRx Signal Store

### Backend

- Vercel Functions (`api/`)
- Drizzle ORM + PostgreSQL (Supabase/Vercel Postgres)
- JWT access/refresh token flow
- Argon2id password hashing
- Zod runtime validation

### Testing

- Vitest
- Playwright
- ESLint

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL database

### Install

```bash
npm install
```

### Environment

Create `.env.local` with required variables (see deployment docs), then run:

```bash
npm run dev
```

- Frontend SSR app: `http://localhost:4200`
- API (Vercel dev): `http://localhost:3000`

### Demo Account

Use the seeded demo user to explore posts/comments/reactions without registration:

- Email: `test@te.st`
- Password: `test`

Seed is created by migration `supabase/migrations/20260227_seed_demo_user.sql`.

## Scripts

| Script                  | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `npm run dev`           | Run API + SSR app together                        |
| `npm run dev:api`       | Run Vercel API only (port 3000)                   |
| `npm run dev:ssr`       | Run Angular app only (port 4200)                  |
| `npm start`             | Angular dev server                                |
| `npm run build`         | Production build                                  |
| `npm run lint`          | ESLint (warnings treated as errors)               |
| `npm test`              | Vitest run (includes `pretest` cleanup of `dist`) |
| `npm run test:watch`    | Vitest watch mode                                 |
| `npm run test:coverage` | Vitest with coverage                              |
| `npx playwright test`   | E2E tests                                         |

## Testing Notes

- `npm test` is configured for unit/integration tests in `src/**`.
- Playwright tests are in `tests/**` and use `playwright.config.ts` with project setup state.
- Before deploy, run at minimum:

```bash
npm run lint
npm run build
npm test
npx playwright test --project=chromium
```

## Security Model

- HttpOnly cookies for access/refresh tokens
- Refresh token rotation on refresh endpoint
- Logout clears cookies and revokes DB token
- Rate limiting in API layer
- Security headers and CORS handling in shared API utilities
- SSR cookie forwarding via interceptor for authenticated server-side data fetching

## Project Layout

```text
api/                    # Vercel serverless API
  _lib/                 # shared backend utilities (security/cors/env/password/session)
  auth/                 # auth handlers
  posts/ comments/      # content APIs
  reactions.ts          # likes/dislikes API
  db/                   # Drizzle db + schema

src/app/
  pages/                # route pages (home/about/login/register/posts/post-details/...)
  components/           # reusable UI components
  services/             # HTTP + query services
  store/                # UI signal store
  guards/               # auth/public guards
  interceptors/         # token refresh + SSR cookie forwarding
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full production setup and env vars.

Related docs:

- [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)
- [docs/EMAIL.md](docs/EMAIL.md)
- [docs/REMEMBER-ME.md](docs/REMEMBER-ME.md)
- [docs/SETUP-POSTS.md](docs/SETUP-POSTS.md)

## Status

Current baseline checks expected before release:

- Lint clean
- Unit tests green
- Unit coverage 100% (statements/branches/functions/lines)
- Playwright chromium green
- Production build successful
