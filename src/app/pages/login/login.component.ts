import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { form, FormField, required, email as emailValidator } from '@angular/forms/signals';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { AuthOauthService } from '../../services/auth-oauth.service';
import { AuthQueryService } from '../../services/auth-query.service';

@Component({
  selector: 'app-login',
  imports: [ButtonComponent, ReactiveFormsModule, RouterLink, FormField],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private authQueryService = inject(AuthQueryService);
  private authOauthService = inject(AuthOauthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  resendMessage = signal<string | null>(null);
  currentUserQuery = injectQuery(() => this.authQueryService.currentUserQueryOptions());
  isAuthChecking = () => this.currentUserQuery.isPending();

  // Signal Forms (experimental API)
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

  // Mutations
  loginMutation = this.authQueryService.loginMutation();
  resendMutation = this.authQueryService.resendVerificationMutation();

  showPassword = signal(false);

  togglePasswordVisibility = () => {
    this.showPassword.update((v) => !v);
  };
  toggleRememberMe = () => {
    this.loginModel.update((m) => ({ ...m, rememberMe: !m.rememberMe }));
  };
  onSubmit = (event: Event): void => {
    event.preventDefault();
    if (this.loginForm.email().valid() && this.loginForm.password().valid()) {
      const email = this.loginForm.email().value();
      const password = this.loginForm.password().value();
      const rememberMe = this.loginModel().rememberMe;
      this.resendMessage.set(null);

      this.loginMutation.mutate(
        { email, password, rememberMe },
        {
          onSuccess: async () => {
            await this.authQueryService.refetchUser();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
            this.router.navigate([returnUrl]);
          },
        },
      );
    }
  };

  resendVerification = (): void => {
    const email = this.loginForm.email().value();
    if (!email) return;

    this.resendMutation.mutate(
      { email },
      {
        onSuccess: (response) => {
          this.resendMessage.set(response.message);
        },
        onError: (err: any) => {
          this.resendMessage.set(err.message || 'Failed to resend verification email');
        },
      },
    );
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
