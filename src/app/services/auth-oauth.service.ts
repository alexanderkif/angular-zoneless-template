import { isPlatformBrowser } from '@angular/common';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { API_BASE_URL } from '../tokens/api-url.token';
import { WINDOW } from '../tokens/window.token';

@Injectable({
  providedIn: 'root',
})
export class AuthOauthService {
  private platformId = inject(PLATFORM_ID);
  private window = inject(WINDOW);
  private apiUrl = inject(API_BASE_URL);

  loginWithGithub = (returnUrl?: string): void => {
    this.startOauthLogin(`${this.apiUrl}/auth/github`, returnUrl);
  };

  loginWithGoogle = (returnUrl?: string): void => {
    this.startOauthLogin(`${this.apiUrl}/auth/google`, returnUrl);
  };

  private startOauthLogin = (url: string, returnUrl?: string): void => {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (returnUrl) {
      this.window.sessionStorage.setItem('authReturnUrl', returnUrl);
    }

    this.window.location.href = url;
  };
}
