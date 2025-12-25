import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { oauthActions } from '../../store/auth/auth.actions';

@Component({
  selector: 'app-auth-callback',
  templateUrl: './auth-callback.component.html',
  styleUrl: './auth-callback.component.css',
})
export class AuthCallbackComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private store = inject(Store);

  ngOnInit(): void {
    // Check for errors in query params
    this.route.queryParams.subscribe((params) => {
      if (params['error']) {
        this.store.dispatch(oauthActions.oAuthFailure({ 
          error: this.getErrorMessage(params['error']) 
        }));
        this.router.navigate(['/login']);
        return;
      }

      // OAuth successful - cookies are set by backend
      // Just dispatch success and redirect
      this.store.dispatch(oauthActions.oAuthSuccess({ 
        user: { id: '', email: '', name: '' } // Will be loaded by session check
      }));
      
      // Redirect to home after short delay
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 1000);
    });
  }

  private getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      'no_code': 'No authorization code received',
      'token_exchange_failed': 'Failed to exchange authorization code',
      'no_user_info': 'Failed to get user information',
      'user_creation_failed': 'Failed to create user account',
      'auth_failed': 'Authentication failed',
    };

    return errorMessages[error] || 'An error occurred during authentication';
  }
}
