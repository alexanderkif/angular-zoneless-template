import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { AuthService } from '../../services/auth.service';
import { loginActions } from '../../store/auth/auth.actions';

@Component({
  selector: 'app-verify-email',
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css'
})
export class VerifyEmailComponent implements OnInit {
  status = signal<'loading' | 'success' | 'error'>('loading');
  message = signal<string>('Verifying your email...');

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private store = inject(Store);

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status.set('error');
      this.message.set('Invalid verification link');
      return;
    }

    // Call verification endpoint
    this.authService.verifyEmail(token).subscribe({
      next: (response) => {
        this.status.set('success');
        this.message.set(response.message || 'Email verified successfully!');
        
        // Update store with logged in user
        this.store.dispatch(loginActions.loginSuccess({ user: response.user }));
        
        // Redirect to home after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      },
      error: (error) => {
        this.status.set('error');
        this.message.set(error.message || 'Failed to verify email');
      }
    });
  }

  resendVerification() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) return;

    this.status.set('loading');
    this.message.set('Sending new verification link...');

    this.authService.resendVerificationByToken(token).subscribe({
      next: (response) => {
        this.status.set('error'); // Keep error state to show message, but maybe with a success icon?
        // Actually, let's use a new state or just update message
        this.message.set(response.message);
        // We stay on the error screen but with updated message
      },
      error: (error) => {
        this.message.set(error.message || 'Failed to resend verification link');
      }
    });
  }

  cancelRegistration() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) return;

    if (!confirm('Are you sure you want to cancel your registration? This will delete your account.')) {
      return;
    }

    this.status.set('loading');
    this.message.set('Cancelling registration...');

    this.authService.cancelRegistration(token).subscribe({
      next: (response) => {
        this.status.set('error'); // Using error layout for info
        this.message.set(response.message);
        setTimeout(() => {
          this.router.navigate(['/register']);
        }, 2000);
      },
      error: (error) => {
        this.status.set('error');
        this.message.set(error.message || 'Failed to cancel registration');
      }
    });
  }
}
