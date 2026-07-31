import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage, AuthService } from '../../../core/auth/auth.service';
import { AuthLayout } from '../../../shared/auth-layout/auth-layout';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly sent = signal(false);
  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth
      .forgotPassword(this.form.getRawValue().email)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.sent.set(true),
        error: (error) => this.error.set(apiErrorMessage(error)),
      });
  }
}
