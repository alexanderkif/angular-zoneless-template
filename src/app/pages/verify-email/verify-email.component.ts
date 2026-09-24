import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { LinkButtonComponent } from '../../components/ui/link-button/link-button.component';
import { SessionService } from '../../core/auth/session.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [ButtonComponent, LinkButtonComponent],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailComponent implements OnInit {
  status = signal<'loading' | 'success' | 'error'>('loading');
  message = signal<string>('Verifying your email...');

  private route = inject(ActivatedRoute);
  private session = inject(SessionService);
  private authService = inject(AuthService);
  private router = inject(Router);

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status.set('error');
      this.message.set('Invalid verification link');
      return;
    }

    try {
      const response = await this.session.verifyEmail(token);
      this.status.set('success');
      this.message.set(response.message || 'Email verified successfully!');

      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
    } catch (error: unknown) {
      this.status.set('error');
      this.message.set(error instanceof Error ? error.message : 'Failed to verify email');
    }
  }

  async resendVerification(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) return;

    this.status.set('loading');
    this.message.set('Sending new verification link...');

    try {
      const response = await this.session.resendVerification({ token });
      this.status.set('error'); // Keep error state to show message
      this.message.set(response.message);
    } catch (error: unknown) {
      this.message.set(
        error instanceof Error ? error.message : 'Failed to resend verification link',
      );
    }
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
