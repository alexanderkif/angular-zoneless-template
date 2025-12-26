import { Injectable, inject, PLATFORM_ID, makeStateKey, TransferState } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, exhaustMap, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { loginActions, registerActions, oauthActions, sessionActions, tokenActions, AuthUser } from './auth.actions';

// TransferState key for auth user data
const AUTH_USER_KEY = makeStateKey<AuthUser | null>('auth_user');

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private transferState = inject(TransferState);

  // Login
  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loginActions.login),
      exhaustMap(({ email, password, returnUrl }) =>
        this.authService.login(email, password).pipe(
          map((user) => loginActions.loginSuccess({ user, returnUrl })),
          catchError((error) =>
            of(loginActions.loginFailure({ error: error.message || 'Login failed' }))
          )
        )
      )
    )
  );

  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(loginActions.loginSuccess),
        tap(({ returnUrl }) => this.router.navigateByUrl(returnUrl || '/'))
      ),
    { dispatch: false }
  );

  // Redirect if authenticated and on login/register page (e.g. after SSR failure or direct navigation)
  redirectIfAuthenticated$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(sessionActions.sessionValid),
        tap(() => {
          const url = this.router.url;
          // Check if we are on a public auth page
          if (url.includes('/login') || url.includes('/register')) {
            const tree = this.router.parseUrl(url);
            const returnUrl = tree.queryParams['returnUrl'];
            this.router.navigateByUrl(returnUrl || '/');
          }
        })
      ),
    { dispatch: false }
  );

  // Register
  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(registerActions.register),
      exhaustMap(({ email, password, name }) =>
        this.authService.register(email, password, name).pipe(
          map((user) => registerActions.registerSuccess({ user })),
          catchError((error) =>
            of(registerActions.registerFailure({ error: error.message || 'Registration failed' }))
          )
        )
      )
    )
  );

  registerSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(registerActions.registerSuccess),
        tap(() => {
          // Don't navigate - user needs to verify email first
          // Component will show success message
        })
      ),
    { dispatch: false }
  );

  // OAuth
  githubLogin$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(oauthActions.githubLogin),
        tap(() => this.authService.loginWithGithub())
      ),
    { dispatch: false }
  );

  googleLogin$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(oauthActions.googleLogin),
        tap(() => this.authService.loginWithGoogle())
      ),
    { dispatch: false }
  );

  // Session check - SSR optimized with TransferState
  // Best Practice 2025: На сервере делаем запрос и сохраняем в TransferState
  // На клиенте сначала проверяем TransferState, если нет - делаем запрос
  checkSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(sessionActions.checkSession),
      exhaustMap(() => {
        // На клиенте проверяем наличие данных из SSR
        if (isPlatformBrowser(this.platformId)) {
          // Проверяем существование ключа в TransferState
          if (this.transferState.hasKey(AUTH_USER_KEY)) {
            const cachedUser = this.transferState.get(AUTH_USER_KEY, null);
            // Удаляем из TransferState чтобы не использовать повторно
            this.transferState.remove(AUTH_USER_KEY);
            
            // Используем данные из SSR (может быть user или null)
            if (cachedUser) {
              return of(sessionActions.sessionValid({ user: cachedUser }));
            } else {
              return of(sessionActions.sessionInvalid());
            }
          }
          
          // Если ключа нет - делаем запрос (fallback для CSR без SSR)
          return this.authService.getCurrentUser().pipe(
            map((user) => sessionActions.sessionValid({ user })),
            catchError(() => of(sessionActions.sessionInvalid()))
          );
        }
        
        // На сервере (или любой другой платформе) делаем запрос и сохраняем в TransferState
        // Best Practice 2025: Проверяем наличие cookies перед запросом
        // Во время сборки (prerender) requestStorage пуст -> запрос не делается
        // Если у пользователя нет cookies -> запрос не делается
        const storage = (globalThis as any).requestStorage;
        const request = storage?.getStore();
        
        if (!request || !request.headers?.cookie) {
          this.transferState.set(AUTH_USER_KEY, null);
          return of(sessionActions.sessionInvalid());
        }

        return this.authService.getCurrentUser().pipe(
          tap((user) => {
            // Сохраняем user в TransferState для клиента
            this.transferState.set(AUTH_USER_KEY, user);
          }),
          map((user) => sessionActions.sessionValid({ user })),
          catchError(() => {
            // Важно: сохраняем null чтобы клиент знал что проверка была
            this.transferState.set(AUTH_USER_KEY, null);
            return of(sessionActions.sessionInvalid());
          })
        );
      })
    )
  );

  // Logout - optimistic approach (2025 best practice)
  // Clear state immediately, call API in background
  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(sessionActions.logout),
        tap(() => {
          // Check if current route is protected (e.g. /posts)
          // If protected, navigate to home. If public, stay on page.
          const currentUrl = this.router.url;
          const isProtected = currentUrl.startsWith('/posts'); // Add other protected routes here
          
          if (isProtected) {
            this.router.navigate(['/']);
          }
          
          // Call logout API in background (fire and forget)
          this.authService.logout().subscribe({
            error: (err: Error) => console.error('Logout API error:', err)
          });
        })
      ),
    { dispatch: false }
  );

  // Remove logoutSuccess$ effect - no longer needed

  // Token refresh
  refreshToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(tokenActions.refreshToken),
      exhaustMap(() =>
        this.authService.refreshToken().pipe(
          map((user: AuthUser) => tokenActions.refreshTokenSuccess({ user })),
          catchError((error) =>
            of(tokenActions.refreshTokenFailure({ error: error.message || 'Token refresh failed' }))
          )
        )
      )
    )
  );
}
