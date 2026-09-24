import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { WINDOW } from '../../tokens/window.token';

@Component({
  selector: 'app-auth-callback',
  templateUrl: './auth-callback.component.html',
  styleUrl: './auth-callback.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCallbackComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private session = inject(SessionService);
  private platformId = inject(PLATFORM_ID);
  private window = inject(WINDOW);

  ngOnInit(): void {
    // Check for errors in query params
    this.route.queryParams.subscribe((params) => {
      if (params['error']) {
        console.error('OAuth error:', this.getErrorMessage(params['error']));
        this.router.navigate(['/login']);
        return;
      }

      // OAuth successful - cookies are set by backend.
      // Re-fetch current user instead of TanStack refetchUser().
      this.session.reloadCurrentUser();

      // Get returnUrl from sessionStorage (saved before OAuth redirect)
      let returnUrl = '/';
      if (isPlatformBrowser(this.platformId)) {
        const savedReturnUrl = this.window.sessionStorage.getItem('authReturnUrl');
        if (savedReturnUrl) {
          returnUrl = savedReturnUrl;
          this.window.sessionStorage.removeItem('authReturnUrl');
        }
      }

      // Redirect after a short delay
      setTimeout(() => {
        this.router.navigate([returnUrl]);
      }, 100);
    });
  }

  private getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      no_code: 'No authorization code received',
      token_exchange_failed: 'Failed to exchange authorization code',
      no_user_info: 'Failed to get user information',
      user_creation_failed: 'Failed to create user account',
      auth_failed: 'Authentication failed',
    };

    return errorMessages[error] || 'An error occurred during authentication';
  }
}
