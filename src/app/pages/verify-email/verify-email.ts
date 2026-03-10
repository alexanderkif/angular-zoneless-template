import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { LinkButtonComponent } from '../../components/ui/link-button/link-button.component';
import { AuthQueryService } from '../../services/auth-query.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [ButtonComponent, LinkButtonComponent],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailComponent implements OnInit {
  status = signal<'loading' | 'success' | 'error'>('loading');
  message = signal<string>('Verifying your email...');

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private authQueryService = inject(AuthQueryService);

  verifyEmailMutation = this.authQueryService.verifyEmailMutation();
  resendMutation = this.authQueryService.resendVerificationMutation();

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status.set('error');
      this.message.set('Invalid verification link');
      return;
    }

    // Call verification endpoint with TanStack Query mutation
    this.verifyEmailMutation.mutate(token, {
      onSuccess: (response) => {
        this.status.set('success');
        this.message.set(response.message || 'Email verified successfully!');

        // Redirect to home after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      },
      onError: (error: Error) => {
        this.status.set('error');
        this.message.set(error.message || 'Failed to verify email');
      },
    });
  }

  resendVerification() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) return;

    this.status.set('loading');
    this.message.set('Sending new verification link...');

    this.resendMutation.mutate(
      { token },
      {
        onSuccess: (response) => {
          this.status.set('error'); // Keep error state to show message
          this.message.set(response.message);
        },
        onError: (error: Error) => {
          this.message.set(error.message || 'Failed to resend verification link');
        },
      },
    );
  }

  cancelRegistration() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      return;
    }
    if (
      !confirm('Are you sure you want to cancel your registration? This will delete your account.')
    ) {
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
      },
    });
  }
}
