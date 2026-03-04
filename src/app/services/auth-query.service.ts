import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { injectMutation, injectQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-url.token';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: string;
  emailVerified: boolean;
  role: 'user' | 'admin';
}

const CURRENT_USER_QUERY_KEY = ['auth', 'currentUser'] as const;

const invalidateCurrentUser = async (queryClient: QueryClient, refetchType: 'none' | 'active') => {
  await queryClient.invalidateQueries({
    queryKey: CURRENT_USER_QUERY_KEY,
    refetchType,
  });
};

export const createFetchCurrentUser = (http: HttpClient, apiUrl: string) => {
  return async (): Promise<AuthUser | null> => {
    try {
      const response = await lastValueFrom(
        http.get<{ user: AuthUser }>(`${apiUrl}/user/me`, {
          withCredentials: true,
        }),
      );

      return response.user;
    } catch (error: any) {
      if (error.status === 401) {
        return null;
      }
      throw error;
    }
  };
};

export const createCurrentUserQueryOptions = (
  fetchCurrentUser: () => Promise<AuthUser | null>,
) => ({
  queryKey: CURRENT_USER_QUERY_KEY,
  queryFn: () => fetchCurrentUser(),
  retry: 1,
  staleTime: 1000 * 60 * 5,
  refetchOnMount: 'always' as const,
});

export const createLoginMutationOptions = (
  http: HttpClient,
  apiUrl: string,
  queryClient: QueryClient,
) => ({
  mutationFn: async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    const response = await lastValueFrom(
      http.post<{ user: AuthUser }>(`${apiUrl}/auth/login`, credentials, {
        withCredentials: true,
      }),
    );
    return response.user;
  },
  onSuccess: async (user: AuthUser) => {
    await queryClient.cancelQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
  },
});

export const createRegisterMutationOptions = (
  http: HttpClient,
  apiUrl: string,
  queryClient: QueryClient,
) => ({
  mutationFn: async (data: { email: string; password: string; name: string }) => {
    const response = await lastValueFrom(
      http.post<{ user: AuthUser }>(`${apiUrl}/auth/register`, data, {
        withCredentials: true,
      }),
    );
    return response.user;
  },
  onSuccess: async () => {
    await invalidateCurrentUser(queryClient, 'active');
  },
});

const clearAuthRelatedCache = (queryClient: QueryClient) => {
  queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
  queryClient.removeQueries({ queryKey: ['posts'] });
  queryClient.removeQueries({ queryKey: ['comments'] });
};

export const createLogoutMutationOptions = (
  http: HttpClient,
  apiUrl: string,
  queryClient: QueryClient,
) => ({
  mutationFn: async () =>
    lastValueFrom(http.post<void>(`${apiUrl}/auth/logout`, {}, { withCredentials: true })),
  retry: 0,
  onSuccess: () => {
    clearAuthRelatedCache(queryClient);
  },
  onError: () => {
    clearAuthRelatedCache(queryClient);
  },
});

export const createVerifyEmailMutationOptions = (
  http: HttpClient,
  apiUrl: string,
  queryClient: QueryClient,
) => ({
  mutationFn: async (token: string) => {
    const response = await lastValueFrom(
      http.get<{ message: string; user: AuthUser }>(`${apiUrl}/auth/verify-email?token=${token}`, {
        withCredentials: true,
      }),
    );
    return response;
  },
  onSuccess: async () => {
    await invalidateCurrentUser(queryClient, 'active');
  },
});

export const createResendVerificationMutationOptions = (http: HttpClient, apiUrl: string) => ({
  mutationFn: async (emailOrToken: { email?: string; token?: string }) => {
    const response = await lastValueFrom(
      http.post<{ message: string }>(`${apiUrl}/auth/resend-verification`, emailOrToken, {
        withCredentials: true,
      }),
    );
    return response;
  },
});

export const createRefreshTokenMutationOptions = (
  http: HttpClient,
  apiUrl: string,
  queryClient: QueryClient,
) => ({
  mutationFn: async () => {
    const response = await lastValueFrom(
      http.post<{ user: AuthUser }>(`${apiUrl}/auth/refresh`, {}, { withCredentials: true }),
    );
    return response.user;
  },
  onSuccess: async () => {
    await invalidateCurrentUser(queryClient, 'active');
  },
});

