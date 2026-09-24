import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, resource, signal, type WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../tokens/api-url.token';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: string;
  emailVerified: boolean;
  role: 'user' | 'admin';
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface MessageResult {
  message: string;
}

export interface EmailVerificationResult extends MessageResult {
  user: AuthUser;
}

/** Состояние async-действия — замена TanStack mutation `isPending`/`error`. */
export interface SessionActionState {
  readonly isPending: WritableSignal<boolean>;
  readonly error: WritableSignal<Error | null>;
}

const createActionState = (): SessionActionState => ({
  isPending: signal(false),
  error: signal<Error | null>(null),
});

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');

/**
 * SessionService — замена `AuthQueryService` + `AuthRefreshCoordinatorService`
 * на встроенный `resource()` Angular 22 + async-методы.
 *
 * Заменяет:
 * - `AuthQueryService` (injectQuery + injectMutation) — единый root-сервис вместо кэша;
 * - `AuthRefreshCoordinatorService` — коалесинг refresh внутри `refreshSession()`;
 * - `ssr-tanstack-hydration.ts` — встроенный TransferState через `id` ресурса.
 *
 * Важно: серверные данные живут в одном root-сервисе, а не в ресурсе каждого компонента
 * (глобального кэша у `resource()` нет).
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private http = inject(HttpClient);
  private apiUrl = inject(API_BASE_URL);

  private loadCurrentUser = async (): Promise<AuthUser | null> => {
    try {
      const response = await firstValueFrom(
        this.http.get<{ user: AuthUser }>(`${this.apiUrl}/user/me`, { withCredentials: true }),
      );
      return response.user;
    } catch (error: unknown) {
      if (!(error instanceof HttpErrorResponse && error.status === 401)) {
        // Любая иная ошибка трактуется как «нет пользователя»: resource не должен
        // уходить в error-state, иначе `currentUser.value()` бросает ResourceValueError в UI
        // (header/user-menu/panel читают value()).
        console.error('[SessionService] Failed to load current user:', error);
      }
      return null;
    }
  };

  /**
   * Текущий пользователь. `id` включает встроенный TransferState-кэш для SSR.
   */
  readonly currentUser = resource<AuthUser | null, void>({
    loader: this.loadCurrentUser,
    defaultValue: null,
    id: 'auth/currentUser',
  });

  // Состояния async-действий (аналог mutation.isPending / mutation.error).
  readonly loginState = createActionState();
  readonly registerState = createActionState();
  readonly logoutState = createActionState();
  readonly verifyEmailState = createActionState();
  readonly resendState = createActionState();

  private run = async <T>(
    state: SessionActionState,
    operation: () => Promise<T>,
  ): Promise<T> => {
    state.isPending.set(true);
    state.error.set(null);
    try {
      return await operation();
    } catch (error: unknown) {
      const normalized = toError(error);
      state.error.set(normalized);
      throw normalized;
    } finally {
      state.isPending.set(false);
    }
  };

  private pendingUser: Promise<AuthUser | null> | null = null;

  /**
   * Дедуплицирующая загрузка пользователя — замена `queryClient.ensureQueryData(...)`.
   * Используется в guards, где нужно принять решение до активации роута.
   */
  ensureUser = (): Promise<AuthUser | null> => {
    const status = this.currentUser.status();
    if (status === 'resolved' || status === 'local') {
      return Promise.resolve(this.currentUser.value());
    }

    this.pendingUser ??= this.loadCurrentUser()
      .then((user) => {
        this.currentUser.value.set(user);
        return user;
      })
      .finally(() => {
        this.pendingUser = null;
      });

    return this.pendingUser;
  };

  /** Перечитать `/user/me` (например, после OAuth-callback). */
  reloadCurrentUser = (): boolean => this.currentUser.reload();

  login = (credentials: LoginCredentials): Promise<AuthUser> =>
    this.run(this.loginState, async () => {
      const response = await firstValueFrom(
        this.http.post<{ user: AuthUser }>(`${this.apiUrl}/auth/login`, credentials, {
          withCredentials: true,
        }),
      );
      this.currentUser.value.set(response.user);
      return response.user;
    });

  register = (payload: RegisterPayload): Promise<AuthUser> =>
    this.run(this.registerState, async () => {
      const response = await firstValueFrom(
        this.http.post<{ user: AuthUser }>(`${this.apiUrl}/auth/register`, payload, {
          withCredentials: true,
        }),
      );
      this.currentUser.value.set(response.user);
      return response.user;
    });

  logout = (): Promise<void> =>
    this.run(this.logoutState, async () => {
      try {
        await firstValueFrom(
          this.http.post<void>(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true }),
        );
      } finally {
        this.currentUser.value.set(null);
      }
    });

  verifyEmail = (token: string): Promise<EmailVerificationResult> =>
    this.run(this.verifyEmailState, async () => {
      const response = await firstValueFrom(
        this.http.get<EmailVerificationResult>(
          `${this.apiUrl}/auth/verify-email?token=${encodeURIComponent(token)}`,
          { withCredentials: true },
        ),
      );
      this.currentUser.value.set(response.user);
      return response;
    });

  resendVerification = (payload: { email?: string; token?: string }): Promise<MessageResult> =>
    this.run(this.resendState, () =>
      firstValueFrom(
        this.http.post<MessageResult>(`${this.apiUrl}/auth/resend-verification`, payload, {
          withCredentials: true,
        }),
      ),
    );

  private refreshInFlight: Promise<AuthUser | null> | null = null;

  /**
   * Коалесинг refresh-запроса (раньше — AuthRefreshCoordinatorService).
   * Параллельные 401 из interceptors переиспользуют один in-flight промис.
   */
  refreshSession = (): Promise<AuthUser | null> => {
    this.refreshInFlight ??= this.executeRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  };

  private executeRefresh = async (): Promise<AuthUser | null> => {
    try {
      const response = await firstValueFrom(
        this.http.post<{ user: AuthUser }>(`${this.apiUrl}/auth/refresh`, {}, {
          withCredentials: true,
        }),
      );
      this.currentUser.value.set(response.user);
      return response.user;
    } catch (error: unknown) {
      this.currentUser.value.set(null);
      throw toError(error);
    }
  };
}
