import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { ScrollReveal } from '../../../components/shared/ui/scroll-reveal/scroll-reveal.directive';
import { SellerPortalHeader } from '../shared/seller-portal-header';
import { SellerFooter } from '../shared/seller-footer';
import { sellerSteps } from '../../../core/data/seller-content.data';

/**
 * The page a prospective seller lands on.
 *
 * Written to be read top to bottom rather than scanned: one idea per screen,
 * a lot of air between them, and the marketplace shown rather than described.
 * The device mockups are built from real category artwork the storefront
 * already ships, so what a seller sees here is what the site actually looks
 * like — no invented screenshots to fall out of date.
 *
 * Nothing on this page claims a number the marketplace cannot back up. There
 * are no seller counts, no revenue figures and no ratings, because inventing
 * them is how a young marketplace loses the trust it is trying to earn.
 */
@Component({
  selector: 'app-seller',
  imports: [RouterLink, KcIcon, ScrollReveal, SellerPortalHeader, SellerFooter],
  template: `
    <app-seller-portal-header />

    <main class="lp">
      <!-- One sentence, set large. Everything else waits. -->
      <section class="stage hero">
        <p class="kicker reveal">KhmerCraft for sellers</p>
        <h1 class="reveal">Your shop.<br />The whole country.</h1>
        <p class="lede reveal">
          Open a storefront on Cambodia's local-first marketplace. Publish what
          you make, take orders, and keep every sale in one place.
        </p>
        <div class="cta reveal">
          <button type="button" class="btn solid" (click)="startOnboarding()">Start selling</button>
          <a class="btn ghost" routerLink="/become-a-seller/explore">See how it works</a>
        </div>
        <p class="fine reveal">Free to open. No listing fees.</p>
      </section>

      <!-- Show it, do not describe it. -->
      <section class="stage showcase">
        <div class="devices reveal">
          <div class="laptop">
            <div class="screen">
              <div class="mini-bar">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                <span class="mini-url">khmercraft.com</span>
              </div>
              <div class="mini-app">
                <div class="mini-nav">
                  <strong>KhmerCraft</strong>
                  @for (c of previewCategories; track c.slug) { <span>{{ c.label }}</span> }
                </div>
                <div class="mini-grid">
                  @for (c of previewCategories; track c.slug) {
                    <figure class="mini-card">
                      <img [src]="'/categories/' + c.slug + '.png'" alt="" loading="lazy" />
                      <figcaption>{{ c.label }}</figcaption>
                    </figure>
                  }
                </div>
              </div>
            </div>
            <div class="base"></div>
          </div>

          <div class="phone">
            <div class="notch"></div>
            <div class="screen">
              <div class="mini-app phone-app">
                <div class="mini-nav small"><strong>KhmerCraft</strong></div>
                <figure class="phone-hero">
                  <img src="/categories/fashion.png" alt="" loading="lazy" />
                </figure>
                <div class="phone-meta">
                  <span class="phone-cat">Fashion &amp; Accessories</span>
                  <strong>Handwoven krama</strong>
                  <span class="phone-price">$8.90</span>
                </div>
                <span class="phone-cta">Add to cart</span>
              </div>
            </div>
          </div>
        </div>
        <p class="caption reveal">Your products, in the same marketplace buyers already browse.</p>
      </section>

      <!-- What this actually is. Three plain statements. -->
      <section class="stage claims">
        @for (claim of claims; track claim.title) {
          <article class="claim reveal">
            <kc-icon [name]="claim.icon" [size]="26" />
            <h2>{{ claim.title }}</h2>
            <p>{{ claim.body }}</p>
          </article>
        }
      </section>

      <section class="stage steps">
        <h2 class="section-title reveal">Three steps to your first order.</h2>
        <ol class="step-list">
          @for (step of steps; track step.title; let i = $index) {
            <li class="reveal">
              <span class="num">{{ i + 1 }}</span>
              <div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.description }}</p>
              </div>
            </li>
          }
        </ol>
      </section>

      <section class="stage tools">
        <h2 class="section-title reveal">Everything the workspace gives you.</h2>
        <div class="tool-grid">
          @for (tool of workspace; track tool.title) {
            <article class="tool reveal">
              <kc-icon [name]="tool.icon" [size]="20" />
              <h3>{{ tool.title }}</h3>
              <p>{{ tool.body }}</p>
            </article>
          }
        </div>
      </section>

      <section class="stage closing">
        <h2 class="reveal">Start with one product.</h2>
        <p class="lede reveal">Opening a storefront takes a few minutes, and nothing is published until you say so.</p>
        <div class="cta reveal">
          <button type="button" class="btn solid" (click)="startOnboarding()">Start selling</button>
          <a class="btn ghost" routerLink="/become-a-seller/pricing">See pricing</a>
        </div>
      </section>
    </main>

    <app-seller-footer />
  `,
  styles: [`
    /* Apple-ish restraint: one idea per screen, a lot of air, near-monochrome
       with the brand clay used once or twice rather than everywhere. */
    .lp { background: #fff; color: #111; }
    .stage { max-width: 1080px; margin: 0 auto; padding: clamp(72px, 11vw, 150px) 24px; text-align: center; }
    .kicker { margin: 0 0 18px; color: #8e3021; font-size: 12px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
    h1 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: clamp(40px, 7.4vw, 84px); line-height: 1.03; letter-spacing: -.035em; }
    .lede { max-width: 30ch; margin: 22px auto 0; color: #5c5750; font-size: clamp(16px, 1.7vw, 21px); line-height: 1.55; }
    .cta { display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 26px; border: 1px solid transparent; border-radius: 999px; font-size: 15px; font-weight: 600; cursor: pointer; text-decoration: none; transition: transform 160ms ease, background 160ms ease; }
    .btn.solid { background: #8e3021; color: #fff; }
    .btn.solid:hover { background: #6e2419; transform: translateY(-1px); }
    .btn.ghost { border-color: #ddd6ca; color: #111; background: #fff; }
    .btn.ghost:hover { border-color: #111; }
    .fine { margin-top: 16px; color: #8d8577; font-size: 13px; }

    /* ---- device mockups ------------------------------------------------ */
    .showcase { padding-top: 0; }
    .devices { position: relative; display: flex; justify-content: center; align-items: flex-end; }
    .laptop { width: min(100%, 760px); }
    .laptop .screen { border: 10px solid #1d1d1f; border-radius: 16px 16px 4px 4px; background: #fffdf8; overflow: hidden; box-shadow: 0 40px 80px -40px rgba(0,0,0,.45); }
    .laptop .base { height: 13px; margin: 0 auto; width: 104%; max-width: none; border-radius: 0 0 14px 14px; background: linear-gradient(#c8c8cc, #9b9ba1); position: relative; left: -2%; }
    .laptop .base::after { content: ''; position: absolute; left: 50%; top: 0; width: 88px; height: 5px; transform: translateX(-50%); border-radius: 0 0 6px 6px; background: #8b8b91; }
    .mini-bar { display: flex; align-items: center; gap: 6px; padding: 9px 12px; background: #f1ece2; border-bottom: 1px solid #e4ded1; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #d3ccbe; }
    .mini-url { margin-left: 10px; padding: 3px 12px; border-radius: 999px; background: #fff; color: #9a9184; font-size: 10px; }
    .mini-app { padding: 14px; text-align: left; }
    .mini-nav { display: flex; align-items: center; gap: 14px; padding-bottom: 11px; border-bottom: 1px solid #ece6da; font-size: 10.5px; color: #7d7568; }
    .mini-nav strong { font-family: var(--font-heading); font-size: 14px; color: #111; }
    .mini-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 14px; }
    .mini-card { margin: 0; border: 1px solid #ece6da; border-radius: 10px; overflow: hidden; background: #fff; }
    .mini-card img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; }
    .mini-card figcaption { padding: 7px 8px; font-size: 9.5px; color: #5c5750; }

    .phone { position: absolute; right: max(2%, calc(50% - 430px)); bottom: -26px; width: 168px; border: 9px solid #1d1d1f; border-radius: 26px; background: #1d1d1f; box-shadow: 0 30px 60px -28px rgba(0,0,0,.5); }
    .phone .notch { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 56px; height: 15px; border-radius: 0 0 9px 9px; background: #1d1d1f; z-index: 2; }
    .phone .screen { border-radius: 18px; overflow: hidden; background: #fffdf8; }
    .phone-app { padding: 10px; }
    .mini-nav.small { gap: 0; padding-bottom: 8px; }
    .mini-nav.small strong { font-size: 11px; }
    .phone-hero { margin: 9px 0 0; border-radius: 9px; overflow: hidden; }
    .phone-hero img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; }
    .phone-meta { display: grid; gap: 2px; margin-top: 8px; }
    .phone-cat { font-size: 7.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #a0988a; }
    .phone-meta strong { font-size: 10.5px; }
    .phone-price { font-size: 11px; font-weight: 700; }
    .phone-cta { display: block; margin-top: 8px; padding: 6px; border-radius: 999px; background: #8e3021; color: #fff; font-size: 8.5px; font-weight: 700; text-align: center; }
    .caption { margin-top: 56px; color: #8d8577; font-size: 14px; }

    /* ---- content -------------------------------------------------------- */
    .section-title { margin: 0 0 clamp(32px, 5vw, 56px); font-family: var(--font-heading); font-weight: 600; font-size: clamp(27px, 3.6vw, 44px); letter-spacing: -.025em; }
    .claims { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: clamp(28px, 4vw, 52px); text-align: left; border-top: 1px solid #efeae0; }
    .claim kc-icon { color: #8e3021; }
    .claim h2 { margin: 14px 0 8px; font-family: var(--font-heading); font-weight: 600; font-size: 20px; letter-spacing: -.015em; }
    .claim p { margin: 0; color: #5c5750; font-size: 14.5px; line-height: 1.6; }

    .steps { border-top: 1px solid #efeae0; }
    .step-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: clamp(26px, 4vw, 48px); margin: 0; padding: 0; list-style: none; text-align: left; }
    .step-list li { display: flex; gap: 16px; }
    .num { flex: 0 0 auto; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: #111; color: #fff; font-size: 14px; font-weight: 700; }
    .step-list h3 { margin: 4px 0 7px; font-size: 17px; }
    .step-list p { margin: 0; color: #5c5750; font-size: 14px; line-height: 1.6; }

    .tools { border-top: 1px solid #efeae0; }
    .tool-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 20px; text-align: left; }
    .tool { padding: 22px; border: 1px solid #efeae0; border-radius: 16px; background: #fffdf8; }
    .tool kc-icon { color: #8e3021; }
    .tool h3 { margin: 12px 0 6px; font-size: 15.5px; }
    .tool p { margin: 0; color: #5c5750; font-size: 13.5px; line-height: 1.6; }

    .closing { border-top: 1px solid #efeae0; }
    .closing h2 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: clamp(30px, 4.6vw, 54px); letter-spacing: -.03em; }

    @media (max-width: 860px) {
      .phone { position: static; margin: 26px auto 0; width: 190px; }
      .devices { flex-direction: column; align-items: center; }
      .caption { margin-top: 30px; }
      .mini-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class SellerPage {
  private readonly router = inject(Router);

  /** Four of the seven, chosen to fit the mockup row without wrapping. */
  protected readonly previewCategories = [
    { slug: 'fashion', label: 'Fashion' },
    { slug: 'food-groceries', label: 'Food' },
    { slug: 'home-living', label: 'Home' },
    { slug: 'beauty-wellness', label: 'Beauty' },
  ];

  protected readonly claims = [
    {
      icon: 'globe',
      title: 'Found by people already shopping',
      body: 'Your storefront sits in the same marketplace buyers browse for everything else — not a page they have to be sent a link to.',
    },
    {
      icon: 'shield',
      title: 'Nothing goes live without you',
      body: 'Your products, prices, categories and contact details are yours to edit. Drafts stay drafts until you publish them.',
    },
    {
      icon: 'wallet',
      title: 'Every order in one place',
      body: 'Incoming orders, payment status and stock locations live in one workspace, so nothing is tracked in a separate notebook.',
    },
  ];

  protected readonly steps = sellerSteps;

  protected readonly workspace = [
    { icon: 'store', title: 'Your storefront', body: 'A page of your own with your name, logo, story and products.' },
    { icon: 'box', title: 'Product listings', body: 'Several photos per product, colour and size options, and stock counts.' },
    { icon: 'cart', title: 'Order management', body: 'Accept orders, mark them shipped, and see what is still waiting.' },
    { icon: 'grid', title: 'Your own categories', body: 'Group products the way your shop is actually arranged.' },
    { icon: 'truck', title: 'Stock locations', body: 'Record where each product is kept so orders are picked from the right place.' },
    { icon: 'review', title: 'Reviews', body: 'Read what buyers said and reply to them directly.' },
  ];

  protected startOnboarding(): void {
    void this.router.navigate(['/seller/onboarding']);
  }
}
