import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'posts',
    loadComponent: () =>
      import('./pages/posts-list/posts-list.component').then((m) => m.PostsListComponent),
    pathMatch: 'full',
  },
  {
    path: 'posts/:id',
    loadComponent: () =>
      import('./pages/post-details/post-details.component').then((m) => m.PostDetailsComponent),
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
