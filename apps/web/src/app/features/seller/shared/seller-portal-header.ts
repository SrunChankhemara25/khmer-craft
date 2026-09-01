import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-seller-portal-header',
  imports: [RouterLink],
  template: `
    <header class="seller-header">
      <div class="header-inner">
        <a class="brand" routerLink="/">KhmerCraft</a>

        <nav class="desktop-nav" aria-label="Seller navigation">
          <a href="#why-sell">Why Sell</a>
          <a routerLink="/">Explore</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <a routerLink="/about">About us</a>
        </nav>

        <div class="desktop-actions">
          <a class="sign-in" routerLink="/seller/login">Seller Sign In</a>
          <a class="start" routerLink="/seller/onboarding">Start Selling</a>
        </div>

        <button type="button" class="menu-button" (click)="menuOpen.set(!menuOpen())" aria-label="Toggle seller navigation">
          {{ menuOpen() ? 'Close' : 'Menu' }}
        </button>
      </div>

      @if (menuOpen()) {
        <nav class="mobile-nav" aria-label="Mobile seller navigation">
          <a href="#why-sell" (click)="menuOpen.set(false)">Why Sell</a>
          <a routerLink="/" (click)="menuOpen.set(false)">Explore</a>
          <a href="#pricing" (click)="menuOpen.set(false)">Pricing</a>
          <a href="#faq" (click)="menuOpen.set(false)">FAQ</a>
          <a routerLink="/about" (click)="menuOpen.set(false)">About us</a>
          <a routerLink="/seller/login" (click)="menuOpen.set(false)">Seller Sign In</a>
          <a class="start" routerLink="/seller/onboarding" (click)="menuOpen.set(false)">Start Selling</a>
        </nav>
      }
    </header>
  `,
  styles: [`
    :host { display: block; position: sticky; top: 0; z-index: 60; }
    .seller-header { background: #fafbf8; border-bottom: 1px solid #dfe5dd; }
    .header-inner { align-items: center; display: flex; justify-content: space-between; margin: 0 auto; max-width: 1210px; min-height: 72px; padding: 0 32px; }
    .brand { color: #176242; font-size: 19px; font-weight: 800; letter-spacing: -.02em; text-decoration: none; }
    .desktop-nav, .desktop-actions { align-items: center; display: flex; }
    .desktop-nav { gap: 34px; }
    .desktop-actions { gap: 22px; }
    a { color: #59625e; font-size: 12px; font-weight: 700; text-decoration: none; }
    a:hover { color: #176242; }
    .sign-in { color: #176242; font-weight: 800; }
    .start { background: #176242; border-radius: 7px; color: white; padding: 11px 22px; }
    .start:hover { background: #2d6a4f; color: white; }
    .menu-button { background: none; border: 0; color: #176242; display: none; font: inherit; font-size: 13px; font-weight: 800; }
    .mobile-nav { background: #fafbf8; border-top: 1px solid #dfe5dd; display: flex; flex-direction: column; gap: 15px; padding: 18px 24px 22px; }
    .mobile-nav .start { text-align: center; }
    @media (max-width: 860px) {
      .desktop-nav, .desktop-actions { display: none; }
      .menu-button { display: block; }
    }
  `],
})
export class SellerPortalHeader {
  protected readonly menuOpen = signal(false);
}
