import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage, AuthService } from '../../../core/auth/auth.service';
import { AuthLayout } from '../../../shared/auth-layout/auth-layout';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    const { email, password } = this.form.getRawValue();
    this.auth
      .login(email, password, 'BUYER')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ user }) =>
          this.success.set(`Welcome back, ${user.name}. You are signed in.`),
        error: (error) => this.error.set(apiErrorMessage(error)),
      });
  }
}
