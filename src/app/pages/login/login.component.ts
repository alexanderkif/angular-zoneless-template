import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { loginActions, oauthActions } from '../../store/auth/auth.actions';
import { selectIsLoading, selectError } from '../../store/auth/auth.selectors';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  resendMessage = signal<string | null>(null);

  // TODO Signal Forms
  loginForm = new FormGroup({
    email: new FormControl('', {
      validators: [Validators.required, Validators.email],
      nonNullable: true,
    }),
    password: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  // Form controls для удобства
  emailControl = this.loginForm.controls.email;
  passwordControl = this.loginForm.controls.password;

  // Selectors as signals
  isLoading = this.store.selectSignal(selectIsLoading);
  error = this.store.selectSignal(selectError);

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.getRawValue();
      const returnUrl = this.route.snapshot.queryParams['returnUrl'];
      this.store.dispatch(loginActions.login({ email, password, returnUrl }));
      this.resendMessage.set(null); // Clear previous messages
    }
  }

  resendVerification(): void {
    const email = this.loginForm.controls.email.value;
    if (!email) return;

    this.authService.resendVerification(email).subscribe({
      next: (response) => {
        this.resendMessage.set(response.message);
      },
      error: (err) => {
        this.resendMessage.set(err.message || 'Failed to resend verification email');
      }
    });
  }

  loginWithGithub(): void {
    this.store.dispatch(oauthActions.githubLogin());
  }

  loginWithGoogle(): void {
    this.store.dispatch(oauthActions.googleLogin());
  }
}
