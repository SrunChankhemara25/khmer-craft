import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
  <app-auth-layout title="Forgot your password?" subtitle="No worries — enter your email and we'll send you a reset code.">
    <form class="auth-form" (ngSubmit)="submit()" *ngIf="!sent">
      <div class="field">
        <label>Email Address</label>
        <div class="input-icon-wrap">
          <ui-icon name="mail" [size]="16"></ui-icon>
          <input type="email" [(ngModel)]="email" name="email" placeholder="you@example.com" required>
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-block btn-lg">Send Reset Code <ui-icon name="arrow-right" [size]="16" color="#fff"></ui-icon></button>
    </form>

    <div class="sent-state animate-scale" *ngIf="sent">
      <div class="sent-icon"><ui-icon name="mail" [size]="24" color="var(--color-accent)"></ui-icon></div>
      <strong>Check your inbox</strong>
      <p>We've sent a 6-digit verification code to <b>{{ email }}</b>. It may take a minute to arrive.</p>
      <button class="btn btn-primary btn-block" (click)="goVerify()">Enter Code</button>
      <button class="btn btn-ghost btn-block" (click)="sent = false">Use a different email</button>
    </div>

    <p class="switch-line"><a routerLink="/login"><ui-icon name="arrow-left" [size]="13"></ui-icon> Back to sign in</a></p>
  </app-auth-layout>
  `,
  styles: [`
    .auth-form { display: flex; flex-direction: column; gap: 18px; }
    .sent-state { text-align: center; display: flex; flex-direction: column; gap: 12px; align-items: center; }
    .sent-icon { width: 54px; height: 54px; border-radius: 50%; background: var(--color-accent-soft); display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
    .sent-state strong { font-size: 16px; }
    .sent-state p { font-size: 13px; color: var(--color-muted); line-height: 1.6; margin-bottom: 10px; }
    .sent-state .btn { width: 100%; }
    .switch-line { text-align: center; font-size: 13.5px; color: var(--color-muted); margin-top: 26px; }
    .switch-line a { color: var(--color-accent); font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
  `]
})
export class ForgotPasswordComponent {
  email = '';
  sent = false;

  constructor(private router: Router) {}

  submit() {
    this.sent = true;
  }

  goVerify() {
    this.router.navigate(['/verify-code']);
  }
}
