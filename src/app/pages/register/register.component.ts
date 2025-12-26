import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Store } from '@ngrx/store';
import { RouterLink } from '@angular/router';
import { registerActions, oauthActions } from '../../store/auth/auth.actions';
import { selectIsLoading, selectError } from '../../store/auth/auth.selectors';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private store = inject(Store);

  // Signal for showing success message
  registrationSuccess = signal(false);
  registeredEmail = signal('');

  // Signal Forms with custom validator
  registerForm = new FormGroup(
    {
      name: new FormControl('', {
        validators: [Validators.required, Validators.minLength(2)],
        nonNullable: true,
      }),
      email: new FormControl('', {
        validators: [Validators.required, Validators.email],
        nonNullable: true,
      }),
      password: new FormControl('', {
        validators: [Validators.required, Validators.minLength(8)],
        nonNullable: true,
      }),
      confirmPassword: new FormControl('', {
        validators: [Validators.required],
        nonNullable: true,
      }),
    },
    { validators: [this.passwordMatchValidator] }
  );

  // Form controls
  nameControl = this.registerForm.controls.name;
  emailControl = this.registerForm.controls.email;
  passwordControl = this.registerForm.controls.password;
  confirmPasswordControl = this.registerForm.controls.confirmPassword;

  // Selectors as signals
  isLoading = this.store.selectSignal(selectIsLoading);
  error = this.store.selectSignal(selectError);

  passwordMatchValidator(control: AbstractControl): { passwordMismatch: boolean } | null {
    const group = control as FormGroup;
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      const { name, email, password } = this.registerForm.getRawValue();
      this.registeredEmail.set(email);
      this.store.dispatch(registerActions.register({ name, email, password }));
      
      // Show success message (we won't get auto-login anymore)
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
