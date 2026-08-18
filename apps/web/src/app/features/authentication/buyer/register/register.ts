import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage, AuthService } from '../../../../core/auth/auth.service';
import { AuthLayout } from '../../../../components/shared/authentication/auth-layout/auth-layout';
import { IconComponent } from '../../../../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, IconComponent],
  templateUrl: './register.html',
  styles: [
    `
    .required { color: var(--color-danger, #b92a2a); margin-left: 6px; }
    .input-icon-wrap { display: block; position: relative; width: 100%; }
    .input-icon-wrap ui-icon { color: var(--color-muted); position: absolute; left: 16px; top: 50%; transform: translateY(-50%); pointer-events: none; z-index: 2; width: 20px; height: 20px; display: inline-grid; place-items: center; line-height: 0; }
    .input-icon-wrap ui-icon svg { display: block; width: 18px; height: 18px; }
    .input-icon-wrap input { padding-left: 40px !important; box-sizing: border-box; display: block; width: 100%; }
    .password-field input { padding-right: 48px; }
    `,
  ],
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly passwordVisible = signal(false);
  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl('', { nonNullable: true }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
      ],
    }),
  });

  protected togglePassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    const value = this.form.getRawValue();
    this.auth
      .register({
        name: value.name,
        email: value.email,
        password: value.password,
        ...(value.phone ? { phone: value.phone } : {}),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ user }) => {
          this.success.set(`Welcome to KhmerCraft, ${user.name}.`);
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          void this.router.navigateByUrl(
            returnUrl && returnUrl.startsWith('/') ? returnUrl : '/',
          );
        },
        error: (error) => this.error.set(apiErrorMessage(error)),
      });
  }
}
