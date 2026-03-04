import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_BASE_URL } from '../tokens/api-url.token';

export const resolveAuthErrorMessage = (error: any): string => {
  let message: unknown = 'An error occurred';

  if (error.error instanceof ErrorEvent) {
    message = error.error.message;
  } else if (
    error.error &&
    typeof error.error === 'object' &&
    Object.keys(error.error).length > 0
  ) {
    message = error.error.error || error.error.message || JSON.stringify(error.error);
  } else if (error.message) {
    message = error.message;
  }

  if (typeof message !== 'string') {
    return 'An unexpected error occurred';
  }

  return message;
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = inject(API_BASE_URL);

  /**
   * Cancel registration (delete unverified user)
   * Note: This is kept in AuthService as it's used in verify-email component
   */
  cancelRegistration(token: string): Observable<{ message: string }> {
    return this.http
      .post<{
        message: string;
      }>(`${this.apiUrl}/auth/cancel-registration`, { token }, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('Auth service error:', error);
    const message = resolveAuthErrorMessage(error);

    return throwError(() => new Error(message));
  }
}
