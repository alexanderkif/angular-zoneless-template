# Angular Zoneless Template

Modern Angular 20 application template with **zoneless change detection**, server-side rendering (SSR), **authentication (Email + OAuth)**, state management, and comprehensive testing setup.

##  Features

- **Angular 20.3** - Latest stable version with zoneless architecture
- **Server-Side Rendering (SSR)** - Angular Universal for improved SEO and performance
- **Authentication** - Email + OAuth (GitHub, Google) with JWT & Supabase
- **State Management** - NgRx Store with Effects for predictable state management
- **Vitest** - Fast, modern test runner with native ESM support
- **100% Test Coverage** - Comprehensive unit tests for all components, services, and logic
- **Playwright** - End-to-end testing framework
- **TypeScript 5.9** - Strict type checking
- **Lazy Loading** - Route-based code splitting for optimal bundle size
- **Signal Forms** - Modern Angular reactive forms

##  Tech Stack

### Core
- **Angular 20.3.0** - Framework
- **TypeScript 5.9.2** - Language
- **RxJS 7.8.0** - Reactive programming
- **Express 5.1.0** - SSR server

### State Management
- **@ngrx/store 20.0.1** - State management
- **@ngrx/effects 20.0.1** - Side effects
- **@ngrx/store-devtools 20.0.1** - Redux DevTools integration

### Authentication & Backend
- **Supabase** - PostgreSQL database with authentication
- **Vercel Functions** - Serverless API endpoints
- **JWT** - Token-based authentication with refresh tokens (15m access, 7d refresh)
- **Argon2id** - Modern password hashing (2025 OWASP recommendation)
- **Rate Limiting** - Protection against brute force attacks (5 login/min, 3 register/min)
- **Security Headers** - CSP, XSS protection, Frame Options, etc.
- **OAuth** - GitHub and Google authentication
- **Multi-Device Support** - Up to 5 concurrent sessions per user
- **Session Management** - Auto-cleanup of expired tokens, device limit enforcement
- **Email Verification** - Required for email registrations with Nodemailer + Gmail SMTP
- **HttpOnly Cookies** - Secure token storage with SameSite=Lax
- **Token Rotation** - Refresh tokens are rotated on every refresh
- **Optimistic Logout** - Fire-and-forget logout for instant UX

### Testing
- **Vitest 3.2.4** - Unit test runner with native ESM support
- **@vitest/ui 3.2.4** - Visual test interface
- **@vitest/coverage-v8 3.2.4** - Code coverage reporting
- **@analogjs/vite-plugin-angular 2.1.3** - Official Angular + Vitest integration
- **Playwright 1.56.0** - E2E testing
- **jsdom 25.0.1** - DOM testing environment
- Uses latest Angular 20 testing APIs with zoneless change detection

##  Development

### Prerequisites
- Node.js 20.11.1 or higher
- npm 11.6.2 or higher
- Supabase account (free tier available)

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup Supabase (cloud)
# - Create project at https://supabase.com
# - Copy .env.local and add your Supabase credentials
# - Run SQL migration in Supabase Dashboard → SQL Editor:
#   supabase/migrations/20241222_initial_schema.sql

# 3. Setup Email
# - Development: Verification links logged to console (mock mode)
# - Production: Configure Gmail SMTP or use email service (Resend, SendGrid)
# - See docs/EMAIL.md

# 4. Start development
npm run dev
```

Visit:
- Frontend: http://localhost:4200
- API: http://localhost:3000

### Installation

```bash
npm install
```

### Development Server

Start the development server with hot reload:

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload when you change source files.

### Build

Build the project for production:

```bash
npm run build
```

Artifacts will be stored in the `dist/` directory, optimized for production.

### Watch Mode

Build in watch mode for development:

```bash
npm run watch
```

##  OAuth Setup (Optional)

### GitHub
1. Create OAuth App: https://github.com/settings/developers
2. Set Homepage URL: `https://angular-zoneless-template.vercel.app`
3. Set Callback URL: `https://angular-zoneless-template.vercel.app/api/auth/callback-github`
4. Add credentials to `.env.local`:
```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

### Google
1. Create OAuth Client: https://console.cloud.google.com
2. Add Authorized origins: `https://angular-zoneless-template.vercel.app`
3. Add Redirect URI: `https://angular-zoneless-template.vercel.app/api/auth/callback-google`
4. Add credentials to `.env.local`:
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

##  Testing

### Unit Tests

Run all unit tests once:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Open interactive test UI in browser:

```bash
npm run test:ui
```

Generate coverage report:

```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory. Open `coverage/index.html` to view detailed results.

**Current Coverage: 100%** 
- **125 tests** across all modules
- 100% statements, branches, functions, and lines covered

### E2E Tests

Run end-to-end tests with Playwright:

```bash
npx playwright test
```

Run E2E tests in UI mode:

```bash
npx playwright test --ui
```

##  Project Structure

```
api/                     # Vercel serverless functions
  auth/                  # Auth endpoints
    register.ts          # Email registration with verification email
    login.ts             # Email login with session management
    refresh.ts           # Token refresh with rotation
    logout.ts            # Optimistic logout
    verify-email.ts      # Email verification endpoint
    resend-verification.ts # Resend verification email
    github.ts            # GitHub OAuth initiation
    google.ts            # Google OAuth initiation
    callback-github.ts   # GitHub OAuth callback
    callback-google.ts   # Google OAuth callback
  user/                  # User endpoints
    me.ts                # Get current user
    sessions.ts          # Get active sessions
    revoke-session.ts    # Revoke specific session
  lib/                   # Shared utilities
    cors.ts              # CORS configuration
    password.ts          # Argon2id hashing
    env.ts               # Environment validation with Zod
    security.ts          # Rate limiting & security headers
    session-manager.ts   # Session cleanup & device limit
    email.ts             # Email sending with Nodemailer (Ethereal for dev)
