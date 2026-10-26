import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { navLinks } from '../../data/site-data';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header style="position:sticky;top:0;z-index:50;background:#fafbf8;border-bottom:1px solid #dfe5dd;">
      <div class="container-max" style="display:flex;align-items:center;justify-content:space-between;padding:15px 1.5rem;">
        <!-- Logo -->
        <a routerLink="/" style="text-decoration:none;">
          <span style="font-size:19px;font-weight:800;color:#176242;letter-spacing:-0.02em;">KhmerCraft</span>
        </a>

        <!-- Nav links (desktop) -->
        <nav style="display:flex;align-items:center;gap:34px;" class="hidden-mobile">
          @for (link of navLinks; track link.label) {
            <a
              [routerLink]="link.path"
              routerLinkActive="nav-active"
              [routerLinkActiveOptions]="{ exact: link.path === '/seller' }"
              style="font-size:12px;font-weight:600;color:#59625e;text-decoration:none;transition:color 0.12s;"
              onmouseover="this.style.color='#1b4332'"
              onmouseout="if(!this.classList.contains('nav-active')){this.style.color='#374151'}"
            >
              {{ link.label }}
            </a>
          }
        </nav>

        <!-- Actions (desktop) -->
        <div style="display:flex;align-items:center;gap:24px;" class="hidden-mobile">
          <a href="#" style="font-size:12px;font-weight:800;color:#176242;text-decoration:none;transition:color 0.12s;"
            onmouseover="this.style.color='#1b4332'" onmouseout="this.style.color='#374151'">
            Seller Sign In
          </a>
          <a
            routerLink="/seller"
            style="background:#176242;color:white;border:none;border-radius:7px;padding:10px 24px;font-size:12px;font-weight:800;cursor:pointer;text-decoration:none;transition:background 0.15s;display:inline-block;"
            onmouseover="this.style.background='#2d6a4f'"
            onmouseout="this.style.background='#1b4332'"
          >
            Start Selling
          </a>
        </div>

        <!-- Mobile hamburger -->
        <button
          type="button"
          style="display:none;padding:6px;color:#1b4332;background:none;border:none;cursor:pointer;"
          class="show-mobile"
          (click)="menuOpen.set(!menuOpen())"
          [attr.aria-expanded]="menuOpen()"
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            @if (menuOpen()) {
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            } @else {
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            }
          </svg>
        </button>
      </div>

      <!-- Mobile menu -->
      @if (menuOpen()) {
        <div style="border-top:1px solid #e5e7e3;background:#fafaf8;padding:16px 1.5rem;display:flex;flex-direction:column;gap:12px;">
          @for (link of navLinks; track link.label) {
            <a
              [routerLink]="link.path"
              (click)="menuOpen.set(false)"
              style="font-size:14px;color:#374151;text-decoration:none;padding:4px 0;"
            >
              {{ link.label }}
            </a>
          }
          <div style="padding-top:8px;display:flex;flex-direction:column;gap:8px;">
            <a href="#" style="font-size:14px;color:#374151;text-decoration:none;">Seller Sign In</a>
            <a routerLink="/seller"
              style="background:#1b4332;color:white;border-radius:7px;padding:10px 20px;font-size:14px;font-weight:600;text-decoration:none;text-align:center;"
              (click)="menuOpen.set(false)">
              Start Selling
            </a>
          </div>
        </div>
      }
    </header>
  `,
  styles: [`
    @media (max-width: 767px) {
      .hidden-mobile { display: none !important; }
      .show-mobile { display: block !important; }
    }
    .nav-active { color: #1b4332 !important; font-weight: 600 !important; }
  `],
})
export class AppHeader {
  protected readonly navLinks = navLinks;
  protected readonly menuOpen = signal(false);
}
