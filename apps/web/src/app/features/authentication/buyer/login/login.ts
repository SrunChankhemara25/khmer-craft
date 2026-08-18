import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { UserRole } from '../../../../core/auth/auth.models';
import { apiErrorMessage, AuthService } from '../../../../core/auth/auth.service';
import { AuthLayout } from '../../../../components/shared/authentication/auth-layout/auth-layout';
import { IconComponent } from '../../../../components/shared/ui/icon/icon.component';

type LoginRole = UserRole;

const ROLE_CONTENT: Record<
  LoginRole,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    button: string;
    busy: string;
    fallbackError: string;
  }
> = {
  BUYER: {
    eyebrow: 'Buyer account',
    title: 'Welcome back',
    subtitle: 'Sign in to continue discovering authentic Cambodian craft.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    button: 'Sign in',
    busy: 'Signing in...',
    fallbackError: 'Buyer credentials are incorrect.',
  },
  SELLER: {
    eyebrow: 'Seller portal',
    title: 'Sign in to your store',
    subtitle: 'Manage incoming orders, accept them, and track what you have shipped.',
    emailLabel: 'Seller email',
    emailPlaceholder: 'you@yourstore.com',
    button: 'Sign in to seller portal',
    busy: 'Signing in...',
    fallbackError: 'Seller credentials are incorrect.',
  },
  ADMIN: {
    eyebrow: 'Restricted access',
    title: 'Admin sign in',
    subtitle: 'Use your authorized KhmerCraft administrator credentials.',
    emailLabel: 'Admin email',
    emailPlaceholder: 'admin@khmercraft.com',
    button: 'Access admin portal',
    busy: 'Verifying...',
    fallbackError: 'Administrator credentials are incorrect.',
  },
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, IconComponent],
  templateUrl: './login.html',
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
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly content = computed(() => ROLE_CONTENT['BUYER']);
  protected readonly passwordVisible = signal(false);
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

  constructor() {}

  protected togglePassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  /**
   * Send the user where they were heading.
   *
   * Guards attach ?returnUrl when they bounce someone to sign in, so a visitor
   * who clicked Checkout lands back on checkout rather than being stranded on
   * the login page with a success message — which is what used to happen.
   */
  private goToDestination(role: LoginRole) {
    const returnUrl = this.route.snapshot?.queryParamMap.get('returnUrl');
    if (returnUrl?.startsWith('/')) {
      void this.router.navigateByUrl(returnUrl);
      return;
    }

    void this.router.navigateByUrl('/');
  }

  protected submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    const role = 'BUYER' as LoginRole;
    const content = this.content();
    const { email, password } = this.form.getRawValue();
    this.auth
      .login(email, password, role)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ user }) => {
          this.success.set(this.successMessage(user.name));
          this.goToDestination(role);
        },
        error: (error) => this.error.set(apiErrorMessage(error, content.fallbackError)),
      });
  }
  private successMessage(name: string): string {
    return `Welcome back, ${name}.`;
  }
}
