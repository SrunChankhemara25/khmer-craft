import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage, AuthService } from '../../../../core/auth/auth.service';
import { AuthLayout } from '../../../../components/shared/authentication/auth-layout/auth-layout';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout],
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly complete = signal(false);
  protected readonly form = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
      ],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected submit() {
    const value = this.form.getRawValue();
    if (
      this.form.invalid ||
      value.password !== value.confirmPassword ||
      !this.token
    ) {
      this.form.markAllAsTouched();
      if (value.password !== value.confirmPassword) {
        this.error.set('Passwords do not match.');
      }
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.auth
      .resetPassword(this.token, value.password, value.confirmPassword)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.complete.set(true),
        error: (error) => this.error.set(apiErrorMessage(error)),
      });
  }
}
