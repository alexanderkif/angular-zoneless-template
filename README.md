# Angular Zoneless Template

Modern Angular 20 application template with **zoneless change detection**, server-side rendering (SSR), state management, and comprehensive testing setup.

##  Features

- **Angular 20.3** - Latest stable version with zoneless architecture
- **Server-Side Rendering (SSR)** - Angular Universal for improved SEO and performance
- **State Management** - NgRx Store with Effects for predictable state management
- **Vitest** - Fast, modern test runner with native ESM support
- **100% Test Coverage** - Comprehensive unit tests for all components, services, and logic
- **Playwright** - End-to-end testing framework
- **TypeScript 5.9** - Strict type checking
- **Lazy Loading** - Route-based code splitting for optimal bundle size

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
src/
 app/
    components/          # Reusable UI components
       footer/
       header/
       logo/
       main-content/
       panel/
       post/
       user-menu/
    pages/               # Route components
       about/
       home/
       page-not-found/
       post-details/
       posts-list/
    service/             # Business logic services
       post.service.ts
       user.service.ts
    store/               # NgRx state management
       posts/
          actions/
          posts.effects.ts
          posts.reducer.ts
          posts.selector.ts
       users/
           actions/
           users.effects.ts
           users.reducer.ts
           users.selector.ts
    guards/              # Route guards
       auth-guard.ts
    interceptors/        # HTTP interceptors
       loggingInterceptor.ts
    types/               # TypeScript interfaces
       post.ts
       user.ts
    utils/               # Utility functions
       utils.ts
    app.config.ts        # App configuration
    app.config.server.ts # SSR configuration
    app.routes.ts        # Route definitions
    app.ts               # Root component
 test-setup.ts            # Vitest test configuration
 vitest.config.ts         # Vitest configuration
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
| `npm start` | Start development server |
| `npm run build` | Production build |
| `npm run watch` | Build in watch mode |
| `npm test` | Run unit tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:ui` | Open test UI with coverage |
| `npm run test:coverage` | Generate coverage report |
| `npx playwright test` | Run E2E tests |

##  Deployment

The application is configured for Server-Side Rendering:

```bash
npm run build
npm run serve:ssr:angular-test-app
```

This builds both client and server bundles and starts the SSR server.

##  Additional Resources

- [Angular Documentation](https://angular.dev)
- [Angular CLI](https://angular.dev/tools/cli)
- [NgRx Documentation](https://ngrx.io)
- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)

##  License

This project is open source and available under the MIT License.
