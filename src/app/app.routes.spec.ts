import { routes } from './app.routes';
import { AboutComponent } from './pages/about/about.component';
import { AuthCallbackComponent } from './pages/auth-callback/auth-callback.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component';
import { PostDetailsComponent } from './pages/post-details/post-details.component';
import { PostsListComponent } from './pages/posts-list/posts-list.component';
import { RegisterComponent } from './pages/register/register.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { VerifyEmailComponent } from './pages/verify-email/verify-email';

describe('app.routes', () => {
  it('should define routes', () => {
    expect(routes).toBeDefined();
    expect(Array.isArray(routes)).toBe(true);
  });

  it('should have 10 routes', () => {
    expect(routes.length).toBe(10);
  });

  it('should have posts list route', () => {
    const postsRoute = routes.find((r) => r.path === 'posts');
    expect(postsRoute).toBeDefined();
    expect(postsRoute?.pathMatch).toBe('full');
    expect(postsRoute?.canActivate).toBeDefined();
  });

  it('should have post details route', () => {
    const postDetailsRoute = routes.find((r) => r.path === 'posts/:id');
    expect(postDetailsRoute).toBeDefined();
    expect(postDetailsRoute?.canActivate).toBeDefined();
  });

  it('should have about route', () => {
    const aboutRoute = routes.find((r) => r.path === 'about');
    expect(aboutRoute).toBeDefined();
    expect(aboutRoute?.loadComponent).toBeDefined();
  });

  it('should have home route as default', () => {
    const homeRoute = routes.find((r) => r.path === '');
    expect(homeRoute).toBeDefined();
    expect(homeRoute?.pathMatch).toBe('full');
  });

  it('should have wildcard route for 404', () => {
    const wildcardRoute = routes.find((r) => r.path === '**');
    expect(wildcardRoute).toBeDefined();
    expect(wildcardRoute?.loadComponent).toBeDefined();
  });

  it('should have lazy loaded components', () => {
    routes.forEach((route) => {
      if (route.loadComponent) {
        expect(typeof route.loadComponent).toBe('function');
      }
    });
  });

  it('should protect posts routes with authGuard', () => {
    const postsRoute = routes.find((r) => r.path === 'posts');
    const postDetailsRoute = routes.find((r) => r.path === 'posts/:id');
    const settingsRoute = routes.find((r) => r.path === 'settings');

    expect(postsRoute?.canActivate).toBeDefined();
    expect(postsRoute?.canActivate?.length).toBe(1);
    expect(postDetailsRoute?.canActivate).toBeDefined();
    expect(postDetailsRoute?.canActivate?.length).toBe(1);
    expect(settingsRoute?.canActivate).toBeDefined();
    expect(settingsRoute?.canActivate?.length).toBe(1);
  });

  it('should protect public routes with publicGuard', () => {
    const loginRoute = routes.find((r) => r.path === 'login');
    const registerRoute = routes.find((r) => r.path === 'register');

    expect(loginRoute?.canActivate).toBeDefined();
    expect(loginRoute?.canActivate?.length).toBe(1);
    expect(registerRoute?.canActivate).toBeDefined();
    expect(registerRoute?.canActivate?.length).toBe(1);
  });

  // Test lazy loading functions
  it('should load PostsListComponent via lazy loading', async () => {
    const postsRoute = routes.find((r) => r.path === 'posts');
    const loadComponent = postsRoute?.loadComponent;

    expect(loadComponent).toBeDefined();
    if (loadComponent) {
      const module = await loadComponent();
      expect(module).toBe(PostsListComponent);
    }
  });

  it('should load PostDetailsComponent via lazy loading', async () => {
    const postDetailsRoute = routes.find((r) => r.path === 'posts/:id');
    const loadComponent = postDetailsRoute?.loadComponent;

    expect(loadComponent).toBeDefined();
    if (loadComponent) {
      const module = await loadComponent();
      expect(module).toBe(PostDetailsComponent);
    }
  });

  it('should load AboutComponent via lazy loading', async () => {
    const aboutRoute = routes.find((r) => r.path === 'about');
    const loadComponent = aboutRoute?.loadComponent;

    expect(loadComponent).toBeDefined();
    if (loadComponent) {
      const module = await loadComponent();
      expect(module).toBe(AboutComponent);
    }
  });

  it('should load HomeComponent via lazy loading', async () => {
    const homeRoute = routes.find((r) => r.path === '');
    const loadComponent = homeRoute?.loadComponent;

    expect(loadComponent).toBeDefined();
    if (loadComponent) {
      const module = await loadComponent();
      expect(module).toBe(HomeComponent);
    }
  });

  it('should load PageNotFoundComponent via lazy loading', async () => {
    const wildcardRoute = routes.find((r) => r.path === '**');
    const loadComponent = wildcardRoute?.loadComponent;

    expect(loadComponent).toBeDefined();
    if (loadComponent) {
      const module = await loadComponent();
      expect(module).toBe(PageNotFoundComponent);
    }
  });

  it('should load LoginComponent via lazy loading', async () => {
    const route = routes.find((r) => r.path === 'login');
    const loadComponent = route?.loadComponent;

    expect(loadComponent).toBeDefined();
    if (loadComponent) {
      const module = await loadComponent();
      expect(module).toBe(LoginComponent);
    }
  });

  it('should load RegisterComponent via lazy loading', async () => {
    const route = routes.find((r) => r.path === 'register');
    const loadComponent = route?.loadComponent;

    expect(loadComponent).toBeDefined();
    if (loadComponent) {
      const module = await loadComponent();
      expect(module).toBe(RegisterComponent);
    }
  });

  it('should load AuthCallbackComponent via lazy loading', async () => {
    const route = routes.find((r) => r.path === 'auth/callback');
    const loadComponent = route?.loadComponent;

    expect(loadComponent).toBeDefined();
    if (loadComponent) {
      const module = await loadComponent();
      expect(module).toBe(AuthCallbackComponent);
    }
  });

  it('should load VerifyEmailComponent via lazy loading', async () => {
    const route = routes.find((r) => r.path === 'verify-email');
    const loadComponent = route?.loadComponent;

    expect(loadComponent).toBeDefined();
    if (loadComponent) {
      const module = await loadComponent();
      expect(module).toBe(VerifyEmailComponent);
    }
  });

  it('should load SettingsComponent via lazy loading', async () => {
    const route = routes.find((r) => r.path === 'settings');
    const loadComponent = route?.loadComponent;

    expect(loadComponent).toBeDefined();
    if (loadComponent) {
      const module = await loadComponent();
      expect(module).toBe(SettingsComponent);
    }
  });
});
