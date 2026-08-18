import {
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { CartService } from '../../../../core/cart/cart.service';
import { WishlistService } from '../../../../core/wishlist/wishlist.service';
import { IconComponent } from '../../ui/icon/icon.component';
import { CategoryMenuComponent } from '../category-menu/category-menu.component';
import { SearchOverlayComponent } from '../../../user/search/search-overlay/search-overlay.component';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, IconComponent, SearchOverlayComponent, CategoryMenuComponent],
  template: `
    <header class="navbar" [class.scrolled]="scrolled()">
      <!-- Announcement bar: slim, and every claim here links somewhere real. -->
      <div class="announce">
        <div class="container announce-inner">
          <span><ui-icon name="truck" [size]="13" /> Free delivery over $50 in Phnom Penh</span>
          <span class="dot">·</span>
          <span><ui-icon name="shield" [size]="13" /> Secure checkout</span>
          <div class="announce-links">
            <a routerLink="/orders">Track order</a>
            <a routerLink="/help">Support</a>
            <a routerLink="/become-a-seller">Seller portal</a>
          </div>
        </div>
      </div>

      <div class="navbar-inner container">
        <a routerLink="/" class="logo">
          <span class="logo-mark"
            ><ui-icon name="leaf" [size]="16" color="#fff"
          /></span>
          KhmerCraft
        </a>

        <nav class="nav-links">
          <a routerLink="/" [class.active]="is('home')">Home</a>
          <a routerLink="/products" [class.active]="is('products')">Products</a>
          <a routerLink="/categories" [class.active]="is('categories')"
            >Categories</a
          >
          <a routerLink="/stores" [class.active]="is('stores')">Stores</a>
        </nav>

        <div class="nav-actions">
          <button
            type="button"
            class="search-btn"
            (click)="searchOpen.set(true)"
            aria-label="Search"
            [attr.aria-expanded]="searchOpen()"
          >
            <ui-icon name="search" [size]="16" />
            <span class="search-label">Search</span>
          </button>

          <a class="icon-btn wishlist-btn" routerLink="/wishlist" aria-label="Wishlist">
            <ui-icon
              name="heart"
              [size]="19"
              [filled]="wishlistCount() > 0"
              [color]="wishlistCount() > 0 ? '#d1453b' : undefined"
            />
            @if (wishlistCount()) {
              <span class="wishlist-badge">{{ wishlistCount() }}</span>
            }
          </a>

          <a class="icon-btn cart-btn" routerLink="/cart" aria-label="Cart">
            <ui-icon name="cart" [size]="19" />
            @if (cartCount()) {
              <span class="cart-badge">{{ cartCount() }}</span>
            }
          </a>

          @if (user(); as currentUser) {
            <a class="signin-btn" routerLink="/profile">
              <ui-icon name="user" [size]="15" />
              <span class="signin-label">{{ firstName(currentUser.name) }}</span>
            </a>
          } @else {
            <a class="signin-btn" routerLink="/login">
              <ui-icon name="user" [size]="15" />
              <span class="signin-label">Sign In</span>
            </a>
          }

          <button
            type="button"
            class="menu-btn"
            aria-label="Menu"
            [attr.aria-expanded]="menuOpen()"
            (click)="menuOpen.set(!menuOpen())"
          >
            <ui-icon [name]="menuOpen() ? 'x' : 'menu'" [size]="20" />
          </button>
        </div>
      </div>

      <!-- Category navigation row. Sits under the logo/nav/profile row, so
           each category is one hover away rather than hidden behind a menu. -->
      <app-category-menu />

      @if (menuOpen()) {
        <nav class="mobile-menu">
          <a routerLink="/" (click)="menuOpen.set(false)">Home</a>
          <a routerLink="/products" (click)="menuOpen.set(false)">Products</a>
          <a routerLink="/categories" (click)="menuOpen.set(false)">Categories</a>
          <a routerLink="/stores" (click)="menuOpen.set(false)">Stores</a>
        </nav>
      }
    </header>

    @if (searchOpen()) {
      <app-search-overlay (close)="searchOpen.set(false)" />
    }
  `,
  styles: [
    `
      .navbar {
        background: rgba(255, 253, 248, 0.91);
        backdrop-filter: blur(14px) saturate(1.6);
        -webkit-backdrop-filter: blur(14px) saturate(1.6);
        border-bottom: 1px solid transparent;
        position: sticky;
        top: 0;
        z-index: 50;
        transition:
          border-color var(--dur-base) var(--ease-standard),
          box-shadow var(--dur-base) var(--ease-standard);
      }
      .navbar.scrolled {
        border-bottom-color: var(--color-border);
        box-shadow: var(--shadow-xs);
      }
      .announce {
        background: #6f271c;
        color: rgba(255, 255, 255, 0.92);
        font-size: 12px;
      }
      .announce-inner {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 32px;
      }
      .announce-inner span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .announce .dot {
        opacity: 0.5;
      }
      .announce-links {
        display: flex;
        gap: 16px;
        margin-left: auto;
      }
      .announce-links a:hover {
        text-decoration: underline;
      }
      .navbar-inner {
        /* Three tracks so the nav sits dead centre regardless of how wide the
           logo or the actions happen to be. A flex row would let a longer
           store name shove the links off-centre. */
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: clamp(18px, 2.4vw, 42px);
        padding-top: 8px;
        padding-bottom: 8px;
        height: var(--header-h);
      }
      .logo {
        font-family: var(--font-heading);
        font-weight: 600;
        font-size: 21px;
        color: var(--color-text);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 9px;
        letter-spacing: -0.02em;
      }
      .logo-mark {
        width: 34px;
        height: 30px;
        border-radius: 11px 11px 17px 11px;
        background: var(--color-accent);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .nav-links {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: clamp(17px, 1.65vw, 30px);
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-secondary);
        white-space: nowrap;
      }
      .nav-links a {
        padding: 10px 0;
        border-bottom: 2px solid transparent;
        white-space: nowrap;
      }
      .nav-links a:hover {
        color: var(--color-text);
      }
      .nav-links a.active {
        color: var(--color-text);
        font-weight: 600;
        border-bottom-color: var(--color-accent);
      }
      .nav-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
      }
      .search-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        height: 40px;
        padding: 0 14px 0 12px;
        margin-right: 4px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-full);
        background: rgba(255,255,255,.68);
        color: var(--color-muted);
        font-size: 13px;
        font-weight: 500;
      }
      .search-btn:hover {
        background: #fff;
        border-color: var(--color-muted);
        color: var(--color-text);
        box-shadow: var(--shadow-xs);
      }
      .icon-btn {
        background: none;
        border: none;
        position: relative;
        color: var(--color-text-secondary);
        width: 40px;
        height: 40px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .icon-btn:hover {
        background: var(--color-bg-alt);
        color: var(--color-text);
      }
      .wishlist-btn:hover {
        color: var(--color-danger);
      }
      .wishlist-badge,
      .cart-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        color: #fff;
        font-size: 9.5px;
        font-weight: 700;
        border-radius: 50%;
        min-width: 15px;
        height: 15px;
        padding: 0 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.5px solid #fff;
      }
      .wishlist-badge {
        background: var(--color-danger);
      }
      .cart-badge {
        background: var(--color-accent);
      }
      .signin-btn {
        background: var(--color-accent);
        color: #fff;
        border: none;
        border-radius: var(--radius-full);
        min-height: 40px;
        padding: 9px 17px;
        font-size: 13.5px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 7px;
        margin-left: 6px;
        white-space: nowrap;
      }
      .signin-btn:hover {
        background: var(--color-accent-hover);
      }
      .menu-btn {
        display: none;
        background: none;
        border: none;
        color: var(--color-text);
        width: 36px;
        height: 36px;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
      }
      .menu-btn:hover {
        background: var(--color-bg-alt);
      }
      .mobile-menu {
        display: none;
        flex-direction: column;
        gap: 2px;
        padding: 8px 20px 16px;
        border-top: 1px solid var(--color-border);
        background: #fff;
      }
      .mobile-menu a {
        padding: 11px 4px;
        font-size: 14px;
        font-weight: 550;
        border-bottom: 1px solid var(--color-border);
      }
      .mobile-menu a:last-child {
        border-bottom: 0;
      }
      @media (max-width: 1380px) {
        .nav-links {
          display: none;
        }
        .menu-btn {
          display: flex;
        }
        .mobile-menu {
          display: flex;
        }
        .navbar-inner {
          gap: 14px;
        }
        .announce-links {
          display: none;
        }
      }
      @media (max-width: 1180px) {
        .nav-links { gap: 16px; font-size: 13px; }
        .search-label { display: none; }
        .search-btn { width: 40px; padding: 0; justify-content: center; }
      }
      @media (max-width: 700px) {
        .search-label {
          display: none;
        }
        .search-btn {
          width: 36px;
          padding: 0;
          justify-content: center;
          border-radius: var(--radius-sm);
        }
      }
      /* Below ~420px the icon row plus a labelled Sign In button overflows the
         viewport, so the button collapses to its icon. */
      @media (max-width: 430px) {
        .signin-label {
          display: none;
        }
        .signin-btn {
          padding: 9px 11px;
          margin-left: 0;
        }
        .nav-actions {
          gap: 2px;
        }
      }
      @media (max-width: 560px) {
        .announce-inner { justify-content: center; font-size: 10.5px; }
        .announce .dot, .announce-inner > span:nth-of-type(2) { display: none; }
        .navbar-inner { grid-template-columns: auto 1fr; }
        .logo { font-size: 18px; }
        .logo-mark { width: 32px; height: 32px; }
        .signin-label { display: none; }
        .signin-btn { padding-inline: 11px; margin-left: 0; }
        .wishlist-btn { display: none; }
        .menu-btn { width: 38px; }
      }
    `,
  ],
})
export class NavbarComponent {
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);
  private readonly auth = inject(AuthService);

  protected readonly menuOpen = signal(false);
  protected readonly searchOpen = signal(false);
  protected readonly scrolled = signal(false);

  protected readonly cartCount = this.cart.count;
  protected readonly wishlistCount = this.wishlist.count;
  protected readonly user = this.auth.user;

  /** Active nav item, derived from the URL rather than passed in by each page. */
  private readonly url = signal(this.router.url);
  private readonly section = computed(() => {
    const path = this.url().split('?')[0];
    if (path === '/') return 'home';
    if (path.startsWith('/products') || path.startsWith('/product/'))
      return 'products';
    if (path.startsWith('/categories')) return 'categories';
    if (path.startsWith('/stores')) return 'stores';
    if (path.startsWith('/about')) return 'about';
    if (path.startsWith('/become-a-seller')) return 'seller';
    return '';
  });

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.url.set(event.urlAfterRedirects);
        this.menuOpen.set(false);
        this.searchOpen.set(false);
      });

    // Resolve the session once so the header can show a profile link instead
    // of "Sign In" for a user who is already authenticated.
    this.auth.loadCurrentUser().subscribe();
  }

  protected is(name: string): boolean {
    return this.section() === name;
  }

  protected firstName(name: string): string {
    return name.split(' ')[0];
  }


  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set((window.scrollY || 0) > 4);
  }
}
