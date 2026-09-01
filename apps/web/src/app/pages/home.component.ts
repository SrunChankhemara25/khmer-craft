import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../core/catalog/catalog.service';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { ProductRailComponent } from '../components/user/catalog/product-rail/product-rail.component';
import { HeroSliderComponent } from '../components/user/home/hero-slider/hero-slider.component';
import { PromoImageMarqueeComponent } from '../components/user/home/promo-image-marquee/promo-image-marquee.component';
import { Product } from '../core/catalog/catalog.models';

interface CategoryShelf {
  slug: string;
  name: string;
  description: string;
  products: Product[];
  subcategories: { slug: string; name: string; count: number }[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, IconComponent, ProductRailComponent, HeroSliderComponent, PromoImageMarqueeComponent],
  template: `
  <app-navbar></app-navbar>

  <app-hero-slider />
  <app-promo-image-marquee />

  @if (catalog.productError()) {
    <section class="container catalog-notice" role="alert">
      <ui-icon name="alert-circle" [size]="18" />
      <div>
        <strong>Products are temporarily unavailable</strong>
        <span>{{ catalog.productError() }}</span>
      </div>
      <button type="button" class="btn btn-outline btn-sm" (click)="catalog.load()">
        Try again
      </button>
    </section>
  }

  <section class="container section category-section">
    <div class="section-head">
      <h2>Browse by category</h2>
      <a routerLink="/categories" class="see-all">View all <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
    </div>
    <div class="category-strip" [class.showing-popular]="showPopularCategories()">
      @if (!showPopularCategories()) {
        @for (c of categories(); track c.slug) {
          <a class="category-pill" [routerLink]="['/categories', c.slug]">
            <div class="cat-icon"><ui-icon [name]="c.icon" [size]="20" [strokeWidth]="1.6"></ui-icon></div>
            <span>{{ c.name }}</span>
            <small>{{ catalog.countByCategory(c.slug) }} products</small>
          </a>
        }
      } @else {
        @for (c of popularCategories; track c.label) {
          <a class="category-pill popular-category" routerLink="/products" [queryParams]="{ search: c.search }">
            <div class="cat-icon"><ui-icon [name]="c.icon" [size]="20" [strokeWidth]="1.6"></ui-icon></div>
            <span>{{ c.label }}</span>
          </a>
        }
      }
      <button type="button" class="category-pill more" (click)="showPopularCategories.update(value => !value)">
        <div class="cat-icon"><ui-icon [name]="showPopularCategories() ? 'arrow-left' : 'arrow-right'" [size]="18"></ui-icon></div>
        <span>{{ showPopularCategories() ? 'Main categories' : 'More categories' }}</span>
      </button>
    </div>
  </section>

  <section class="container section">
    <app-product-rail
      title="Best sellers"
      [products]="bestSellers()"
      linkRoute="/products"
      [linkParams]="{ sort: 'featured' }"
    />
  </section>

  <section class="container section">
    <app-product-rail
      title="New arrivals"
      [products]="newArrivals()"
      linkRoute="/products"
      [linkParams]="{ sort: 'newest' }"
    />
  </section>

  <section class="container section">
    <div class="section-head"><h2>Popular stores</h2><a routerLink="/stores" class="see-all">View all <ui-icon name="arrow-right" [size]="14"></ui-icon></a></div>
    <div class="stores-marquee" role="region" aria-label="Popular stores">
      <div class="stores-track">
        @for (group of [0, 1]; track group) {
          <div class="stores-row" [attr.aria-hidden]="group === 1 ? 'true' : null">
            @for (s of stores(); track s.id) {
              <a class="store-chip" [routerLink]="['/stores', s.id]" [attr.tabindex]="group === 1 ? -1 : null">
                <div class="store-logo img-placeholder">{{ initials(s.name) }}</div>
                <div class="store-info">
                  <strong>{{ s.name }}</strong>
                  <div class="rating-row">
                    @if (s.reviewCount > 0) {
                      <ui-icon name="star" [size]="12" [filled]="true" color="var(--color-gold)"></ui-icon> {{ s.rating }} ·
                    } @else {
                      New store ·
                    }
                    {{ s.location }}
                  </div>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </div>
  </section>

  @if (fashionEdit().length) {
    <section class="container section fashion-edit">
      <div class="fashion-intro">
        <span>KhmerCraft style edit</span>
        <p>Wearable pieces and accessories selected from live marketplace products.</p>
      </div>
      <app-product-rail
        title="Fashion & Accessories"
        [products]="fashionEdit()"
        variant="editorial"
        linkRoute="/products"
        linkLabel="Explore products"
      />
    </section>
  }

  @if (categoryShelves().length) {
    <section class="container section marketplace-explorer">
      <div class="marketplace-heading">
        <span class="marketplace-eyebrow">More ways to shop</span>
        <h2>Explore the marketplace</h2>
      </div>

      @for (shelf of categoryShelves(); track shelf.slug) {
        <div class="category-shelf">
          <div class="shelf-context">
            @if (shelf.subcategories.length) {
              <nav class="subcategory-links" [attr.aria-label]="shelf.name + ' subcategories'">
                @for (subcategory of shelf.subcategories; track subcategory.slug) {
                  <a
                    routerLink="/products"
                    [queryParams]="{ category: shelf.slug, subcategory: subcategory.slug }"
                  >
                    {{ subcategory.name }} <small>{{ subcategory.count }}</small>
                  </a>
                }
              </nav>
            }
          </div>
          <app-product-rail
            [title]="shelf.name"
            [products]="shelf.products"
            linkRoute="/products"
            [linkParams]="{ category: shelf.slug }"
            linkLabel="Shop department"
          />
        </div>
      }
    </section>
  }

  <section class="container section collections-section">
    <div class="section-head collections-head">
      <div>
        <h2>Shop curated collections</h2>
        <p class="collections-subtitle">Handpicked selections to help you discover the best of Cambodia.</p>
      </div>
      <a routerLink="/categories" class="see-all">View all collections <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
    </div>

    <div class="collections-grid">
      <a class="collection-tile hero-tile" routerLink="/products" [queryParams]="heroCollection.params">
        <img class="tile-image" [src]="heroCollection.image" [alt]="heroCollection.alt" loading="lazy" />
        <div class="tile-scrim"></div>
        <div class="tile-content">
          <span class="tile-badge forest"><ui-icon [name]="heroCollection.icon" [size]="12"></ui-icon> {{ heroCollection.eyebrow }}</span>
          <h3>{{ heroCollection.title }}</h3>
          <p>{{ heroCollection.description }}</p>
          <span class="tile-cta on-image">{{ heroCollection.cta }} <ui-icon name="arrow-right" [size]="14"></ui-icon></span>
        </div>
      </a>

      @for (c of sideCollections; track c.title) {
        <a class="collection-tile split-tile" [class]="c.tint" routerLink="/products" [queryParams]="c.params">
          <div class="split-copy">
            <span class="tile-badge" [class]="c.tint"><ui-icon [name]="c.icon" [size]="12"></ui-icon> {{ c.eyebrow }}</span>
            <h3>{{ c.title }}</h3>
            <p>{{ c.description }}</p>
            <span class="tile-cta" [class]="c.tint">{{ c.cta }} <ui-icon name="arrow-right" [size]="14"></ui-icon></span>
          </div>
          <div class="split-image">
            <img [src]="c.image" [alt]="c.alt" loading="lazy" />
          </div>
        </a>
      }
    </div>
  </section>

  <section class="container section purchase-confidence">
    <div class="purchase-copy">
      <span class="purchase-eyebrow">Shopping made simple</span>
      <h2>Why shop with KhmerCraft?</h2>
      <p>Local products, trusted checkout and delivery updates in one place.</p>
    </div>
    <div class="confidence-grid">
      <div class="confidence-item" *ngFor="let reason of purchaseReasons">
        <div class="confidence-icon"><ui-icon [name]="reason.icon" [size]="19" [strokeWidth]="1.7"></ui-icon></div>
        <div><strong>{{ reason.title }}</strong><small>{{ reason.desc }}</small></div>
      </div>
    </div>
  </section>

  <app-footer></app-footer>
  `,
  styles: [`
    /* The hero band now holds only the trust strip; the slider above owns the
       headline space, so the old 56px top padding just left a gap. */
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
    .hero-copy h1 { font-size: 44px; line-height: 1.1; margin: 16px 0 18px; }
    .hero-copy p { color: var(--color-muted); font-size: 15.5px; margin-bottom: 26px; max-width: 460px; line-height: 1.6; }
    .hero-actions { display: flex; gap: 12px; }
    .hero-image { height: 340px; border-radius: var(--radius-lg); }
    .section { padding: 17px 32px; }
    .catalog-notice {
      align-items: center;
      background: #fff8ed;
      border: 1px solid #ead7b7;
      border-radius: 12px;
      color: var(--color-text);
      display: flex;
      gap: 12px;
      margin-top: 18px;
      padding: 14px 18px;
    }
    .catalog-notice > ui-icon { color: #9b6517; flex: 0 0 auto; }
    .catalog-notice div { display: grid; flex: 1; gap: 2px; }
    .catalog-notice strong { font-size: 13px; }
    .catalog-notice span { color: var(--color-muted); font-size: 12px; }
    .category-section { padding-top: 22px; padding-bottom: 14px; }
    .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .section-head h2 { font-size: 22px; }
    .see-all { color: var(--color-text-secondary); font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; }
    .see-all:hover { color: var(--color-accent); }

    .category-strip { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 10px; }
    .category-pill {
      border: 1px solid var(--color-border); border-radius: 12px; padding: 12px 7px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 5px; background: #fff;
      min-height: 88px;
      transition: all var(--dur-base) var(--ease-standard);
      color: inherit;
      cursor: pointer;
      font-family: inherit;
    }
    .category-pill:hover { border-color: var(--color-border-strong); box-shadow: var(--shadow-sm); transform: translateY(-2px); }
    .category-pill.more { background: var(--color-accent); color: #fff; justify-content: center; }
    .popular-category { animation: category-in 220ms ease both; }
    @keyframes category-in { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
    .cat-icon { color: var(--color-accent); }
    .category-pill.more .cat-icon { color: #fff; }
    .category-pill span { font-size: 11px; font-weight: 650; line-height: 1.25; }
    .category-pill small { display: none; }

    .fashion-edit { padding-top: 24px; padding-bottom: 20px; }
    .fashion-intro { align-items: center; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; margin-bottom: 14px; padding-bottom: 10px; }
    .fashion-intro span { color: var(--color-accent); font-size: 9.5px; font-weight: 800; letter-spacing: .11em; text-transform: uppercase; }
    .fashion-intro p { color: var(--color-text-muted); font-size: 11.5px; margin: 0; }

    .marketplace-explorer { padding-top: 28px; }
    .marketplace-heading { border-bottom: 1px solid var(--color-border); padding-bottom: 17px; }
    .marketplace-eyebrow { color: var(--color-accent); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    .marketplace-heading h2 { font-size: clamp(26px, 2.4vw, 36px); margin-top: 5px; }
    .category-shelf { padding: 23px 0 15px; }
    .category-shelf + .category-shelf { border-top: 1px solid var(--color-border); }
    .shelf-context { align-items: center; display: flex; gap: 16px; justify-content: flex-end; margin-bottom: 7px; }
    .subcategory-links { display: flex; gap: 7px; max-width: 62%; overflow-x: auto; padding: 2px 1px 5px; scrollbar-width: none; }
    .subcategory-links::-webkit-scrollbar { display: none; }
    .subcategory-links a { align-items: center; background: var(--color-bg-alt); border: 1px solid var(--color-border); border-radius: var(--radius-full); color: var(--color-text-secondary); display: inline-flex; flex: 0 0 auto; font-size: 10.5px; font-weight: 650; gap: 6px; padding: 6px 10px; transition: border-color .2s ease, color .2s ease, background .2s ease; }
    .subcategory-links a:hover { background: #fff; border-color: var(--color-border-strong); color: var(--color-accent); }
    .subcategory-links small { color: var(--color-muted); font-size: 9.5px; }

    .scroll-row { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 10px; scroll-snap-type: x proximity; scrollbar-width: none; }
    .scroll-row::-webkit-scrollbar { display: none; }
    .product-card { min-width: 210px; flex-shrink: 0; scroll-snap-align: start; }
    .product-thumb { height: 150px; font-size: 11px; padding: 8px; }
    .product-body { padding: 14px; display: flex; flex-direction: column; gap: 4px; }
    .tag { font-size: 10px; color: var(--color-gold); font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
    .product-body h4 { font-size: 14px; }
    .store { font-size: 11.5px; color: var(--color-muted); }
    .price-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .price { font-weight: 700; }
    .cart-add { background: var(--color-accent); border: none; border-radius: var(--radius-sm); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
    .cart-add:hover { background: var(--color-accent-hover); }

    .stores-marquee { margin-inline: calc(50% - 50vw); overflow: hidden; padding-inline: max(32px, calc((100vw - var(--container-max, 1280px)) / 2)); }
    .stores-track { display: flex; width: max-content; animation: stores-marquee 48s linear infinite; will-change: transform; }
    .stores-marquee:hover .stores-track, .stores-marquee:focus-within .stores-track { animation-play-state: paused; }
    .stores-row { display: flex; flex: 0 0 auto; flex-wrap: nowrap; gap: 16px; padding-right: 16px; }
    .store-chip {
      align-items: center;
      box-sizing: border-box;
      display: flex;
      flex: 0 0 300px;
      gap: 10px;
      max-width: 300px;
      min-width: 300px;
      overflow: hidden;
      padding: 12px;
      width: 300px;
    }
    .store-chip:hover { background: var(--color-bg-alt); }
    /* min-width:0 is what actually lets this shrink inside the fixed-width
       chip — without it a long store name refuses to shrink and spills text
       into the next card instead of truncating. */
    .store-info { flex: 1 1 auto; max-width: calc(100% - 54px); min-width: 0; overflow: hidden; }
    .store-info strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .store-info .rating-row {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .store-logo { flex: 0 0 44px; width: 44px; height: 44px; border-radius: 50%; font-size: 10px; }
    @keyframes stores-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    @media (prefers-reduced-motion: reduce) { .stores-track { animation-play-state: paused; } }

    /* Shop curated collections — one hero tile (full-bleed photo) plus two
       split tiles (tinted copy panel + photo) stacked beside it. */
    .collections-head { align-items: flex-start; }
    .collections-subtitle { color: var(--color-text-muted); font-size: 13px; margin: 4px 0 0; }
    .collections-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 16px; height: 560px; }
    .collection-tile { border-radius: var(--radius-lg); display: block; overflow: hidden; position: relative; text-decoration: none; }
    .tile-image, .split-image img { height: 100%; object-fit: cover; transition: transform .5s var(--ease-out); width: 100%; }
    .collection-tile:hover .tile-image, .collection-tile:hover .split-image img { transform: scale(1.06); }
    .tile-badge { align-items: center; border-radius: var(--radius-full); display: inline-flex; font-size: 11px; font-weight: 700; gap: 6px; letter-spacing: .04em; padding: 7px 12px; text-transform: uppercase; width: max-content; }
    .tile-badge.forest { background: var(--color-forest); color: #fff; }
    .tile-badge.peach { background: var(--color-accent); color: #fff; }
    .tile-badge.sage { background: var(--color-forest); color: #fff; }
    .tile-cta { align-items: center; display: inline-flex; gap: 8px; transition: gap .25s var(--ease-standard); }
    .tile-cta ui-icon { transition: transform .25s var(--ease-standard); }
    .collection-tile:hover .tile-cta { gap: 12px; }

    /* Hero tile: full-bleed photo, dark scrim, white copy anchored bottom-left. */
    .hero-tile { grid-column: 1; grid-row: 1 / 3; }
    .hero-tile .tile-image { position: absolute; inset: 0; }
    .tile-scrim { background: linear-gradient(0deg, rgba(20, 16, 10, .78) 0%, rgba(20, 16, 10, .15) 55%, rgba(20, 16, 10, 0) 80%); inset: 0; position: absolute; }
    .tile-content { bottom: 0; color: #fff; left: 0; padding: clamp(20px, 3vw, 34px); position: absolute; right: 0; }
    .tile-content h3 { font-size: clamp(24px, 2.6vw, 34px); line-height: 1.12; margin: 14px 0 8px; }
    .tile-content p { color: rgba(255, 255, 255, .82); font-size: 13.5px; line-height: 1.5; margin: 0 0 18px; max-width: 360px; }
    .tile-cta.on-image { background: var(--color-bg); border-radius: var(--radius-sm); color: var(--color-text); font-size: 13px; font-weight: 700; padding: 11px 18px; }
    .hero-tile:hover .tile-cta.on-image ui-icon { transform: translateX(3px); }

    /* Split tiles: tinted copy panel on the left, photo bleeding in on the right. */
    .split-tile { align-items: stretch; display: flex; }
    .split-tile.peach { background: #f7ece0; }
    .split-tile.sage { background: #edf1e7; }
    .split-copy { display: flex; flex: 1 1 55%; flex-direction: column; gap: 10px; justify-content: center; padding: clamp(18px, 2.6vw, 28px); position: relative; z-index: 1; }
    .split-copy h3 { color: var(--color-text); font-size: clamp(19px, 2vw, 24px); line-height: 1.15; margin: 2px 0 0; }
    .split-copy p { color: var(--color-text-secondary); font-size: 12.5px; line-height: 1.5; margin: 0 0 4px; max-width: 220px; }
    .tile-cta.peach { background: var(--color-accent); color: #fff; }
    .tile-cta.sage { background: var(--color-forest); color: #fff; }
    .tile-cta.peach, .tile-cta.sage { border-radius: var(--radius-sm); font-size: 12.5px; font-weight: 700; padding: 10px 16px; width: max-content; }
    .split-image { flex: 1 1 45%; overflow: hidden; position: relative; }
    .split-image::before { background: inherit; content: ''; inset: 0; position: absolute; z-index: 1; }
    .split-tile.peach .split-image::before { background: linear-gradient(90deg, #f7ece0 0%, rgba(247, 236, 224, 0) 45%); }
    .split-tile.sage .split-image::before { background: linear-gradient(90deg, #edf1e7 0%, rgba(237, 241, 231, 0) 45%); }

    .purchase-confidence {
      background: var(--color-bg-alt);
      border: 1px solid var(--color-border);
      border-radius: 18px;
      margin-bottom: 0;
      margin-top: 18px;
      padding: clamp(24px, 3vw, 36px) !important;
    }
    .purchase-copy { margin-bottom: 24px; text-align: center; }
    .purchase-eyebrow { color: var(--color-accent); font-size: 10px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
    .purchase-copy h2 { color: var(--color-text); font-size: clamp(24px, 2vw, 32px); line-height: 1.1; margin: 7px 0 7px; }
    .purchase-copy p { color: var(--color-text-muted); font-size: 13px; line-height: 1.5; margin: 0; }
    .confidence-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
    .confidence-item { align-items: center; border-right: 1px solid var(--color-border); display: flex; gap: 11px; min-width: 0; padding: 3px clamp(12px, 2vw, 26px); }
    .confidence-item:first-child { padding-left: 0; }
    .confidence-item:last-child { border-right: 0; padding-right: 0; }
    .confidence-icon { align-items: center; background: var(--color-accent-soft); border-radius: 50%; color: var(--color-accent); display: flex; flex: 0 0 36px; height: 36px; justify-content: center; }
    .confidence-item strong { color: var(--color-text); display: block; font-size: 12px; }
    .confidence-item small { color: var(--color-text-muted); display: block; font-size: 10px; line-height: 1.35; margin-top: 2px; }

    @media (max-width: 980px) {
      .hero-inner { grid-template-columns: 1fr; }
      .category-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .confidence-grid { grid-template-columns: 1fr 1fr; gap: 16px 0; }
      .confidence-item:nth-child(2) { border-right: 0; }
      .confidence-item:nth-child(3) { padding-left: 0; }
      .collections-grid { gap: 12px; grid-template-columns: 1fr 1fr; height: 420px; }
      .tile-content { padding: 18px; }
      .tile-content h3 { margin: 10px 0 6px; }
      .tile-content p { display: none; }
      .split-copy { gap: 8px; padding: 16px; }
      .split-copy p { display: none; }
    }
    @media (max-width: 560px) {
      .section { padding: 14px 16px; }
      .catalog-notice { align-items: flex-start; margin-inline: 16px; padding: 13px; }
      .catalog-notice button { flex: 0 0 auto; }
      .category-strip { display: flex; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none; }
      .category-strip::-webkit-scrollbar { display: none; }
      .category-pill { flex: 0 0 112px; }
      .fashion-intro { align-items: flex-start; flex-direction: column; gap: 4px; }
      .marketplace-explorer { padding-top: 20px; }
      .marketplace-heading { padding-bottom: 13px; }
      .category-shelf { padding: 18px 0 12px; }
      .subcategory-links { margin-inline: -16px; max-width: none; padding-inline: 16px; width: calc(100% + 32px); }
      .stores-marquee { padding-inline: 16px; }
      .store-chip { flex-basis: 250px; max-width: 250px; min-width: 250px; width: 250px; }
      .purchase-confidence { padding: 22px 18px !important; }
      .purchase-copy { margin-bottom: 18px; text-align: left; }
      .confidence-grid { grid-template-columns: 1fr; gap: 0; }
      .confidence-item, .confidence-item:nth-child(3) { border-bottom: 1px solid var(--color-border); border-right: 0; padding: 12px 0; }
      .confidence-item:last-child { border-bottom: 0; }

      /* Collections become a horizontal swipe carousel instead of stacked cards. */
      .collections-head { align-items: center; }
      .collections-grid { display: flex; gap: 12px; grid-template-columns: none; height: auto; overflow-x: auto; padding-bottom: 4px; scroll-padding-left: 16px; scroll-snap-type: x mandatory; scrollbar-width: none; }
      .collections-grid::-webkit-scrollbar { display: none; }
      .hero-tile, .split-tile { flex: 0 0 82%; scroll-snap-align: start; }
      .hero-tile { grid-row: auto; height: 300px; }
      .split-tile { flex-direction: column; height: 300px; }
      .split-copy, .split-image { flex: 1 1 50%; }
      .split-copy p, .tile-content p { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
      .split-tile.peach .split-image::before { background: linear-gradient(0deg, #f7ece0 0%, rgba(247, 236, 224, 0) 35%); }
      .split-tile.sage .split-image::before { background: linear-gradient(0deg, #edf1e7 0%, rgba(237, 241, 231, 0) 35%); }
    }
  `]
})
export class HomeComponent {
  protected readonly catalog = inject(CatalogService);