export const createCurrentUserQueryInjectionFactory =
  (fetchCurrentUser: () => Promise<AuthUser | null>) => () =>
    createCurrentUserQueryOptions(fetchCurrentUser);

export const createLoginMutationInjectionFactory =
  (http: HttpClient, apiUrl: string, queryClient: QueryClient) => () =>
    createLoginMutationOptions(http, apiUrl, queryClient);

export const createRegisterMutationInjectionFactory =
  (http: HttpClient, apiUrl: string, queryClient: QueryClient) => () =>
    createRegisterMutationOptions(http, apiUrl, queryClient);

export const createLogoutMutationInjectionFactory =
  (http: HttpClient, apiUrl: string, queryClient: QueryClient) => () =>
    createLogoutMutationOptions(http, apiUrl, queryClient);

export const createVerifyEmailMutationInjectionFactory =
  (http: HttpClient, apiUrl: string, queryClient: QueryClient) => () =>
    createVerifyEmailMutationOptions(http, apiUrl, queryClient);

export const createResendVerificationMutationInjectionFactory =
  (http: HttpClient, apiUrl: string) => () =>
    createResendVerificationMutationOptions(http, apiUrl);

export const createRefreshTokenMutationInjectionFactory =
  (http: HttpClient, apiUrl: string, queryClient: QueryClient) => () =>
    createRefreshTokenMutationOptions(http, apiUrl, queryClient);

/**
 * AuthQueryService - Manages authentication queries and mutations using TanStack Query
 *
 * Key features:
 * - Automatic caching and refetching
 * - Optimistic updates
 * - Automatic retry on failure
 * - Request deduplication
 */
@Injectable({
  providedIn: 'root',
})
export class AuthQueryService {
  private http = inject(HttpClient);
  private queryClient = inject(QueryClient);

  private apiUrl = inject(API_BASE_URL);
  private fetchCurrentUserInternal = createFetchCurrentUser(this.http, this.apiUrl);

  /**
   * Fetch current user - can be used standalone or as queryFn
   */
  async fetchCurrentUser(): Promise<AuthUser | null> {
    return this.fetchCurrentUserInternal();
  }

  /**
   * Query options for getting current user
   * Use with injectQuery() in component injection context.
   */
  currentUserQueryOptions = () => createCurrentUserQueryOptions(this.fetchCurrentUserInternal);

  /**
   * Backward-compatible helper for existing call sites/tests.
   */
  currentUserQuery = () => injectQuery(this.currentUserQueryOptions);

  /**
   * Mutation for logging in
   */
  loginMutation = () =>
    injectMutation(createLoginMutationInjectionFactory(this.http, this.apiUrl, this.queryClient));

  /**
   * Mutation for registering
   */
  registerMutation = () =>
    injectMutation(
      createRegisterMutationInjectionFactory(this.http, this.apiUrl, this.queryClient),
    );

  /**
   * Mutation for logging out
   * Best Practice 2026: Call server first, then clear local cache
   * This ensures refresh tokens are properly deleted from the database
   */
  logoutMutation = () =>
    injectMutation(createLogoutMutationInjectionFactory(this.http, this.apiUrl, this.queryClient));

  /**
   * Mutation for verifying email
   */
  verifyEmailMutation = () =>
    injectMutation(
      createVerifyEmailMutationInjectionFactory(this.http, this.apiUrl, this.queryClient),
    );

  /**
   * Mutation for resending verification email
   */
  resendVerificationMutation = () =>
    injectMutation(createResendVerificationMutationInjectionFactory(this.http, this.apiUrl));

  /**
   * Mutation for refreshing token
   */
  refreshTokenMutation = () =>
    injectMutation(
      createRefreshTokenMutationInjectionFactory(this.http, this.apiUrl, this.queryClient),
    );

  /**
   * Helper method to invalidate and refetch user
   */
  refetchUser = async () => {
    await this.queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
  };
}
