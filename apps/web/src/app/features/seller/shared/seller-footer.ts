import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { marketplaceUrl } from '../../../core/portal/portal';

@Component({
  selector: 'app-seller-footer',
  imports: [RouterLink, KcIcon],
  template: `
    <footer class="seller-footer">
      <div class="wrap footer-top">
        <div class="footer-brand-col">
          <a class="footer-brand" routerLink="/" aria-label="KhmerCraft Seller home">
            <span class="brand-mark"><kc-icon name="leaf" [size]="15" /></span> KhmerCraft <small>Seller</small>
          </a>
          <p>The seller portal for Cambodia’s local-first marketplace. Open a store, list what you make, and manage every order in one calm place.</p>
          <a class="footer-cta" routerLink="/seller/onboarding">Start selling, free <span aria-hidden="true">→</span></a>
        </div>
        <nav class="footer-cols" aria-label="Seller footer">
          <div>
            <h4>Sell</h4>
            <a routerLink="/seller/onboarding">Open a store</a>
            <a routerLink="/pricing">Plans & pricing</a>
            <a routerLink="/explore">Explore the tools</a>
          </div>
          <div>
            <h4>Learn</h4>
            <a routerLink="/guide">Seller guide</a>
            <a routerLink="/faq">Seller FAQ</a>
            <a routerLink="/about">About KhmerCraft Seller</a>
          </div>
          <div>
            <h4>Account</h4>
            <a routerLink="/seller/login">Seller sign in</a>
            <a routerLink="/seller/dashboard">Seller dashboard</a>
            <a routerLink="/help">Help centre</a>
          </div>
          <div>
            <h4>Marketplace</h4>
            <a [href]="marketplace('/')" target="_blank" rel="noopener">Shop KhmerCraft <kc-icon name="external" [size]="11" /></a>
            <a routerLink="/terms">Terms</a>
            <a routerLink="/privacy">Privacy</a>
          </div>
        </nav>
      </div>
      <div class="wrap footer-bottom">
        <span>© {{ year }} KhmerCraft · Made in Cambodia, for Cambodian sellers.</span>
        <span class="pay"><kc-icon name="shield" [size]="13" /> Paid plans are settled through ABA KHQR</span>
      </div>
    </footer>
  `,
  styles: [`
    :host { display: block; font-family: var(--font-body, Inter, sans-serif); }
    .wrap { width: min(1200px, calc(100% - 48px)); margin-inline: auto; }
    .seller-footer { color: #4d4239; background: linear-gradient(180deg, #f6efe4, #f1e8db); border-top: 1px solid #ece2d3; }
    .footer-top { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 2fr); gap: clamp(32px, 6vw, 90px); padding: clamp(52px, 6vw, 80px) 0 44px; }
    .footer-brand { display: inline-flex; align-items: center; gap: 9px; color: #2b221c; font: 600 22px/1 'Fraunces', Georgia, serif; letter-spacing: -.02em; text-decoration: none; }
    .footer-brand small { padding: 4px 8px; color: #c0573b; background: #fbece5; border-radius: 999px; font: 800 9.5px/1 var(--font-body, Inter, sans-serif); letter-spacing: .1em; text-transform: uppercase; }
    .brand-mark { width: 32px; height: 32px; display: grid; place-items: center; color: #fff; background: linear-gradient(140deg, #d8704f, #c0573b); border-radius: 10px; }
    .footer-brand-col p { max-width: 38ch; margin: 18px 0 22px; color: #776b60; font-size: 14px; line-height: 1.7; }
    .footer-cta { display: inline-flex; gap: 8px; color: #a3452c; font-size: 14px; font-weight: 700; text-decoration: none; }
    .footer-cols { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; }
    .footer-cols h4 { margin: 0 0 16px; color: #2b221c; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .footer-cols a { display: flex; align-items: center; gap: 5px; margin-bottom: 11px; color: #5f544a; font-size: 14px; text-decoration: none; transition: color .2s; }
    .footer-cols a:hover { color: #c0573b; }
    a:focus-visible { outline: 3px solid rgba(192, 87, 59, .45); outline-offset: 3px; }
    .footer-bottom { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding: 20px 0 28px; border-top: 1px solid #e6dac9; color: #8d8277; font-size: 12.5px; }
    .pay { display: inline-flex; align-items: center; gap: 6px; }
    @media (max-width: 860px) { .footer-top { grid-template-columns: 1fr; } }
    @media (max-width: 560px) { .footer-cols { grid-template-columns: 1fr 1fr; } .wrap { width: calc(100% - 32px); } }
  `],
})
export class SellerFooter {
  protected readonly year = new Date().getFullYear();
  protected readonly marketplace = marketplaceUrl;
}