  // Everything below is derived from CatalogService, so the homepage shows the
  // same catalog as the products page instead of its own hardcoded copy.
  //
  // The tiles are in stock order, not the fixture's fixed list order — an
  // empty department (Fashion & Accessories has 0 live products right now)
  // has no business leading the row a shopper sees first. Ties keep the
  // fixture's original relative order rather than reshuffling alphabetically.
  readonly categories = computed(() => {
    const withCounts = this.catalog.categories.map((category, index) => ({
      category,
      index,
      count: this.catalog.countByCategory(category.slug),
    }));
    withCounts.sort((a, b) => b.count - a.count || a.index - b.index);
    return withCounts.map((entry) => entry.category);
  });
  readonly stores = computed(() => this.catalog.allStores());
  readonly showPopularCategories = signal(false);

  readonly popularCategories = [
    { label: 'Home Decoration', search: 'home decoration', icon: 'home' },
    { label: 'Daily Supplements', search: 'daily supplements', icon: 'heart' },
    { label: 'Natural Skincare', search: 'natural skincare', icon: 'sparkles' },
    { label: 'Snacks & Dried Fruit', search: 'snacks dried fruit', icon: 'leaf' },
    { label: 'Gifts Under $20', search: 'gifts under 20', icon: 'gift' },
    { label: 'Kitchen Essentials', search: 'kitchen essentials', icon: 'store' },
    { label: 'Traditional Textiles', search: 'traditional textiles', icon: 'tag' },
  ];

