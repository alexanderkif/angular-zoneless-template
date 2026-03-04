import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-url.token';

@Injectable({
  providedIn: 'root',
})
export class AuthRefreshCoordinatorService {
  private http = inject(HttpClient);
  private queryClient = inject(QueryClient);
  private apiUrl = inject(API_BASE_URL);

  private refreshInFlight: Promise<void> | null = null;

  refreshSession = async (): Promise<void> => {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.executeRefresh().finally(() => {
        this.refreshInFlight = null;
      });
    }

    return this.refreshInFlight;
  };

  private executeRefresh = async (): Promise<void> => {
    try {
      await lastValueFrom(
        this.http.post<void>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true }),
      );
    } catch (error) {
      this.queryClient.setQueryData(['auth', 'currentUser'], null);
      throw error;
    }
  };
}
