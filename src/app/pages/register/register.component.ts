import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import {
  form,
  FormField,
  required,
  email as emailValidator,
  minLength,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { LinkButtonComponent } from '../../components/ui/link-button/link-button.component';
import { AuthQueryService } from '../../services/auth-query.service';
import { API_BASE_URL } from '../../tokens/api-url.token';
import { WINDOW } from '../../tokens/window.token';

@Component({
  selector: 'app-register',
  imports: [ButtonComponent, LinkButtonComponent, ReactiveFormsModule, RouterLink, FormField],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private authQueryService = inject(AuthQueryService);
  private platformId = inject(PLATFORM_ID);
  private window = inject(WINDOW);
  private apiUrl = inject(API_BASE_URL);

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
  });

  // computed-сигнал для ошибки совпадения паролей
  passwordMismatch = computed(() => {
    const model = this.registerModel();
    return !!model.password && !!model.confirmPassword && model.password !== model.confirmPassword;
  });

  showPassword = signal(false);
  showConfirmPassword = signal(false);

  togglePasswordVisibility = () => {
    this.showPassword.update((v) => !v);
  };

  toggleConfirmPasswordVisibility = () => {
    this.showConfirmPassword.update((v) => !v);
  };

  // Mutations
  registerMutation = this.authQueryService.registerMutation();

  onSubmit = (event: Event): void => {
    event.preventDefault();
    if (
      this.registerForm.name().valid() &&
      this.registerForm.email().valid() &&
      this.registerForm.password().valid() &&
      this.registerForm.confirmPassword().valid() &&
      !this.passwordMismatch()
    ) {
      const name = this.registerForm.name().value();
      const email = this.registerForm.email().value();
      const password = this.registerForm.password().value();

      this.registeredEmail.set(email);
      this.registerMutation.mutate(
        { name, email, password },
        {
          onSuccess: () => {
            this.registrationSuccess.set(true);
          },
        },
      );
    }
  };

  registerWithGithub = (): void => {
    if (isPlatformBrowser(this.platformId)) {
      this.window.location.href = `${this.apiUrl}/auth/github`;
    }
  };

  registerWithGoogle = (): void => {
    if (isPlatformBrowser(this.platformId)) {
      this.window.location.href = `${this.apiUrl}/auth/google`;
    }
  };
}
