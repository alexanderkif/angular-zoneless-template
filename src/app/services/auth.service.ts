import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthUser } from '../store/auth/auth.actions';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.apiUrl}/api`;

  /**
   * Login with email and password
   */
  login(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<{ user: AuthUser }>(`${this.apiUrl}/auth/login`, { email, password }, {
        withCredentials: true,
      })
      .pipe(
        map((response) => response.user),
        catchError(this.handleError)
      );
  }

  /**
   * Register new user with email
   */
  register(email: string, password: string, name: string): Observable<AuthUser> {
    return this.http
      .post<{ user: AuthUser }>(
        `${this.apiUrl}/auth/register`,
        { email, password, name },
        { withCredentials: true }
      )
      .pipe(
        map((response) => response.user),
        catchError(this.handleError)
      );
  }

  /**
   * Get current user from session
   */
  getCurrentUser(): Observable<AuthUser> {
    return this.http
      .get<{ user: AuthUser }>(`${this.apiUrl}/user/me`, {
        withCredentials: true,
      })
      .pipe(
        map((response) => response.user),
        catchError((error) => {
          // Don't log 401 errors - it's expected when not logged in
          if (error.status !== 401) {
            console.error('Get current user error:', error);
          }
          return throwError(() => new Error('Not authenticated'));
        })
      );
  }

  /**
   * Refresh access token
   */
  refreshToken(): Observable<AuthUser> {
    return this.http
      .post<{ user: AuthUser }>(`${this.apiUrl}/auth/refresh`, {}, {
        withCredentials: true,
      })
      .pipe(
        map((response) => response.user),
        catchError((error) => {
          // Don't log 401 errors for refresh - it's expected when logged out
          if (error.status !== 401) {
            console.error('Token refresh error:', error);
          }
          return throwError(() => new Error('Session expired'));
        })
      );
  }

  /**
   * Logout user
   */
  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/auth/logout`, {}, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Verify email with token
   */
  verifyEmail(token: string): Observable<{ message: string; user: AuthUser }> {
    return this.http
      .get<{ message: string; user: AuthUser }>(
        `${this.apiUrl}/auth/verify-email?token=${token}`,
        { withCredentials: true }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Login with GitHub OAuth
   */
  loginWithGithub(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.location.href = `${this.apiUrl}/auth/github`;
    }
  }

  /**
   * Login with Google OAuth
   */
  loginWithGoogle(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.location.href = `${this.apiUrl}/auth/google`;
    }
  }

  private handleError(error: any): Observable<never> {
    console.error('Auth service error:', error);
    const message = error.error?.error || error.message || 'An error occurred';
    return throwError(() => new Error(message));
  }
}
