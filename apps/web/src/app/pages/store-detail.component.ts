import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CatalogService } from '../core/catalog/catalog.service';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { ProductCardComponent } from '../components/user/catalog/product-card/product-card.component';

@Component({
  selector: 'app-store-detail',
  imports: [RouterLink, NavbarComponent, FooterComponent, IconComponent, ProductCardComponent],
  template: `
    <app-navbar />

    @if (store(); as s) {
      <main>
        <section class="store-intro">
          <div class="container">
            <nav class="crumbs">
              <a routerLink="/">Home</a><span>/</span>
              <a routerLink="/stores">Stores</a><span>/</span>
              <span>{{ s.name }}</span>
            </nav>

            <div class="store-banner" [class.fashion-store]="s.id === 's006'" [class.fruit-store]="s.id === 's007'">
              @if (s.id === 's006' || s.id === 's007') {
                <div class="campaign-copy">
                  <span>{{ s.id === 's006' ? 'New Khmer collection' : 'Farm fresh every morning' }}</span>
                  <h1>{{ s.id === 's006' ? 'Cambodian craft, modern style.' : 'Fresh from the Mekong.' }}</h1>
                  <p>{{ s.id === 's006' ? 'Contemporary silhouettes shaped by Khmer textiles.' : 'Seasonal Cambodian fruit selected at peak freshness.' }}</p>
                  <a class="btn btn-primary" href="#products" (click)="scrollToSection('products', $event)">Shop collection <ui-icon name="arrow-right" [size]="14" /></a>
                </div>
              }
              <div class="identity" [class.campaign-identity]="s.id === 's006' || s.id === 's007'">
                <div class="store-logo">{{ initials(s.name) }}</div>
                <div class="identity-copy">
                  <span class="verified"><ui-icon name="check-circle" [size]="13" /> Verified seller</span>
                  <h1>{{ s.name }}</h1>
                  <p>{{ s.description }}</p>
                  <div class="meta">
                    <span><ui-icon name="map-pin" [size]="14" /> {{ s.location }}</span>
                    <span><ui-icon name="star" [size]="14" [filled]="true" /> {{ s.rating }} · {{ s.reviewCount }} reviews</span>
                    <span><ui-icon name="package" [size]="14" /> {{ products().length }} products</span>
                  </div>
                </div>
              </div>

              <div class="store-actions" [class.campaign-actions]="s.id === 's006' || s.id === 's007'">
                <a class="btn btn-primary" href="#products" (click)="scrollToSection('products', $event)">Shop store</a>
                <button type="button" class="btn btn-outline"><ui-icon name="heart" [size]="15" /> Follow</button>
              </div>
            </div>
          </div>
        </section>

        <nav class="store-nav" aria-label="Store navigation">
          <div class="container store-nav-inner">
            <button type="button" [class.active]="activeSection() === 'products'" (click)="scrollToSection('products')">Products</button>
            <button type="button" [class.active]="activeSection() === 'about'" (click)="scrollToSection('about')">About</button>
            <button type="button" [class.active]="activeSection() === 'reviews'" (click)="scrollToSection('reviews')">Reviews</button>
            <span class="store-status"><i></i> Accepting orders</span>
          </div>
        </nav>

        <section class="container products-section" id="products">
          <header class="products-head">
            <div>
              <span class="eyebrow">Store collection</span>
              <h2>Shop {{ s.name }}</h2>
            </div>
            <span>{{ filteredProducts().length }} items</span>
          </header>

          @if (categories().length > 1) {
            <div class="category-tabs" aria-label="Product categories">
              <button [class.active]="!activeCategory()" (click)="activeCategory.set(null)">All products <span>{{ products().length }}</span></button>
              @for (category of categories(); track category) {
                <button [class.active]="activeCategory() === category" (click)="activeCategory.set(category)">
                  {{ category }} <span>{{ countCategory(category) }}</span>
                </button>
              }
            </div>
          }

          @if (filteredProducts().length) {
            <div class="product-grid">
              @for (product of filteredProducts(); track product.id) {
                <app-product-card [product]="product" />
              }
            </div>
          } @else {
            <div class="empty"><ui-icon name="package" [size]="28" /><p>No products are listed in this category yet.</p></div>
          }
        </section>

        <section class="container about-section" id="about">
          <div class="story">
            <span class="eyebrow">Behind the store</span>
            <h2>Made with purpose in {{ s.location }}</h2>
            <p>{{ s.description }} Every order supports independent Cambodian producers and helps traditional knowledge remain economically sustainable.</p>
          </div>
          <div class="facts">
            <div><span>01</span><strong>Authentic origin</strong><small>Made and sourced in Cambodia</small></div>
            <div><span>02</span><strong>Direct from maker</strong><small>Your purchase supports the workshop</small></div>
            <div><span>03</span><strong>KhmerCraft protected</strong><small>Secure marketplace checkout</small></div>
          </div>
        </section>

        <section class="container reviews-section" id="reviews">
          <div><span class="rating-number">{{ s.rating }}</span><span class="stars">★★★★★</span><small>Based on {{ s.reviewCount }} customer reviews</small></div>
          <blockquote>“Beautifully made, carefully packed, and even better knowing it came directly from a Cambodian maker.”</blockquote>
        </section>
      </main>
    } @else {
      <section class="container missing">
        <h1>Store not found</h1>
        <p>That store may have closed or the link may be out of date.</p>
        <a class="btn btn-primary" routerLink="/stores">Browse all stores</a>
      </section>
    }

    <app-footer />
  `,
  styles: [`
    .store-intro { padding: 10px 0 12px; background: #f7f2e9; }
    .crumbs { display: flex; gap: 7px; margin-bottom: 9px; color: var(--color-muted); font-size: 10.5px; }
    .crumbs a:hover { color: var(--color-accent); }
    .store-banner { display: flex; align-items: center; justify-content: space-between; gap: 22px; min-height: 150px; padding: clamp(18px, 2.1vw, 26px); border: 1px solid var(--color-border); border-radius: 18px; background: var(--color-surface); box-shadow: 0 10px 30px rgba(64,47,29,.045); }
    .store-banner.fashion-store, .store-banner.fruit-store { position: relative; align-items: flex-end; min-height: clamp(240px,22vw,340px); overflow: hidden; padding: clamp(22px,2.6vw,38px); background-position: center; background-size: cover; }
    .store-banner.fashion-store { background-image: url('/assets/stores/khmer-style-hero.png'); }
    .store-banner.fruit-store { background-image: url('/assets/stores/cambodia-fruits-hero.png'); }
    .campaign-copy { position: relative; z-index: 2; align-self: center; width: min(47%,610px); }
    .campaign-copy > span { color: var(--color-accent); font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    .campaign-copy h1 { max-width: 12em; margin-top: 8px; font-size: clamp(28px,3vw,46px); line-height: 1.04; }
    .campaign-copy p { max-width: 30em; margin: 10px 0 16px; color: var(--color-text-secondary); line-height: 1.6; }
    .campaign-identity { position: absolute; z-index: 3; right: 22px; bottom: 18px; gap: 12px; padding: 12px 15px; border: 1px solid rgba(255,255,255,.6); border-radius: 16px; background: rgba(255,253,248,.86); backdrop-filter: blur(14px); }
    .campaign-identity .store-logo { width: 54px; border-radius: 14px; font-size: 17px; }
    .campaign-identity .identity-copy { gap: 3px; }
    .campaign-identity .identity-copy > p, .campaign-identity .meta { display: none; }
    .campaign-identity h1 { color: var(--color-text); font-family: var(--font-body); font-size: 14px; font-weight: 800; }
    .campaign-identity .verified { padding: 0; background: transparent; font-size: 9px; }
    .campaign-actions { display: none; }
    .identity { display: flex; align-items: center; gap: clamp(16px, 2vw, 24px); min-width: 0; }
    .store-logo { display: grid; place-items: center; width: clamp(68px, 6vw, 82px); aspect-ratio: 1; flex: 0 0 auto; border: 1px solid var(--color-border); border-radius: 19px; background: linear-gradient(145deg,#f3e7d3,#fffdf8); color: var(--color-accent); font-family: var(--font-heading); font-size: clamp(22px,2vw,28px); font-weight: 700; }
    .identity-copy { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; min-width: 0; max-width: 760px; }
    .verified { display: inline-flex; align-items: center; gap: 5px; padding: 3px 7px; border-radius: var(--radius-full); background: var(--color-success-soft); color: var(--color-success); font-size: 9.5px; font-weight: 750; }
    .identity-copy h1 { font-size: clamp(25px,2.5vw,36px); line-height: 1.05; }
    .identity-copy > p { max-width: 700px; color: var(--color-text-secondary); font-size: 12.5px; line-height: 1.45; }
    .meta { display: flex; flex-wrap: wrap; gap: 12px; color: var(--color-muted); font-size: 10.5px; }
    .meta span { display: inline-flex; align-items: center; gap: 5px; }
    .store-actions { display: flex; flex-direction: row; gap: 8px; flex: 0 0 auto; }
    .store-actions .btn { min-height: 38px; padding-inline: 17px; font-size: 12px; }
    /* Keep these section links with the store header. A floating tab bar on its
       own felt detached once the store identity and main navigation scrolled
       away. */
    .store-nav { position: relative; z-index: 20; border-bottom: 1px solid var(--color-border); background: var(--color-bg); }
    .store-nav-inner { display: flex; align-items: center; gap: 24px; min-height: 44px; }
    .store-nav button { align-self: stretch; padding: 0; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--color-muted); font-size: 12px; font-weight: 700; }
    .store-nav button:hover { color: var(--color-accent); }
    .store-nav button.active { border-color: var(--color-accent); color: var(--color-text); }
    .store-status { display: inline-flex; align-items: center; gap: 7px; margin-left: auto; color: var(--color-success); font-size: 12px; font-weight: 700; }
    .store-status i { width: 7px; height: 7px; border-radius: 50%; background: var(--color-success); }
    .products-section { padding-top: 28px; padding-bottom: 48px; }
    #products, #about, #reviews { scroll-margin-top: 92px; }
    .products-head { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .eyebrow { color: var(--color-accent); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    h2 { margin-top: 3px; font-size: clamp(23px,2.2vw,31px); }
    .products-head > span { color: var(--color-muted); font-size: 13px; }
    .category-tabs { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 18px; padding-bottom: 3px; }
    .category-tabs button { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 11px; border: 1px solid var(--color-border); border-radius: var(--radius-full); background: #fff; color: var(--color-text-secondary); font-size: 11.5px; white-space: nowrap; }
    .category-tabs button span { color: var(--color-muted); font-size: 11px; }
    .category-tabs button.active { border-color: var(--color-accent); background: var(--color-accent); color: #fff; }
    .category-tabs button.active span { color: rgba(255,255,255,.72); }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(190px,1fr)); gap: 12px; }
    .empty { display: grid; place-items: center; min-height: 240px; color: var(--color-muted); }
    .about-section { display: grid; grid-template-columns: .85fr 1.15fr; gap: clamp(40px,8vw,130px); padding-top: clamp(54px,7vw,100px); padding-bottom: clamp(54px,7vw,100px); border-top: 1px solid var(--color-border); }
    .story p { margin-top: 16px; max-width: 580px; color: var(--color-text-secondary); line-height: 1.75; }
    .facts { display: grid; gap: 0; border-top: 1px solid var(--color-border); }
    .facts > div { display: grid; grid-template-columns: 42px 1fr; padding: 20px 0; border-bottom: 1px solid var(--color-border); }
    .facts span { grid-row: 1/3; color: var(--color-accent); font-family: var(--font-heading); }
    .facts strong { font-size: 14px; }
    .facts small { margin-top: 4px; color: var(--color-muted); }
    .reviews-section { display: grid; grid-template-columns: 280px 1fr; gap: clamp(34px,7vw,100px); align-items: center; padding-top: 46px; padding-bottom: 46px; border: 1px solid var(--color-border); border-radius: 24px; background: var(--color-bg-alt); }
    .reviews-section > div { display: flex; flex-direction: column; }
    .rating-number { font-family: var(--font-heading); font-size: 52px; }
    .stars { color: var(--color-gold); letter-spacing: .08em; }
    .reviews-section small { margin-top: 7px; color: var(--color-muted); }
    blockquote { margin: 0; font-family: var(--font-heading); font-size: clamp(20px,2.5vw,34px); line-height: 1.35; }
    .missing { display: grid; place-items: center; gap: 14px; min-height: 60vh; text-align: center; }
    @media (max-width: 850px) {
      .store-banner { align-items: flex-start; flex-direction: column; }
      .store-actions { flex-direction: row; }
      .about-section, .reviews-section { grid-template-columns: 1fr; }
      .campaign-copy { width: 58%; }
    }
    @media (max-width: 560px) {
      .identity { align-items: flex-start; flex-direction: column; }
      .store-banner { padding: 22px; }
      .store-actions { width: 100%; }
      .store-actions .btn { flex: 1; }
      .store-nav-inner { gap: 18px; }
      .store-status { display: none; }
      .product-grid { grid-template-columns: 1fr; }
      .reviews-section { border-radius: 18px; }
      .store-banner.fashion-store, .store-banner.fruit-store { align-items: flex-end; min-height: 300px; background-position: 62% center; }
      .store-banner.fruit-store { background-position: 58% center; }
      .store-banner.fashion-store::after, .store-banner.fruit-store::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to top, rgba(255,253,248,.97) 0 42%, transparent 72%); }
      .campaign-copy { z-index: 2; align-self: flex-end; width: 100%; }
      .campaign-copy h1 { font-size: 30px; }
      .campaign-identity { display: none; }
    }
  `],
})
export class StoreDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  protected readonly activeCategory = signal<string | null>(null);
  protected readonly activeSection = signal<'products' | 'about' | 'reviews'>('products');
  private readonly storeId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), { initialValue: this.route.snapshot.paramMap.get('id') ?? '' });
  protected readonly store = computed(() => this.catalog.store(this.storeId()));
  protected readonly products = computed(() => this.catalog.search({ storeId: this.storeId() }));
  protected readonly categories = computed(() => [...new Set(this.products().map((product) => product.categoryName))]);
  protected readonly filteredProducts = computed(() => {
    const category = this.activeCategory();
    return category ? this.products().filter((product) => product.categoryName === category) : this.products();
  });
  protected countCategory(category: string): number { return this.products().filter((product) => product.categoryName === category).length; }
  protected initials(name: string): string { return name.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase(); }
  protected scrollToSection(
    section: 'products' | 'about' | 'reviews',
    event?: Event,
  ): void {
    event?.preventDefault();
    this.activeSection.set(section);
    document.getElementById(section)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
