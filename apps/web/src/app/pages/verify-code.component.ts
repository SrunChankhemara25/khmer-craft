import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-verify-code',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
  <app-auth-layout title="Enter verification code" subtitle="We sent a 6-digit code to your email. It expires in 10 minutes.">
    <form class="auth-form" (ngSubmit)="submit()">
      <div class="otp-row">
        <input
          #otpInput
          *ngFor="let d of digits; let i = index"
          type="text"
          inputmode="numeric"
          maxlength="1"
          class="otp-box"
          [(ngModel)]="digits[i]"
          [name]="'digit' + i"
          (input)="onInput($event, i)"
          (keydown)="onKeydown($event, i)"
        >
      </div>

      <div class="resend-row">
        <span *ngIf="countdown > 0">Resend code in <strong>{{ countdown }}s</strong></span>
        <a href="javascript:void(0)" *ngIf="countdown === 0" (click)="resend()">Resend code</a>
      </div>

      <button type="submit" class="btn btn-primary btn-block btn-lg">Verify &amp; Continue <ui-icon name="arrow-right" [size]="16" color="#fff"></ui-icon></button>
    </form>

    <p class="switch-line"><a routerLink="/login"><ui-icon name="arrow-left" [size]="13"></ui-icon> Back to sign in</a></p>
  </app-auth-layout>
  `,
  styles: [`
    .auth-form { display: flex; flex-direction: column; gap: 22px; }
    .otp-row { display: flex; gap: 10px; justify-content: space-between; }
    .otp-box {
      width: 48px; height: 56px; text-align: center; font-size: 22px; font-weight: 700;
      border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); background: var(--color-surface);
    }
    .otp-box:focus { border-color: var(--color-accent); box-shadow: var(--shadow-focus); }
    .resend-row { text-align: center; font-size: 13px; color: var(--color-muted); }
    .resend-row a { color: var(--color-accent); font-weight: 600; }
    .switch-line { text-align: center; font-size: 13.5px; color: var(--color-muted); margin-top: 26px; }
    .switch-line a { color: var(--color-accent); font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
  `]
})
export class VerifyCodeComponent {
  digits: string[] = ['', '', '', '', '', ''];
  countdown = 30;

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(private router: Router) {
    this.tick();
  }

  tick() {
    const interval = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        clearInterval(interval);
      }
    }, 1000);
  }

  onInput(event: Event, index: number) {
    const value = (event.target as HTMLInputElement).value;
    this.digits[index] = value.replace(/[^0-9]/g, '').slice(-1);
    if (this.digits[index] && index < this.digits.length - 1) {
      this.otpInputs.get(index + 1)?.nativeElement.focus();
    }
  }

  onKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      this.otpInputs.get(index - 1)?.nativeElement.focus();
    }
  }

  resend() {
    this.countdown = 30;
    this.tick();
  }

  submit() {
    this.router.navigate(['/reset-password']);
  }
}
