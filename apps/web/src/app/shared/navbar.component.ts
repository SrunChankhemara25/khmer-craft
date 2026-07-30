import { Component, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
  <header class="navbar" [class.scrolled]="scrolled">
    <div class="navbar-inner container">
      <a routerLink="/" class="logo">
        <span class="logo-mark"><ui-icon name="leaf" [size]="16" color="#fff"></ui-icon></span>
        KhmerCraft
      </a>

      <div class="search-box">
        <ui-icon name="search" [size]="16"></ui-icon>
        <input type="text" placeholder="Search for handmade crafts, food, stores..." />
      </div>

      <nav class="nav-links">
        <a routerLink="/" [class.active]="active === 'home'">Home</a>
        <a routerLink="/products" [class.active]="active === 'products'">Products</a>
        <a routerLink="/categories" [class.active]="active === 'categories'">Categories</a>
        <a routerLink="/stores" [class.active]="active === 'stores'">Stores</a>
        <a routerLink="/about" [class.active]="active === 'about'">About</a>
        <a routerLink="/become-a-seller" [class.active]="active === 'seller'">Become a Seller</a>
      </nav>

      <div class="nav-actions">
        <button class="icon-btn wishlist-btn" aria-label="Wishlist" routerLink="/wishlist">
          <ui-icon name="heart" [size]="19" [filled]="wishlistCount > 0" [color]="wishlistCount > 0 ? 'var(--color-danger)' : undefined"></ui-icon>
          <span class="wishlist-badge" *ngIf="wishlistCount">{{ wishlistCount }}</span>
        </button>
        <button class="icon-btn cart-btn" aria-label="Cart" routerLink="/cart">
          <ui-icon name="cart" [size]="19"></ui-icon>
          <span class="cart-badge" *ngIf="cartCount">{{ cartCount }}</span>
        </button>
        <button class="signin-btn" routerLink="/login">
          <ui-icon name="user" [size]="15"></ui-icon>
          Sign In
        </button>
        <button class="menu-btn" aria-label="Menu"><ui-icon name="menu" [size]="20"></ui-icon></button>
      </div>
    </div>
  </header>
  `,
  styles: [`
    .navbar {
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(14px) saturate(1.6);
      -webkit-backdrop-filter: blur(14px) saturate(1.6);
      border-bottom: 1px solid transparent;
      position: sticky;
      top: 0;
      z-index: 50;
      transition: border-color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard);
    }
    .navbar.scrolled { border-bottom-color: var(--color-border); box-shadow: var(--shadow-xs); }
    .navbar-inner {
      display: flex;
      align-items: center;
      gap: 28px;
      padding-top: 14px;
      padding-bottom: 14px;
      height: var(--header-h);
    }
    .logo {
      font-family: var(--font-heading);
      font-weight: 800;
      font-size: 18px;
      color: var(--color-text);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 9px;
      letter-spacing: -0.02em;
    }
    .logo-mark { width: 28px; height: 28px; border-radius: 8px; background: var(--color-accent); display: flex; align-items: center; justify-content: center; }
    .search-box {
      flex: 1;
      max-width: 420px;
      display: flex;
      align-items: center;
      gap: 9px;
      background: var(--color-bg-alt);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      padding: 9px 14px;
      color: var(--color-muted);
      transition: all var(--dur-base) var(--ease-standard);
    }
    .search-box:focus-within { border-color: var(--color-border-strong); background: #fff; box-shadow: var(--shadow-xs); }
    .search-box input {
      border: none;
      background: transparent;
      outline: none;
      width: 100%;
      font-size: 13.5px;
      color: var(--color-text);
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 24px;
      font-size: 13.5px;
      font-weight: 500;
      color: var(--color-text-secondary);
      margin-left: auto;
    }
    .nav-links a { padding: 6px 0; border-bottom: 2px solid transparent; white-space: nowrap; position: relative; }
    .nav-links a:hover { color: var(--color-text); }
    .nav-links a.active { color: var(--color-text); font-weight: 600; border-bottom-color: var(--color-accent); }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .icon-btn {
      background: none;
      border: none;
      position: relative;
      color: var(--color-text-secondary);
      width: 36px; height: 36px;
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
    }
    .icon-btn:hover { background: var(--color-bg-alt); color: var(--color-text); }
    .wishlist-btn:hover { color: var(--color-danger); }
    .wishlist-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      background: var(--color-danger);
      color: #fff;
      font-size: 9.5px;
      font-weight: 700;
      border-radius: 50%;
      width: 15px;
      height: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid #fff;
    }
    .cart-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      background: var(--color-accent);
      color: #fff;
      font-size: 9.5px;
      font-weight: 700;
      border-radius: 50%;
      width: 15px;
      height: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid #fff;
    }
    .signin-btn {
      background: var(--color-accent);
      color: #fff;
      border: none;
      border-radius: var(--radius-full);
      padding: 9px 16px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 7px;
      margin-left: 6px;
    }
    .signin-btn:hover { background: var(--color-accent-hover); }
    .menu-btn { display: none; background: none; border: none; color: var(--color-text); width: 36px; height: 36px; align-items: center; justify-content: center; border-radius: var(--radius-sm); }
    .menu-btn:hover { background: var(--color-bg-alt); }
    @media (max-width: 980px) {
      .nav-links { display: none; }
      .search-box { display: none; }
      .menu-btn { display: flex; }
    }
  `]
})
export class NavbarComponent {
  @Input() active: string = '';
  @Input() cartCount: number = 0;
  @Input() wishlistCount: number = 0;
  scrolled = false;

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled = (window.scrollY || 0) > 4;
  }
}
