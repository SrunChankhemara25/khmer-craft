import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
  <app-auth-layout title="Welcome back" subtitle="Sign in to continue supporting Cambodian artisans.">
    <form class="auth-form" (ngSubmit)="submit()">
      <div class="field">
        <label>Email Address</label>
        <input type="email" [(ngModel)]="email" name="email" placeholder="email@example.com" required>
      </div>

      <div class="field">
        <div class="label-row">
          <label>Password</label>
          <a routerLink="/forgot-password" class="link-sm">Forgot password?</a>
        </div>
        <div class="input-icon-wrap no-left-icon">
          <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="password" name="password" placeholder="Enter your password" required>
          <button type="button" class="toggle-visibility" (click)="showPassword = !showPassword">
            <ui-icon [name]="showPassword ? 'eye-off' : 'eye'" [size]="16"></ui-icon>
          </button>
        </div>
      </div>

      <label class="remember-row">
        <input type="checkbox" [(ngModel)]="remember" name="remember">
        Keep me signed in
      </label>

      <button type="submit" class="btn btn-accent btn-block btn-lg">Sign In</button>

      <div class="divider"><span>or sign in with</span></div>

      <div class="social-row">
        <button type="button" class="btn btn-outline btn-block social-btn">
          <ui-icon name="google" [size]="16"></ui-icon> Google
        </button>
        <button type="button" class="btn btn-outline btn-block social-btn">
          <ui-icon name="facebook-color" [size]="16"></ui-icon> Facebook
        </button>
      </div>
    </form>

    <p class="switch-line">Don't have an account? <a routerLink="/signup">Create one</a></p>
  </app-auth-layout>
  `,
  styles: [`
    .auth-form { display: flex; flex-direction: column; gap: 20px; }
    .label-row { display: flex; justify-content: space-between; align-items: center; }
    .link-sm { font-size: 12.5px; color: var(--color-accent); font-weight: 600; }
    .input-icon-wrap.no-left-icon input { padding-left: 14px; }
    .remember-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-secondary); margin-top: -8px; }

    .divider { display: flex; align-items: center; gap: 14px; margin: -4px 0; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--color-border); }
    .divider span { font-size: 12px; color: var(--color-muted); white-space: nowrap; }

    .social-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .social-btn { gap: 9px; }

    .switch-line { text-align: center; font-size: 13.5px; color: var(--color-muted); margin-top: 26px; }
    .switch-line a { color: var(--color-accent); font-weight: 600; }

    @media (max-width: 560px) {
      .social-row { grid-template-columns: 1fr; }
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  remember = true;
  showPassword = false;

  constructor(private router: Router) {}

  submit() {
    this.router.navigate(['/']);
  }
}
