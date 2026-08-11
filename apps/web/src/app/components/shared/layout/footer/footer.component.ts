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
    .footer { background: #1f3028; color: #f7f0e5; margin-top: var(--section-space); padding-top: clamp(54px, 7vw, 92px); border-top: 0; }
    .footer-grid {
      display: grid;
      grid-template-columns: 1.7fr repeat(4, minmax(100px, .8fr)) 1.5fr;
      gap: clamp(28px, 3vw, 58px);
      padding-bottom: 54px;
    }
    .footer-brand .logo { font-family: var(--font-heading); font-weight: 600; font-size: 24px; color: #fffaf0; margin-bottom: 18px; display: flex; align-items: center; gap: 10px; }
    .logo-mark { width: 34px; height: 34px; border-radius: 10px 10px 16px 10px; background: var(--color-accent); display: flex; align-items: center; justify-content: center; }
    .footer-brand p { font-size: 14px; color: rgba(255,250,240,.65); line-height: 1.75; max-width: 360px; }
    .socials { display: flex; gap: 8px; margin-top: 18px; }
    .social-icon {
      width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06);
      display: flex; align-items: center; justify-content: center; color: #fffaf0;
    }
    .social-icon:hover { background: #fffaf0; color: #1f3028; border-color: #fffaf0; }
    .footer-col h4 { font-family: var(--font-body); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 20px; color: #d9bd8b; }
    .footer-col a { display: block; font-size: 13.5px; color: rgba(255,250,240,.65); margin-bottom: 13px; }
    .footer-col a:hover { color: #fff; }
    .newsletter p { font-size: 13.5px; color: rgba(255,250,240,.65); margin-bottom: 16px; line-height: 1.6; }
    .subscribe-box { display: flex; gap: 8px; }
    .subscribe-box input {
      min-width: 0; flex: 1; padding: 11px 13px; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,.16); font-size: 13px; background: rgba(255,255,255,.08); color: #fff;
    }
    .footer-bottom {
      border-top: 1px solid rgba(255,255,255,.12);
      padding-top: 22px;
      padding-bottom: 24px;
      font-size: 12.5px;
      color: rgba(255,250,240,.5);
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
    @media (max-width: 560px) {
      .footer-grid { grid-template-columns: 1fr 1fr; }
      .footer-brand, .footer-col.newsletter { grid-column: 1 / -1; }
      .subscribe-box { flex-direction: column; }
    }
  `]
})
export class FooterComponent {}
