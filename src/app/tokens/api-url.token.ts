import { InjectionToken, isDevMode } from '@angular/core';

export const getApiBaseUrl = (isDevEnvironment: boolean): string =>
  isDevEnvironment ? 'http://localhost:3000/api' : '/api';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => getApiBaseUrl(isDevMode()),
});
