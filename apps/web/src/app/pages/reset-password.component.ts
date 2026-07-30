import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
  <app-auth-layout title="Set a new password" subtitle="Choose a strong password you haven't used before.">
    <form class="auth-form" (ngSubmit)="submit()" *ngIf="!done">
      <div class="field">
        <label>New Password</label>
        <div class="input-icon-wrap">
          <ui-icon name="lock" [size]="16"></ui-icon>
          <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="password" name="password" placeholder="Enter new password" required>
          <button type="button" class="toggle-visibility" (click)="showPassword = !showPassword">
            <ui-icon [name]="showPassword ? 'eye-off' : 'eye'" [size]="16"></ui-icon>
          </button>
        </div>
      </div>

      <div class="field">
        <label>Confirm Password</label>
        <div class="input-icon-wrap">
          <ui-icon name="lock" [size]="16"></ui-icon>
          <input [type]="showConfirm ? 'text' : 'password'" [(ngModel)]="confirmPassword" name="confirmPassword" placeholder="Re-enter new password" required>
          <button type="button" class="toggle-visibility" (click)="showConfirm = !showConfirm">
            <ui-icon [name]="showConfirm ? 'eye-off' : 'eye'" [size]="16"></ui-icon>
          </button>
        </div>
      </div>

      <div class="requirements">
        <div class="req" [class.met]="password.length >= 8"><ui-icon [name]="password.length >= 8 ? 'check-circle' : 'x'" [size]="14"></ui-icon> At least 8 characters</div>
        <div class="req" [class.met]="hasNumber"><ui-icon [name]="hasNumber ? 'check-circle' : 'x'" [size]="14"></ui-icon> Contains a number</div>
        <div class="req" [class.met]="passwordsMatch"><ui-icon [name]="passwordsMatch ? 'check-circle' : 'x'" [size]="14"></ui-icon> Passwords match</div>
      </div>

      <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="!canSubmit">Reset Password</button>
    </form>

    <div class="done-state animate-scale" *ngIf="done">
      <div class="done-icon"><ui-icon name="check" [size]="26" [strokeWidth]="2.6" color="#fff"></ui-icon></div>
      <strong>Password updated</strong>
      <p>Your password has been reset successfully. You can now sign in with your new password.</p>
      <button class="btn btn-primary btn-block btn-lg" routerLink="/login">Back to Sign In</button>
    </div>
  </app-auth-layout>
  `,
  styles: [`
    .auth-form { display: flex; flex-direction: column; gap: 18px; }
    .requirements { display: flex; flex-direction: column; gap: 8px; margin-top: -4px; }
    .req { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--color-muted); }
    .req.met { color: var(--color-success); }
    .req ui-icon { color: var(--color-muted-2); }
    .req.met ui-icon { color: var(--color-success); }

    .done-state { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .done-icon { width: 54px; height: 54px; border-radius: 50%; background: var(--color-success); display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
    .done-state strong { font-size: 17px; }
    .done-state p { font-size: 13px; color: var(--color-muted); line-height: 1.6; margin-bottom: 12px; }
    .done-state .btn { width: 100%; }
  `]
})
export class ResetPasswordComponent {
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirm = false;
  done = false;

  constructor(private router: Router) {}

  get hasNumber() {
    return /\d/.test(this.password);
  }

  get passwordsMatch() {
    return !!this.password && this.password === this.confirmPassword;
  }

  get canSubmit() {
    return this.password.length >= 8 && this.hasNumber && this.passwordsMatch;
  }

  submit() {
    if (this.canSubmit) {
      this.done = true;
    }
  }
}
