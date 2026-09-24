import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, required, email as emailValidator } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { SessionService } from '../../core/auth/session.service';
import { AuthOauthService } from '../../services/auth-oauth.service';

@Component({
  selector: 'app-login',
  imports: [ButtonComponent, RouterLink, FormField],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  readonly session = inject(SessionService);
  private authOauthService = inject(AuthOauthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  resendMessage = signal<string | null>(null);
  isAuthChecking = () => this.session.currentUser.isLoading();

  // Signal Forms
  loginModel = signal({
    email: '',
    password: '',
    rememberMe: true, // Default: true for better UX (can be changed)
  });
  loginForm = form(this.loginModel, (schema) => {
    required(schema.email, { message: 'Email is required' });
    emailValidator(schema.email, { message: 'Enter a valid email address' });
    required(schema.password, { message: 'Password is required' });
  });

  showPassword = signal(false);

  togglePasswordVisibility = () => {
    this.showPassword.update((v) => !v);
  };

  toggleRememberMe = () => {
    this.loginModel.update((m) => ({ ...m, rememberMe: !m.rememberMe }));
  };

  onSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();
    if (this.loginForm.email().valid() && this.loginForm.password().valid()) {
      const email = this.loginForm.email().value();
      const password = this.loginForm.password().value();
      const rememberMe = this.loginModel().rememberMe;
      this.resendMessage.set(null);

      try {
        await this.session.login({ email, password, rememberMe });
        await new Promise((resolve) => setTimeout(resolve, 100));

        const raw = this.route.snapshot.queryParams['returnUrl'];
        const returnUrl = typeof raw === 'string' && raw.startsWith('/') ? raw : '/';
        this.router.navigate([returnUrl]);
      } catch {
        // Ошибка доступна через session.loginState.error()
      }
    }
  };

  resendVerification = async (): Promise<void> => {
    const email = this.loginForm.email().value();
    if (!email) return;

    try {
      const response = await this.session.resendVerification({ email });
      this.resendMessage.set(response.message);
    } catch (error: unknown) {
      this.resendMessage.set(
        error instanceof Error ? error.message : 'Failed to resend verification email',
      );
    }
  };

  loginWithGithub = (): void => {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    this.authOauthService.loginWithGithub(returnUrl);
  };

  loginWithGoogle = (): void => {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    this.authOauthService.loginWithGoogle(returnUrl);
  };
}
