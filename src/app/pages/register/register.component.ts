import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { form, Field, required, email as emailValidator, minLength } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { registerActions, oauthActions } from '../../store/auth/auth.actions';
import { selectIsLoading, selectError } from '../../store/auth/auth.selectors';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, Field],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private store = inject(Store);

  // Signal for showing success message
  registrationSuccess = signal(false);
  registeredEmail = signal('');

  // Signal Forms (experimental API)
  registerModel = signal({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  registerForm = form(this.registerModel, (schema) => {
    required(schema.name, { message: 'Name is required' });
    minLength(schema.name, 2, { message: 'Name must be at least 2 characters' });
    required(schema.email, { message: 'Email is required' });
    emailValidator(schema.email, { message: 'Enter a valid email address' });
    required(schema.password, { message: 'Password is required' });
    minLength(schema.password, 8, { message: 'Password must be at least 8 characters' });
    required(schema.confirmPassword, { message: 'Confirm your password' });
    // Кастомная валидация совпадения паролей реализуется через computed и errors в шаблоне
  });

  // computed-сигнал для ошибки совпадения паролей
  passwordMismatch = computed(() => {
    const model = this.registerModel();
    return !!model.password && !!model.confirmPassword && model.password !== model.confirmPassword;
  });

  showPassword = signal(false);
  showConfirmPassword = signal(false);

  togglePasswordVisibility() {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update((v) => !v);
  }

  // Selectors as signals
  isLoading = this.store.selectSignal(selectIsLoading);
  error = this.store.selectSignal(selectError);

  onSubmit(event: Event): void {
    event.preventDefault();
    if (
      this.registerForm.name().valid() &&
      this.registerForm.email().valid() &&
      this.registerForm.password().valid() &&
      this.registerForm.confirmPassword().valid()
    ) {
      const name = this.registerForm.name().value();
      const email = this.registerForm.email().value();
      const password = this.registerForm.password().value();
      this.registeredEmail.set(email);
      this.store.dispatch(registerActions.register({ name, email, password }));
      setTimeout(() => {
        this.registrationSuccess.set(true);
      }, 500);
    }
  }

  registerWithGithub(): void {
    this.store.dispatch(oauthActions.githubLogin());
  }

  registerWithGoogle(): void {
    this.store.dispatch(oauthActions.googleLogin());
  }
}
