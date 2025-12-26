import { routes } from './app.routes';
import { PostsListComponent } from './pages/posts-list/posts-list.component';
import { PostDetailsComponent } from './pages/post-details/post-details.component';
import { AboutComponent } from './pages/about/about.component';
import { HomeComponent } from './pages/home/home.component';
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component';

describe('app.routes', () => {
  it('should define routes', () => {
    expect(routes).toBeDefined();
    expect(Array.isArray(routes)).toBe(true);
  });

  it('should have 9 routes', () => {
    expect(routes.length).toBe(9);
  });

  it('should have posts list route', () => {
    const postsRoute = routes.find((r) => r.path === 'posts');
    expect(postsRoute).toBeDefined();
    expect(postsRoute?.pathMatch).toBe('full');
    expect(postsRoute?.canActivate).toBeDefined();
    expect(postsRoute?.providers).toBeDefined();
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
    
    expect(postsRoute?.canActivate).toBeDefined();
    expect(postsRoute?.canActivate?.length).toBe(1);
    expect(postDetailsRoute?.canActivate).toBeDefined();
    expect(postDetailsRoute?.canActivate?.length).toBe(1);
  });

  it('should provide NgRx state and effects for posts route', () => {
    const postsRoute = routes.find((r) => r.path === 'posts');
    expect(postsRoute?.providers).toBeDefined();
    expect(postsRoute?.providers?.length).toBe(2);
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
});