  // Computed, not plain fields: the catalog arrives from the API after this
  // component is constructed, so a snapshot taken here would stay empty.
  // Rails scroll horizontally, so they take more than a grid row would.
  readonly bestSellers = computed(() => this.catalog.bestSellers(8));
  readonly newArrivals = computed(() => this.catalog.newArrivals(8));
  readonly fashionEdit = computed(() => {
    const fashionTerms = /fashion|clothing|scarf|krama|wear|jewelry|accessor|bag|hairpin|earring|necklace|bracelet|wallet|belt|shoe/i;
    return this.catalog
      .allProducts()
      .filter((product) =>
        fashionTerms.test(
          [
            product.name,
            product.categoryName,
            product.subcategory ?? '',
            product.description,
          ].join(' '),
        ),
      )
      .sort((a, b) => this.discoveryScore(b) - this.discoveryScore(a))
      .slice(0, 8);
  });

  /**
   * Department shelves are generated from live inventory—not a manually
   * repeated homepage list. Departments with no products stay out of the
   * buyer feed, the fullest departments appear first, and each row ranks
   * orderable products using sales, review confidence and recency.
   */
  readonly categoryShelves = computed<CategoryShelf[]>(() => {
    const products = this.catalog.allProducts();
    if (!products.length) return [];

    return this.categories()
      .map((category) => {
        const categoryProducts = products.filter(
          (product) => product.categorySlug === category.slug,
        );
        const rankedProducts = [...categoryProducts]
          .sort((a, b) => this.discoveryScore(b) - this.discoveryScore(a))
          .slice(0, 10);
        const subcategories = category.subcategories
          .map((subcategory) => ({
            ...subcategory,
            count: categoryProducts.filter(
              (product) => product.subcategorySlug === subcategory.slug,
            ).length,
          }))
          .filter((subcategory) => subcategory.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        return {
          slug: category.slug,
          name: category.name,
          description: category.description,
          products: rankedProducts,
          subcategories,
          inventoryCount: categoryProducts.length,
        };
      })
      .filter((shelf) => shelf.inventoryCount > 0)
      .sort((a, b) => b.inventoryCount - a.inventoryCount)
      .slice(0, 5)
      .map(({ inventoryCount: _inventoryCount, ...shelf }) => shelf);
  });

  readonly heroCollection = {
    eyebrow: 'Local pride',
    icon: 'leaf',
    title: 'Made in Cambodia',
    description: 'Support local makers and bring authentic craftsmanship home.',
    cta: 'Explore collection',
    image:
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&q=80',
    alt: 'Handwoven basket, ceramics, and woodcarving on a wooden table',
    params: { collection: 'handmade-crafts' },
  };

  readonly sideCollections = [
    {
      tint: 'peach',
      eyebrow: 'Great gifts',
      icon: 'gift',
      title: 'Gifts under $20',
      description: "Thoughtful finds that won't break the bank.",
      cta: 'Shop gifts',
      image:
        'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&q=80',
      alt: 'Wrapped gift box with ribbon',
      // 'gifts under 20' as an exact phrase matches nothing — search() does a
      // literal substring match, not fuzzy/OR — so this card would otherwise
      // land on an empty results page. 'gift' actually matches real, affordably
      // priced listings (e.g. the $14.40 Cambodian Keepsake Gift Set).
      params: { search: 'gift' },
    },
    {
      tint: 'sage',
      eyebrow: 'Just in',
      icon: 'sparkles',
      title: 'New this week',
      description: 'Fresh arrivals from our talented sellers.',
      cta: 'Discover now',
      image:
        'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=900&q=80',
      alt: 'Freshly arrived handmade ceramics',
      params: { sort: 'newest' },
    },
  ];

  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }

  private discoveryScore(product: Product): number {
    const orderable = product.status === 'out-of-stock' ? -1000 : 100;
    const sales = Math.min(product.soldCount, 500) * 0.8;
    const reviewConfidence = product.reviewCount > 0
      ? product.rating * 12 + Math.min(product.reviewCount, 100) * 0.25
      : 0;
    const ageInDays = Math.max(
      0,
      (Date.now() - new Date(product.createdAt).getTime()) / 86_400_000,
    );
    const freshness = Math.max(0, 30 - ageInDays) * 0.4;
    return orderable + sales + reviewConfidence + freshness;
  }


  purchaseReasons = [
    { icon: 'store', title: 'Local-first marketplace', desc: 'Discover Cambodian stores across many categories.' },
    { icon: 'shield', title: 'Clear order records', desc: 'Your confirmed purchases stay available in My Orders.' },
    { icon: 'package', title: 'Seller-grouped orders', desc: 'See which store is responsible for every item.' },
    { icon: 'info', title: 'Marketplace support', desc: 'Get help when an order needs attention.' }
  ];

}
