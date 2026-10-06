import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { AuthService } from '../../../core/auth/auth.service';
import { marketplaceUrl } from '../../../core/portal/portal';

/**
 * Header for the seller portal's public pages.
 *
 * The seller portal is its own site (see core/portal/portal.ts), so this is the
 * only navigation a prospective seller sees — the marketplace is one link away,
 * in its own tab, rather than mixed into the menu.
 */
@Component({
  selector: 'app-seller-portal-header',
  imports: [RouterLink, RouterLinkActive, KcIcon],
  template: `
    <div class="ribbon">
      <span><kc-icon name="sparkles" [size]="12" /> Free to start</span>
      <span class="dot" aria-hidden="true"></span>
      <span>No card needed</span>
      <span class="dot" aria-hidden="true"></span>
      <span>Set up in about five minutes</span>
    </div>
    <header class="seller-header" [class.scrolled]="scrolled()">
      <div class="header-inner">
        <a class="brand" routerLink="/" aria-label="KhmerCraft Seller home">
          <span class="brand-mark"><kc-icon name="leaf" [size]="16" /></span>
          <span>KhmerCraft</span><small>Seller</small>
        </a>

        <nav class="desktop-nav" aria-label="Seller navigation">
          @for (link of links; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="current" [routerLinkActiveOptions]="{ exact: link.path === '/' }">{{ link.label }}</a>
          }
        </nav>

        <div class="desktop-actions">
          <a class="market-link" [href]="marketplaceHome" target="_blank" rel="noopener">Marketplace <kc-icon name="external" [size]="12" /></a>
          @if (isSeller()) {
            <a class="start" routerLink="/seller/dashboard">Open dashboard <span aria-hidden="true">→</span></a>
          } @else {
            <a class="sign-in" routerLink="/seller/login">Sign in</a>
            <a class="start" routerLink="/seller/onboarding">Start selling <span aria-hidden="true">→</span></a>
          }
        </div>

        <button type="button" class="menu-button" (click)="menuOpen.set(!menuOpen())" aria-label="Toggle seller navigation" [attr.aria-expanded]="menuOpen()" aria-controls="seller-mobile-nav">
          <span></span><span></span><span></span>
        </button>
      </div>

      @if (menuOpen()) {
        <nav id="seller-mobile-nav" class="mobile-nav" aria-label="Mobile seller navigation">
          @for (link of links; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="current" [routerLinkActiveOptions]="{ exact: link.path === '/' }" (click)="menuOpen.set(false)">
              <kc-icon [name]="link.icon" [size]="16" /> {{ link.label }}
            </a>
          }
          <a [href]="marketplaceHome" target="_blank" rel="noopener"><kc-icon name="external" [size]="16" /> Go to the marketplace</a>
          <div class="mobile-actions">
            @if (isSeller()) {
              <a class="start" routerLink="/seller/dashboard" (click)="menuOpen.set(false)">Open dashboard</a>
            } @else {
              <a class="sign-in" routerLink="/seller/login" (click)="menuOpen.set(false)">Sign in</a>
              <a class="start" routerLink="/seller/onboarding" (click)="menuOpen.set(false)">Start selling</a>
            }
          </div>
        </nav>
      }
    </header>
  `,
  styles: [`
    :host { display: block; position: sticky; top: -34px; z-index: 60; font-family: var(--font-body, Inter, sans-serif); }
    .ribbon { height: 34px; display: flex; align-items: center; justify-content: center; gap: 12px; color: #fff; background: linear-gradient(90deg, #b9523a, #c9663f 50%, #b9523a); font-size: 12px; font-weight: 600; letter-spacing: .01em; }
    .ribbon span { display: inline-flex; align-items: center; gap: 6px; }
    .ribbon .dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,.6); }
    .seller-header { background: rgba(255, 253, 249, .9); border-bottom: 1px solid transparent; backdrop-filter: blur(16px); transition: border-color .25s, box-shadow .25s; }
    .seller-header.scrolled { border-bottom-color: #efe5d7; box-shadow: 0 10px 30px rgba(120, 80, 45, .06); }
    .header-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; width: min(1240px, calc(100% - 48px)); min-height: 74px; margin: 0 auto; }
    .brand { display: inline-flex; align-items: center; gap: 10px; color: #2b221c; font: 600 22px/1 'Fraunces', Georgia, serif; letter-spacing: -.02em; text-decoration: none; }
    .brand-mark { width: 36px; height: 36px; display: grid; place-items: center; color: #fff; background: linear-gradient(140deg, #d8704f, #c0573b); border-radius: 11px; box-shadow: 0 6px 14px rgba(192, 87, 59, .25); }
    .brand small { padding: 4px 8px; color: #c0573b; background: #fbece5; border-radius: 999px; font: 800 9.5px/1 var(--font-body, Inter, sans-serif); letter-spacing: .1em; text-transform: uppercase; }
    .desktop-nav { display: flex; align-items: center; gap: 4px; }
    .desktop-nav a { padding: 9px 14px; color: #5f544a; border-radius: 999px; font-size: 14px; font-weight: 600; text-decoration: none; transition: background .2s, color .2s; }
    .desktop-nav a:hover { color: #2b221c; background: #f6efe4; }
    .desktop-nav a.current { color: #a3452c; background: #fbece5; }
    .desktop-actions { display: flex; align-items: center; gap: 16px; }
    .market-link { display: inline-flex; align-items: center; gap: 5px; color: #776b60; font-size: 13.5px; font-weight: 600; text-decoration: none; }
    .market-link:hover { color: #2b221c; }
    .sign-in { color: #2b221c; font-size: 14px; font-weight: 700; text-decoration: none; }
    .start { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; color: #fff; background: linear-gradient(135deg, #d26a4b, #c0573b); border-radius: 999px; box-shadow: 0 10px 22px rgba(192, 87, 59, .25); font-size: 14px; font-weight: 700; text-decoration: none; transition: transform .2s, box-shadow .2s; }
    .start:hover { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(192, 87, 59, .3); }
    a:focus-visible, button:focus-visible { outline: 3px solid rgba(192, 87, 59, .45); outline-offset: 3px; }
    .menu-button { display: none; width: 44px; height: 44px; padding: 12px 11px; flex-direction: column; justify-content: space-between; background: #fff; border: 1px solid #ece2d3; border-radius: 12px; cursor: pointer; }
    .menu-button span { display: block; height: 2px; background: #2b221c; border-radius: 2px; }
    .mobile-nav { display: grid; gap: 4px; padding: 12px 20px 22px; background: #fffdf9; border-top: 1px solid #efe5d7; }
    .mobile-nav > a { display: flex; align-items: center; gap: 12px; padding: 13px 12px; color: #4d4239; border-radius: 12px; font-size: 15px; font-weight: 600; text-decoration: none; }
    .mobile-nav > a kc-icon { color: #c0573b; }
    .mobile-nav > a.current { color: #a3452c; background: #fbece5; }
    .mobile-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
    .mobile-actions a { justify-content: center; text-align: center; }
    .mobile-actions .sign-in { padding: 12px; border: 1px solid #e6d9c7; border-radius: 999px; }
    .mobile-actions .start:only-child { grid-column: 1 / -1; }
    @media (max-width: 1080px) { .market-link { display: none; } }
    @media (max-width: 920px) {
      .desktop-nav, .desktop-actions { display: none; }
      .menu-button { display: flex; }
    }
    @media (max-width: 520px) {
      .ribbon span:nth-child(n+4) { display: none; }
      .header-inner { width: calc(100% - 32px); min-height: 64px; }
    }
  `],
})
export class SellerPortalHeader {
  private readonly auth = inject(AuthService);

  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);
  protected readonly isSeller = computed(() => this.auth.user()?.role === 'SELLER');
  protected readonly marketplaceHome = marketplaceUrl('/');

  protected readonly links = [
    { path: '/', label: 'Why sell', icon: 'heart' },
    { path: '/explore', label: 'Explore tools', icon: 'grid' },
    { path: '/pricing', label: 'Pricing', icon: 'percent' },
    { path: '/guide', label: 'Seller guide', icon: 'lightbulb' },
    { path: '/faq', label: 'FAQ', icon: 'info' },
    { path: '/about', label: 'About', icon: 'leaf' },
  ];

  constructor() {
    this.auth.loadCurrentUser().subscribe();
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    this.scrolled.set(window.scrollY > 40);
  }
}
