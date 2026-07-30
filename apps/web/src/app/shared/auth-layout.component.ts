import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './navbar.component';
import { FooterComponent } from './footer.component';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent],
  template: `
  <app-navbar active="" [cartCount]="0"></app-navbar>

  <div class="auth-page">
    <div class="auth-card animate-in">
      <div class="auth-head">
        <h1>{{ title }}</h1>
        <p *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <ng-content></ng-content>
    </div>
  </div>

  <app-footer></app-footer>
  `,
  styles: [`
    .auth-page {
      background: var(--color-bg-alt);
      min-height: calc(100vh - var(--header-h) - 260px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 56px 20px;
    }
    .auth-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      max-width: 620px;
      width: 100%;
      padding: 40px;
    }
    .auth-head { margin-bottom: 28px; }
    .auth-head h1 { font-size: 24px; margin-bottom: 8px; }
    .auth-head p { font-size: 13.5px; color: var(--color-muted); line-height: 1.55; }

    @media (max-width: 700px) {
      .auth-page { padding: 32px 16px; }
      .auth-card { padding: 26px; }
    }
  `]
})
export class AuthLayoutComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
}