src/
 app/
    store/               # NgRx state management
       auth/             # Auth state (actions, reducer, effects, selectors)
       posts/
    services/            # Business logic services
       auth.service.ts   # Authentication API service
    service/             # Domain services
       post.service.ts   # Post data service
    components/          # Reusable UI components
       footer/
       header/
       logo/
       main-content/
       panel/
       post/
       user-menu/
    pages/               # Route components
       login/            # Login page with Signal Forms
       register/         # Registration page with email verification
       verify-email/     # Email verification page
       auth-callback/    # OAuth callback handler
       about/
       home/
       page-not-found/
       post-details/
       posts-list/
    guards/              # Route guards
       auth.guard.ts     # Protect authenticated routes
    interceptors/        # HTTP interceptors
       token-refresh.interceptor.ts # Auto token refresh
       loggingInterceptor.ts
    types/               # TypeScript interfaces
       post.ts           # Post types
    utils/               # Utility functions
    app.config.ts        # App configuration
    app.config.server.ts # SSR configuration
    app.routes.ts        # Route definitions
    app.ts               # Root component
supabase/
  migrations/            # Database migrations
    20241222_initial_schema.sql        # Complete schema: users, refresh_tokens, email verification
 test-setup.ts           # Vitest test configuration
 vitest.config.ts        # Vitest configuration
```

##  Session Management

For detailed information, see [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md).

### Multi-Device Strategy
The authentication system supports **up to 5 concurrent sessions** per user:

1. **On Login** (email/OAuth):
   - Check active sessions count
   - If ≥5 sessions → delete oldest session
   - Create new refresh token
   - Clean up expired tokens (fire-and-forget)

2. **Token Lifetime**:
   - Access token: 15 minutes
   - Refresh token: 7 days
   - Auto-refresh on API 401 errors

3. **Session Cleanup**:
   - Expired tokens removed on each login
   - Token rotation on refresh (old token deleted)
   - Fire-and-forget logout (instant UX)

4. **Security Features**:
   - HttpOnly cookies (XSS protection)
   - SameSite=Lax (CSRF protection)
   - Rate limiting (5 login/min, 3 register/min)
   - Argon2id password hashing

### Session Management API

**Get Active Sessions:**
```typescript
GET /api/user/sessions
// Returns: { sessions: [{id, createdAt, expiresAt}], total: number }
```

**Revoke Session:**
```typescript
DELETE /api/user/revoke-session?sessionId=xxx
// Deletes specific session
```

### Why 5 Devices?
- **Balance**: Security vs UX
- **Use cases**: Phone, Laptop, Tablet, Work PC, Home PC
- **2025 Best Practice**: Most apps allow 3-10 concurrent sessions

### Alternative Strategies

**Single Session** (highest security):
```typescript
// In session-manager.ts, change MAX_ACTIVE_SESSIONS to 1
const MAX_ACTIVE_SESSIONS = 1;
```

**Unlimited Sessions** (best UX):
```typescript
// Remove session limit check in cleanupAndLimitSessions()
// Only clean expired tokens
```

##  Configuration Files

- **vitest.config.ts** - Vitest test runner configuration with @analogjs/vite-plugin-angular
- **playwright.config.ts** - Playwright E2E test configuration
- **tsconfig.json** - TypeScript compiler options
- **tsconfig.spec.json** - TypeScript configuration for tests
- **angular.json** - Angular CLI configuration

##  Key Concepts

### Zoneless Change Detection
This project uses Angular`'s experimental zoneless mode for better performance:
- Manual change detection control
- Reduced overhead from Zone.js
- Signal-based reactivity

### Lazy Loading
Routes are configured with lazy loading for optimal initial load time:
```typescript
loadComponent: () => import(`'./pages/home/home.component`')
  .then((m) => m.HomeComponent)
```

### State Management Pattern
- **Actions** - Events that describe state changes
- **Reducers** - Pure functions that handle state transitions
- **Effects** - Side effects like HTTP requests
- **Selectors** - Derived state queries

##  Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both API and Angular dev servers |
| `npm run dev:api` | Start Vercel API only (port 3000) |
| `npm run dev:ssr` | Start Angular SSR only (port 4200) |
| `npm start` | Start Angular development server |
| `npm run build` | Production build |
| `npm test` | Run unit tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:ui` | Open test UI with coverage |
| `npm run test:coverage` | Generate coverage report |
| `npx playwright test` | Run E2E tests |

##  Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Vercel deployment and environment variables.

### Vercel Production Deploy

1. Deploy to Vercel:
```bash
vercel --prod
```

2. Add environment variables in Vercel Dashboard (Settings → Environment Variables):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT` (for production email)
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (if using GitHub OAuth)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (if using Google OAuth)

3. Update OAuth callback URLs to production domain in GitHub/Google OAuth settings

##  Additional Resources

- [Angular Documentation](https://angular.dev)
- [Angular CLI](https://angular.dev/tools/cli)
- [NgRx Documentation](https://ngrx.io)
- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)

##  License

This project is open source and available under the MIT License.
