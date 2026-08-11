import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
  <footer class="footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <div class="logo">
          <span class="logo-mark"><ui-icon name="leaf" [size]="16" color="#fff"></ui-icon></span>
          KhmerCraft
        </div>
        <p>Empowering local artisans by bringing centuries of Cambodian craftsmanship to the global stage through intentional, sustainable commerce.</p>
        <div class="socials">
          <a href="javascript:void(0)" class="social-icon" aria-label="Facebook"><ui-icon name="facebook" [size]="15"></ui-icon></a>
          <a href="javascript:void(0)" class="social-icon" aria-label="Instagram"><ui-icon name="instagram" [size]="15"></ui-icon></a>
          <a href="javascript:void(0)" class="social-icon" aria-label="LinkedIn"><ui-icon name="linkedin" [size]="15"></ui-icon></a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Shop</h4>
        <a routerLink="/">Home</a>
        <a routerLink="/products">Products</a>
        <a routerLink="/categories">Categories</a>
        <a routerLink="/stores">Stores</a>
        <a routerLink="/about">About</a>
      </div>
      <div class="footer-col">
        <h4>Account</h4>
        <a routerLink="/login">Sign in</a>
        <a routerLink="/register">Create account</a>
        <a routerLink="/orders">My orders</a>
        <a routerLink="/wishlist">Wishlist</a>
        <a routerLink="/cart">Cart</a>
      </div>
      <div class="footer-col">
        <h4>Sell</h4>
        <a routerLink="/become-a-seller">Become a Seller</a>
        <a routerLink="/seller/login">Seller login</a>
      </div>
      <div class="footer-col">
        <h4>Assistance</h4>
        <a routerLink="/help">Help centre</a>
        <a routerLink="/contact">Contact us</a>
        <a routerLink="/shipping">Shipping info</a>
        <a routerLink="/privacy">Privacy policy</a>
        <a routerLink="/terms">Terms of service</a>
      </div>
      <div class="footer-col newsletter">
        <h4>Newsletter</h4>
        <p>Subscribe for artisan spotlights and exclusive collections.</p>
        <div class="subscribe-box">
          <input type="text" placeholder="Your email address" />
          <button class="btn btn-primary">Join</button>
        </div>
      </div>
    </div>
    <div class="footer-bottom container">
      <span>&copy; 2026 KhmerCraft. All rights reserved.</span>
      <span class="made-in">Celebrating Cambodian Artisanship.</span>
    </div>
  </footer>
  `,
  styles: [`
    .footer { background: var(--color-bg-alt); margin-top: 72px; padding-top: 56px; border-top: 1px solid var(--color-border); }
    .footer-grid {
      display: grid;
      grid-template-columns: 1.8fr 1fr 1fr 1fr 1fr 1.4fr;
      gap: 40px;
      padding-bottom: 36px;
    }
    .footer-brand .logo { font-family: var(--font-heading); font-weight: 800; font-size: 17px; color: var(--color-text); margin-bottom: 14px; display: flex; align-items: center; gap: 9px; }
    .logo-mark { width: 26px; height: 26px; border-radius: 7px; background: var(--color-accent); display: flex; align-items: center; justify-content: center; }
    .footer-brand p { font-size: 13px; color: var(--color-muted); line-height: 1.65; max-width: 320px; }
    .socials { display: flex; gap: 8px; margin-top: 18px; }
    .social-icon {
      width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--color-border-strong); background: #fff;
      display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary);
    }
    .social-icon:hover { background: var(--color-text); color: #fff; border-color: var(--color-text); }
    .footer-col h4 { font-size: 13px; margin-bottom: 16px; color: var(--color-text); }
    .footer-col a { display: block; font-size: 13px; color: var(--color-muted); margin-bottom: 11px; }
    .footer-col a:hover { color: var(--color-text); }
    .newsletter p { font-size: 13px; color: var(--color-muted); margin-bottom: 14px; line-height: 1.5; }
    .subscribe-box { display: flex; gap: 8px; }
    .subscribe-box input {
      flex: 1; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border-strong); font-size: 13px; background: #fff;
    }
    .footer-bottom {
      border-top: 1px solid var(--color-border);
      padding: 20px 32px;
      font-size: 12.5px;
      color: var(--color-muted);
      display: flex;
      justify-content: space-between;
    }
    @media (max-width: 1180px) {
      .footer-grid { grid-template-columns: 1.6fr 1fr 1fr 1fr; }
      .footer-col.newsletter { grid-column: 1 / -1; }
    }
    @media (max-width: 900px) {
      .footer-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
      .footer-bottom { flex-direction: column; gap: 6px; }
    }
  `]
})
export class FooterComponent {}
