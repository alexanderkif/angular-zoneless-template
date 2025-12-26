import { Injectable, inject, PLATFORM_ID, isDevMode } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthUser } from '../store/auth/auth.actions';
import { WINDOW } from '../tokens/window.token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private window = inject(WINDOW);
  private apiUrl = isDevMode() ? 'http://localhost:3000/api' : '/api';

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
   * Resend verification email using email address
   */
  resendVerification(email: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${this.apiUrl}/auth/resend-verification`,
        { email },
        { withCredentials: true }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Resend verification email using expired token
   */
  resendVerificationByToken(token: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${this.apiUrl}/auth/resend-verification`,
        { token },
        { withCredentials: true }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Cancel registration (delete unverified user)
   */
  cancelRegistration(token: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${this.apiUrl}/auth/cancel-registration`,
        { token },
        { withCredentials: true }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Login with GitHub OAuth
   */
  loginWithGithub(): void {
    this.navigateTo(`${this.apiUrl}/auth/github`);
  }

  /**
   * Login with Google OAuth
   */
  loginWithGoogle(): void {
    this.navigateTo(`${this.apiUrl}/auth/google`);
  }

  public navigateTo(url: string): void {
    if (isPlatformBrowser(this.platformId)) {
      this.window.location.href = url;
    }
  }

  private handleError(error: any): Observable<never> {
    console.error('Auth service error:', error);
    let message = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      message = error.error.message;
    } else if (error.error && typeof error.error === 'object' && Object.keys(error.error).length > 0) {
      // Server-side error with JSON body
      message = error.error.error || error.error.message || JSON.stringify(error.error);
    } else if (error.message) {
      // Generic HTTP error message or JS Error
      message = error.message;
    }
    
    // Ensure message is a string
    if (typeof message !== 'string') {
      message = 'An unexpected error occurred';
    }

    return throwError(() => new Error(message));
  }
}
