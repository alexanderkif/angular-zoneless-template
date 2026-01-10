import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { form, Field, required, email as emailValidator } from '@angular/forms/signals';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthService } from '../../services/auth.service';
import { loginActions, oauthActions } from '../../store/auth/auth.actions';
import { selectIsLoading, selectError } from '../../store/auth/auth.selectors';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Field],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  resendMessage = signal<string | null>(null);

  // Signal Forms (experimental API)
  loginModel = signal({
    email: '',
    password: '',
  });
  loginForm = form(this.loginModel, (schema) => {
    required(schema.email, { message: 'Email is required' });
    emailValidator(schema.email, { message: 'Enter a valid email address' });
    required(schema.password, { message: 'Password is required' });
  });

  // Selectors as signals
  isLoading = this.store.selectSignal(selectIsLoading);
  error = this.store.selectSignal(selectError);

  showPassword = signal(false);

  togglePasswordVisibility() {
    this.showPassword.update((v) => !v);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.loginForm.email().valid() && this.loginForm.password().valid()) {
      const email = this.loginForm.email().value();
      const password = this.loginForm.password().value();
      const returnUrl = this.route.snapshot.queryParams['returnUrl'];
      this.store.dispatch(loginActions.login({ email, password, returnUrl }));
      this.resendMessage.set(null); // Clear previous messages
    }
  }

  resendVerification(): void {
    const email = this.loginForm.email().value();
    if (!email) return;

    this.authService.resendVerification(email).subscribe({
      next: (response) => {
        this.resendMessage.set(response.message);
      },
      error: (err) => {
        this.resendMessage.set(err.message || 'Failed to resend verification email');
      },
    });
  }

  loginWithGithub(): void {
    this.store.dispatch(oauthActions.githubLogin());
  }

  loginWithGoogle(): void {
    this.store.dispatch(oauthActions.googleLogin());
  }
}
