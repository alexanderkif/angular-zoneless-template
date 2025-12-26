import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { PostsEffects } from './store/posts/posts.effects';
import { postsFeature } from './store/posts/posts.reducer';
import { authGuard } from './guards/auth-guard';
import { publicGuard } from './guards/public.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
    canActivate: [publicGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent),
    canActivate: [publicGuard],
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/auth-callback/auth-callback.component').then(
        (m) => m.AuthCallbackComponent
      ),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/verify-email/verify-email').then((m) => m.VerifyEmailComponent),
  },
  {
    path: 'posts',
    loadComponent: () =>
      import('./pages/posts-list/posts-list.component').then((m) => m.PostsListComponent),
    pathMatch: 'full',
    providers: [provideState(postsFeature), provideEffects([PostsEffects])],
    canActivate: [authGuard],
  },
  {
    path: 'posts/:id',
    loadComponent: () =>
      import('./pages/post-details/post-details.component').then((m) => m.PostDetailsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    pathMatch: 'full',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/page-not-found/page-not-found.component').then(
        (m) => m.PageNotFoundComponent
      ),
  },
];
