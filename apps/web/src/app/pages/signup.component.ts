import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
  <app-auth-layout title="Create your account" subtitle="Join KhmerCraft to shop Cambodian handmade and local products.">
    <form class="auth-form" (ngSubmit)="submit()">
      <div class="field">
        <label>Full Name</label>
        <input type="text" [(ngModel)]="fullName" name="fullName" placeholder="Enter your full name" required>
      </div>

      <div class="field-row">
        <div class="field">
          <label>Email</label>
          <input type="email" [(ngModel)]="email" name="email" placeholder="email@example.com" required>
        </div>
        <div class="field">
          <label>Phone</label>
          <input type="text" [(ngModel)]="phone" name="phone" placeholder="+855 00 000 000">
        </div>
      </div>

      <div class="field">
        <label>Password</label>
        <div class="input-icon-wrap no-left-icon">
          <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="password" name="password" placeholder="Create a strong password" required>
          <button type="button" class="toggle-visibility" (click)="showPassword = !showPassword">
            <ui-icon [name]="showPassword ? 'eye-off' : 'eye'" [size]="16"></ui-icon>
          </button>
        </div>
      </div>

      <div class="field">
        <label>Confirm Password</label>
        <div class="input-icon-wrap no-left-icon">
          <input [type]="showConfirm ? 'text' : 'password'" [(ngModel)]="confirmPassword" name="confirmPassword" placeholder="Repeat your password" required>
          <button type="button" class="toggle-visibility" (click)="showConfirm = !showConfirm">
            <ui-icon [name]="showConfirm ? 'eye-off' : 'eye'" [size]="16"></ui-icon>
          </button>
        </div>
      </div>

      <div class="requirements-box">
        <strong>Security Requirements:</strong>
        <div class="req" [class.met]="password.length >= 8"><ui-icon name="check-circle" [size]="14"></ui-icon> At least 8 characters long</div>
        <div class="req" [class.met]="hasNumber"><ui-icon name="check-circle" [size]="14"></ui-icon> Contains at least one number</div>
        <div class="req" [class.met]="passwordsMatch"><ui-icon name="check-circle" [size]="14"></ui-icon> Passwords match exactly</div>
      </div>

      <label class="agree-row">
        <input type="checkbox" [(ngModel)]="agree" name="agree" required>
        I agree to the <a href="javascript:void(0)">Terms of Service</a> and <a href="javascript:void(0)">Privacy Policy</a>.
      </label>

      <button type="submit" class="btn btn-accent btn-block btn-lg" [disabled]="!canSubmit">Create Account</button>

      <div class="divider"><span>or sign up with</span></div>

      <div class="social-row">
        <button type="button" class="btn btn-outline btn-block social-btn">
          <ui-icon name="google" [size]="16"></ui-icon> Google
        </button>
        <button type="button" class="btn btn-outline btn-block social-btn">
          <ui-icon name="facebook-color" [size]="16"></ui-icon> Facebook
        </button>
      </div>
    </form>

    <p class="switch-line">Already have an account? <a routerLink="/login">Sign In</a></p>
  </app-auth-layout>
  `,
  styles: [`
    .auth-form { display: flex; flex-direction: column; gap: 20px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .input-icon-wrap.no-left-icon input { padding-left: 14px; }

    .requirements-box {
      background: var(--color-accent-soft);
      border-radius: var(--radius-sm);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .requirements-box strong { font-size: 12px; color: var(--color-text); }
    .req { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--color-muted); }
    .req ui-icon { color: var(--color-muted-2); }
    .req.met { color: var(--color-accent); }
    .req.met ui-icon { color: var(--color-accent); }

    .agree-row { display: flex; align-items: flex-start; gap: 9px; font-size: 13px; color: var(--color-text-secondary); line-height: 1.5; }
    .agree-row input { margin-top: 2px; }
    .agree-row a { color: var(--color-accent); font-weight: 600; }

    .divider { display: flex; align-items: center; gap: 14px; margin: -4px 0; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--color-border); }
    .divider span { font-size: 12px; color: var(--color-muted); white-space: nowrap; }

    .social-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .social-btn { gap: 9px; }

    .switch-line { text-align: center; font-size: 13.5px; color: var(--color-muted); margin-top: 26px; }
    .switch-line a { color: var(--color-accent); font-weight: 600; }

    @media (max-width: 560px) {
      .field-row, .social-row { grid-template-columns: 1fr; }
    }
  `]
})
export class SignupComponent {
  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  agree = false;
  showPassword = false;
  showConfirm = false;

  constructor(private router: Router) {}

  get hasNumber() {
    return /\d/.test(this.password);
  }

  get passwordsMatch() {
    return !!this.password && this.password === this.confirmPassword;
  }

  get canSubmit() {
    return this.password.length >= 8 && this.hasNumber && this.passwordsMatch && this.agree;
  }

  submit() {
    if (this.canSubmit) {
      this.router.navigate(['/verify-code']);
    }
  }
}
