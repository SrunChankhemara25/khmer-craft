import { storeBrandColor, storeFontFamily } from '../core/catalog/store-appearance';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SellerService, StoreCollectionDTO } from '../core/api/seller.service';
import { AuthService } from '../core/auth/auth.service';
import { CatalogService } from '../core/catalog/catalog.service';
import { Title } from '@angular/platform-browser';
import { detectStoreSlugFromHost, isStoreDomainActive } from '../core/storefront/store-domain.service';
import { Product, ProductSort } from '../core/catalog/catalog.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { ProductCardComponent } from '../components/user/catalog/product-card/product-card.component';

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

const sortProducts = (products: Product[], sort: ProductSort): Product[] => {
  const sorted = [...products];
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'newest':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      return sorted.sort((a, b) => b.soldCount - a.soldCount);
  }
};

@Component({
  selector: 'app-store-detail',
  imports: [RouterLink, NavbarComponent, FooterComponent, IconComponent, ProductCardComponent],
  template: `
    <app-navbar />

    @if (!catalog.storesLoaded()) {
      <section class="container missing" aria-live="polite">
        <ui-icon class="spin" name="loader" [size]="30" />
        <h1>Loading store</h1>
      </section>
    } @else if (catalog.storeError()) {
      <section class="container missing" role="alert">
        <ui-icon name="alert-circle" [size]="32" />
        <h1>We couldn’t load this store</h1>
        <p>{{ catalog.storeError() }}</p>
        <button class="btn btn-primary" type="button" (click)="catalog.loadStores()">Try again</button>
      </section>
    } @else if (store(); as s) {
      <main class="store-theme" [attr.data-style]="s.appearance?.style" [style.--store-accent]="s.appearance ? appearanceColor(s.appearance) : null" [style.--font-body]="s.appearance ? appearanceFont(s.appearance.font) : null" [style.--font-heading]="s.appearance ? appearanceFont(s.appearance.font) : null" [style.font-family]="s.appearance ? appearanceFont(s.appearance.font) : null" [class.theme-clay]="s.theme === 'CLAY'" [class.theme-gold]="s.theme === 'GOLD'" [class.theme-midnight]="s.theme === 'MIDNIGHT'">
        <!-- A seller browsing their own storefront saw exactly what a shopper
             saw, with no way back to the dashboard and no sign of which of the
             two they were looking at. -->
        @if (isOwnStore()) {
          <div class="owner-bar">
            <span class="owner-tag"><ui-icon name="store" [size]="13" /> Your store</span>
            <span class="owner-copy">This is how shoppers see it.</span>
            <a class="owner-action" routerLink="/seller/dashboard">
              Edit in dashboard <ui-icon name="arrow-right" [size]="14" />
            </a>
          </div>
        }
        @if (s.announcement) {
          <div class="store-announcement"><ui-icon name="sparkles" [size]="14" /> {{ s.announcement }}</div>
        }
        <section class="store-intro">
          <div class="container">
            <nav class="crumbs">
              @if (!isDomainMode()) {
                <a routerLink="/">Home</a><span>/</span>
                <a routerLink="/stores">Stores</a><span>/</span>
              }
              <span>{{ s.name }}</span>
            </nav>

            <div class="store-banner" [class.has-cover]="s.bannerUrl" [style.background-image]="s.bannerUrl ? 'linear-gradient(90deg, rgba(18,28,23,.9), rgba(18,28,23,.42)), url(' + s.bannerUrl + ')' : null">
              <div class="identity">
                <div class="store-logo">
                  @if (s.logoUrl) { <img [src]="s.logoUrl" [alt]="s.name + ' logo'" /> } @else { {{ initials(s.name) }} }
                </div>
                <div class="identity-copy">
                  <span class="verified"><ui-icon name="store" [size]="13" /> {{ isDomainMode() ? 'Official Store' : 'Marketplace store' }}</span>
                  <h1>{{ s.name }}</h1>
                  <p class="store-tagline">{{ s.tagline || s.description }}</p>
                  <div class="meta">
                    <span><ui-icon name="map-pin" [size]="14" /> {{ s.location }}</span>
                    @if (s.reviewCount > 0) {
                      <span><ui-icon name="star" [size]="14" [filled]="true" /> {{ s.rating }} · {{ s.reviewCount }} reviews</span>
                    } @else {
                      <span>No customer reviews yet</span>
                    }
                    <span><ui-icon name="package" [size]="14" /> {{ products().length }} products</span>
                  </div>
                </div>
              </div>

              <div class="store-actions">
                <a class="btn btn-primary" href="#products" (click)="scrollToSection('products', $event)">Shop store</a>
                <button type="button" class="btn btn-outline" disabled title="Store following will be available when account sync is ready"><ui-icon name="heart" [size]="15" /> Follow soon</button>
              </div>
            </div>
          </div>
        </section>

        <nav class="store-nav" aria-label="Store navigation">
          <div class="container store-nav-inner">
            <button type="button" [class.active]="activeSection() === 'products'" (click)="scrollToSection('products')">Products</button>
            <button type="button" [class.active]="activeSection() === 'about'" (click)="scrollToSection('about')">About</button>
            <button type="button" [class.active]="activeSection() === 'reviews'" (click)="scrollToSection('reviews')">Reviews</button>
            <span class="store-status"><i></i> {{ products().length ? 'Products available' : 'No active listings' }}</span>
          </div>
        </nav>

        @if (featuredProducts().length) {
          <section class="container featured-section">
            <header class="products-head">
              <div><span class="eyebrow">Chosen by the seller</span><h2>Featured at {{ s.name }}</h2></div>
              <span>{{ featuredProducts().length }} picks</span>
            </header>
            <div class="product-grid featured-grid">
              @for (product of featuredProducts(); track product.id) { <app-product-card [product]="product" /> }
            </div>
          </section>
        }

        @if (storeCollections().length) {
          <section class="container collections-section" style="margin-bottom:34px;">
            <header class="products-head">
              <div>
                <span class="eyebrow">Curated Collections</span>
                <h2>Explore By Collection</h2>
              </div>
              @if (activeCollection()) {
                <button type="button" class="btn-clear-collection" (click)="clearCollectionFilter()">
                  ✕ Show All Products
                </button>
              }
            </header>
            <div class="collections-grid">
              @for (col of storeCollections(); track col.id) {
                <div class="collection-pill-card" [class.selected]="activeCollection()?.id === col.id" (click)="selectCollection(col)">
                  @if (col.coverImage) {
                    <img [src]="col.coverImage" class="col-pill-img" alt="{{ col.name }}" />
                  } @else {
                    <div class="col-pill-fallback">✦</div>
                  }
                  <div class="col-pill-content">
                    <div class="col-pill-top">
                      <span class="col-pill-name">{{ col.name }}</span>
                      <span class="col-pill-count">{{ col.productCount || col.productIds.length }} items</span>
                    </div>
                    @if (col.description) {
                      <p class="col-pill-desc">{{ col.description }}</p>
                    }
                  </div>
                  <span class="col-pill-indicator">
                    {{ activeCollection()?.id === col.id ? 'Viewing ✓' : 'Explore →' }}
                  </span>
                </div>
              }
            </div>
          </section>
        }

        <section class="container products-section" id="products">
          @if (activeCollection(); as col) {
            <div class="active-col-banner">
              <div class="active-col-info">
                <span class="col-badge">Active Collection</span>
                <h3>{{ col.name }}</h3>
                @if (col.description) {
                  <p>{{ col.description }}</p>
                }
              </div>
              <button type="button" class="btn-clear-collection" (click)="clearCollectionFilter()">
                ← Show All Store Products
              </button>
            </div>
          }
          <header class="products-head">
            <div>
              <span class="eyebrow">{{ activeCollection() ? 'Filtered Showcase' : 'Store Catalog' }}</span>
              <h2>{{ activeCollection() ? activeCollection()!.name : ('Shop ' + s.name) }}</h2>
            </div>
            <div class="products-head-controls">
              <span class="item-count">{{ filteredProducts().length }} items</span>
              <label class="sort">
                <span>Sort</span>
                <select [value]="sort()" (change)="setSort($event)">
                  @for (option of sorts; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
            </div>
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

          @if (groupedProducts().length) {
            <!-- Grouped by subcategory rather than one flat grid — a store
                 selling both shirts and shorts under one category otherwise
                 shows them interleaved in whatever order the API returned,
                 which reads as unsorted clutter rather than a real catalog. -->
            @for (group of groupedProducts(); track group.label) {
              <div class="product-group">
                @if (groupedProducts().length > 1) {
                  <h3 class="group-heading">{{ group.label }} <span>{{ group.products.length }}</span></h3>
                }
                <div class="product-grid">
                  @for (product of group.products; track product.id) {
                    <app-product-card [product]="product" />
                  }
                </div>
              </div>
            }
          } @else {
            <div class="empty"><ui-icon name="package" [size]="28" /><p>No products are listed in this category yet.</p></div>
          }
        </section>

        <section class="container about-section" id="about">
          <div class="story">
            <span class="eyebrow">Behind the store</span>
            <h2>About {{ s.name }}</h2>
            <p>{{ s.description || 'This seller has not added a full store story yet.' }}</p>
          </div>
          <div class="facts">
            <div><span>01</span><strong>Store-owned listings</strong><small>Products on this page are listed under this seller.</small></div>
            <div><span>02</span><strong>Clear order records</strong><small>Signed-in purchases appear in My Orders.</small></div>
            @if (s.showContact && s.phoneNumber) {
              <div><span>03</span><strong>Contact this store</strong><small>{{ s.phoneNumber }} · Seller chose to make this number public.</small></div>
            } @else {
              <div><span>03</span><strong>Marketplace support</strong><small>Contact KhmerCraft when an order needs attention.</small></div>
            }
          </div>
        </section>

        <section class="container reviews-section" id="reviews">
          @if (s.reviewCount > 0) {
            <div><span class="rating-number">{{ s.rating }}</span><span class="stars">★★★★★</span><small>Based on {{ s.reviewCount }} customer reviews</small></div>
            <div class="review-note"><strong>Customer review details are being connected.</strong><p>Only completed-order reviews will be labeled Verified Purchase.</p></div>
          } @else {
            <div><span class="rating-number">New</span><small>No customer reviews yet</small></div>
            <div class="review-note"><strong>Be the first to review this store’s products.</strong><p>Review eligibility will be available after a completed order.</p></div>
          }
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
    .store-theme { --store-accent: #275643; --store-soft: #e8f0eb; }
    .store-theme[data-style='warm'] { background: #fff9ee; }
    .store-theme[data-style='warm'] .store-banner { border-radius: 30px; }
    .store-theme[data-style='warm'] .store-logo { border-radius: 50%; }
    .store-theme[data-style='bold'] .store-banner { border-radius: 2px; border-bottom: 6px solid var(--store-accent); }
    .store-theme[data-style='bold'] .store-logo { border-radius: 3px; }
    .store-theme.theme-clay { --store-accent: #963827; --store-soft: #f6e9e4; }
    .store-theme.theme-gold { --store-accent: #9a691b; --store-soft: #f7efdc; }
    .store-theme.theme-midnight { --store-accent: #263750; --store-soft: #e8edf4; }
    .owner-bar { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px 12px; padding: 9px 18px; background: var(--color-forest); color: #fff; font-size: 12.5px; }
    .owner-tag { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: var(--radius-full); background: rgba(255, 255, 255, .16); font-size: 10.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
    .owner-copy { color: rgba(255, 255, 255, .82); }
    .owner-action { display: inline-flex; align-items: center; gap: 6px; color: #fff; font-weight: 700; text-decoration: none; border-bottom: 1px solid rgba(255, 255, 255, .5); }
    .owner-action:hover { border-bottom-color: #fff; }
    @media (max-width: 560px) { .owner-bar { font-size: 11.5px; padding: 8px 14px; } .owner-copy { display: none; } }
    .store-announcement { min-height: 34px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 18px; color: #fff; background: var(--store-accent); font-size: 11px; font-weight: 750; letter-spacing: .02em; text-align: center; }
    .crumbs { display: flex; gap: 7px; margin-bottom: 9px; color: var(--color-muted); font-size: 10.5px; }
    .crumbs a:hover { color: var(--color-accent); }
    .store-banner { display: flex; align-items: center; justify-content: space-between; gap: 22px; min-height: 150px; padding: clamp(18px, 2.1vw, 26px); border: 1px solid var(--color-border); border-radius: 18px; background: var(--color-surface); box-shadow: 0 10px 30px rgba(64,47,29,.045); }
    .store-banner.has-cover { min-height: clamp(210px, 22vw, 320px); color: #fff; background-position: center; background-size: cover; border: 0; }
    .store-banner.has-cover .identity-copy h1 { color: #fff; }
    .store-banner.has-cover .identity-copy > p, .store-banner.has-cover .meta { color: rgba(255,255,255,.78); }
    .store-banner.has-cover .verified { color: #fff; background: rgba(255,255,255,.16); backdrop-filter: blur(8px); }
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
    .store-logo img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
    .identity-copy { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; min-width: 0; max-width: 760px; }
    .verified { display: inline-flex; align-items: center; gap: 5px; padding: 3px 7px; border-radius: var(--radius-full); background: var(--color-success-soft); color: var(--color-success); font-size: 9.5px; font-weight: 750; }
    .store-tagline { font-size: clamp(13px, 1.3vw, 17px) !important; }
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
    .store-theme .store-nav button.active { border-color: var(--store-accent); }
    .store-status { display: inline-flex; align-items: center; gap: 7px; margin-left: auto; color: var(--color-success); font-size: 12px; font-weight: 700; }
    .store-status i { width: 7px; height: 7px; border-radius: 50%; background: var(--color-success); }
    .products-section { padding-top: 28px; padding-bottom: 48px; }
    .featured-section { padding-top: 34px; padding-bottom: 10px; }
    .featured-section .eyebrow { color: var(--store-accent); }
    .featured-grid { padding: 18px; border-radius: 18px; background: var(--store-soft); }
    #products, #about, #reviews { scroll-margin-top: 92px; }
    .products-head { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .eyebrow { color: var(--color-accent); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    h2 { margin-top: 3px; font-size: clamp(23px,2.2vw,31px); }
    .products-head-controls { display: flex; align-items: center; gap: 16px; }
    .item-count { color: var(--color-muted); font-size: 13px; white-space: nowrap; }
    .sort { display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--color-muted); }
    .sort select {
      appearance: none; -webkit-appearance: none; -moz-appearance: none;
      background: #fff;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23666666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      background-size: 14px;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      box-sizing: border-box;
      color: var(--color-text);
      cursor: pointer;
      font-size: 13.5px;
      height: 38px;
      min-height: 38px;
      outline: none;
      padding: 0 32px 0 12px;
    }
    .sort select::-ms-expand { display: none; }
    .collections-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; margin-top: 14px; }
    .collection-pill-card {
      display: flex; align-items: center; gap: 14px; padding: 12px 14px;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); cursor: pointer; transition: all .16s ease;
    }
    .collection-pill-card:hover { border-color: var(--color-accent); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
    .collection-pill-card.selected { border-color: var(--color-accent); background: var(--color-accent-soft); }
    .col-pill-img { width: 64px; height: 64px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
    .col-pill-fallback { width: 64px; height: 64px; border-radius: var(--radius-sm); background: var(--color-accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
    .col-pill-content { flex: 1; min-width: 0; }
    .col-pill-top { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
    .col-pill-name { font-size: 14px; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .col-pill-count { font-size: 11px; color: var(--color-muted); font-weight: 600; white-space: nowrap; }
    .col-pill-desc { font-size: 12px; color: var(--color-text-secondary); margin: 3px 0 0; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .col-pill-indicator { font-size: 11.5px; font-weight: 700; color: var(--color-accent); white-space: nowrap; }
    .btn-clear-collection {
      background: none; border: 1px solid var(--color-border-strong); border-radius: var(--radius-full);
      padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--color-accent); cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px; transition: all .14s ease;
    }
    .btn-clear-collection:hover { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
    .active-col-banner {
      display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;
      background: var(--color-accent-soft); border: 1px solid var(--color-accent-soft-strong);
      border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 20px;
    }
    .active-col-info h3 { margin: 2px 0 0; font-size: 16px; font-weight: 700; color: var(--color-text); }
    .active-col-info p { margin: 3px 0 0; font-size: 12.5px; color: var(--color-text-secondary); }
    .col-badge { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--color-accent); }
    /* Still scrolls when it overflows — just without a visible scrollbar
       cluttering the row underneath it. */
    .category-tabs { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 18px; padding-bottom: 3px; scrollbar-width: none; }
    .category-tabs::-webkit-scrollbar { display: none; }
    .category-tabs button { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 11px; border: 1px solid var(--color-border); border-radius: var(--radius-full); background: #fff; color: var(--color-text-secondary); font-size: 11.5px; white-space: nowrap; }
    .category-tabs button span { color: var(--color-muted); font-size: 11px; }
    .category-tabs button.active { border-color: var(--color-accent); background: var(--color-accent); color: #fff; }
    .category-tabs button.active span { color: rgba(255,255,255,.72); }
    .product-group + .product-group { margin-top: 34px; }
    .group-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-family: var(--font-body); font-size: 14px; font-weight: 750; color: var(--color-text); }
    .group-heading span { padding: 1px 8px; border-radius: var(--radius-full); background: var(--color-bg-alt); color: var(--color-muted); font-size: 11px; font-weight: 700; }
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
    .missing > ui-icon { color: var(--color-accent); }
    .spin { animation: spin 900ms linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .review-note strong { color: var(--color-text); font-size: 16px; }
    .review-note p { color: var(--color-muted); font-size: 13px; margin-top: 7px; }
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
      .products-head { flex-wrap: wrap; }
      .products-head-controls { width: 100%; justify-content: space-between; }
      .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .reviews-section { border-radius: 18px; }
      .store-banner.fashion-store, .store-banner.fruit-store { align-items: flex-end; min-height: 300px; background-position: 62% center; }
      .store-banner.fruit-store { background-position: 58% center; }
      .store-banner.fashion-store::after, .store-banner.fruit-store::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to top, rgba(255,253,248,.97) 0 42%, transparent 72%); }
      .campaign-copy { z-index: 2; align-self: flex-end; width: 100%; }
      .campaign-copy h1 { font-size: 30px; }
      .campaign-identity { display: none; }
    }
    @media (max-width: 370px) { .product-grid { grid-template-columns: 1fr; } }
  `],
})
export class StoreDetailComponent {
  protected readonly appearanceColor = storeBrandColor;
  protected readonly appearanceFont = storeFontFamily;
  private readonly route = inject(ActivatedRoute);
  protected readonly catalog = inject(CatalogService);
  private readonly auth = inject(AuthService);
  private readonly sellers = inject(SellerService);
  private readonly titleService = inject(Title);
  protected readonly isDomainMode = signal<boolean>(isStoreDomainActive());
  private readonly hostSlug = detectStoreSlugFromHost();
  protected readonly activeCategory = signal<string | null>(null);
  protected readonly activeSection = signal<'products' | 'about' | 'reviews'>('products');
  protected readonly storeCollections = signal<StoreCollectionDTO[]>([]);
  protected readonly activeCollection = signal<StoreCollectionDTO | null>(null);
  private readonly storeId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') || this.hostSlug || '')),
    { initialValue: this.route.snapshot.paramMap.get('id') || this.hostSlug || '' }
  );
  protected readonly store = computed(() => this.catalog.store(this.storeId()));
  private readonly loadedStoreProducts = signal<ReturnType<CatalogService['allProducts']>>([]);
  protected readonly products = computed(() => this.loadedStoreProducts());
  protected readonly featuredProducts = computed(() => {
    const ids = new Set(this.store()?.featuredProductIds ?? []);
    return this.products().filter((product) => ids.has(product.id));
  });
  protected readonly categories = computed(() => [...new Set(this.products().map((product) => product.categoryName))]);
  protected readonly sorts = SORTS;
  protected readonly sort = signal<ProductSort>('featured');
  protected readonly filteredProducts = computed(() => {
    let scoped = this.products();
    const col = this.activeCollection();
    if (col && col.productIds && col.productIds.length > 0) {
      const colIdSet = new Set(col.productIds);
      scoped = scoped.filter((product) => colIdSet.has(product.id));
    }
    const category = this.activeCategory();
    if (category) {
      scoped = scoped.filter((product) => product.categoryName === category);
    }
    return sortProducts(scoped, this.sort());
  });
  /**
   * Split into subcategory groups so shirts and shorts (say) don't end up
   * interleaved in one grid — but only when there is actually more than one
   * subcategory to separate, so a single-subcategory store still gets one
   * plain grid instead of a pointless single heading.
   */
  protected readonly groupedProducts = computed(() => {
    const products = this.filteredProducts();
    const buckets = new Map<string, Product[]>();
    for (const product of products) {
      const label = product.subcategory ?? 'More from this store';
      const bucket = buckets.get(label);
      if (bucket) bucket.push(product);
      else buckets.set(label, [product]);
    }
    const groups = [...buckets.entries()].map(([label, items]) => ({ label, products: items }));
    if (groups.length <= 1) {
      return products.length ? [{ label: 'All', products }] : [];
    }
    // "More from this store" (products with no subcategory at all) reads
    // better trailing the named groups than leading them.
    return groups.sort((a, b) =>
      a.label === 'More from this store' ? 1 : b.label === 'More from this store' ? -1 : a.label.localeCompare(b.label),
    );
  });
  private lastRequestedStoreId = '';

  /**
   * Whether the visitor owns the store they are looking at.
   *
   * Presentation only — it reveals nothing a shopper cannot already see, and
   * every action it offers is re-checked against the authenticated seller on
   * the server (findOwnedStore). Resolved from the seller's own store list
   * rather than any id in the URL, so a crafted link cannot fake ownership.
   */
  protected readonly isOwnStore = computed(() => {
    const storeId = this.store()?.id;
    return Boolean(storeId && this.ownedStoreIds().includes(storeId));
  });
  private readonly ownedStoreIds = signal<string[]>([]);

  constructor() {
    effect(() => {
      const s = this.store();
      if (s?.name) {
        this.titleService.setTitle(s.name + (this.isDomainMode() ? ' — Official Store' : ' | KhmerCraft'));
      }
    });

    // Only sellers have stores to own, so anonymous and buyer visitors never
    // pay for this request.
    effect(() => {
      const role = this.auth.user()?.role;
      if ((role !== 'SELLER' && role !== 'ADMIN') || this.ownedStoresRequested) return;
      this.ownedStoresRequested = true;
      this.sellers.getMyStores().subscribe({
        next: (stores) => this.ownedStoreIds.set(stores.map((store) => store.id)),
        error: () => this.ownedStoreIds.set([]),
      });
    });

    effect(() => {
      const storeId = this.store()?.id ?? '';
      if (!storeId || storeId === this.lastRequestedStoreId) return;
      this.lastRequestedStoreId = storeId;
      // Start with any already-loaded catalogue entries, then replace them
      // with the complete store-scoped result as soon as it arrives.
      this.loadedStoreProducts.set(this.catalog.search({ storeId }));
      void this.catalog.productsForStore(storeId).then((products) => {
        if (this.lastRequestedStoreId === storeId) this.loadedStoreProducts.set(products);
      }).catch(() => {
        // Keep the safe partial catalogue already on screen; global catalogue
        // errors are rendered by the existing marketplace error state.
      });

      this.sellers.getPublicStoreCollections(storeId).subscribe({
        next: (cols) => {
          this.storeCollections.set(cols);
          const targetColId = this.route.snapshot.queryParamMap.get('collection');
          if (targetColId) {
            const found = cols.find((c) => c.id === targetColId || c.slug === targetColId);
            if (found) this.activeCollection.set(found);
          }
        },
        error: () => this.storeCollections.set([]),
      });
    });
  }
  private ownedStoresRequested = false;

  protected selectCollection(col: StoreCollectionDTO): void {
    if (this.activeCollection()?.id === col.id) {
      this.activeCollection.set(null);
    } else {
      this.activeCollection.set(col);
      this.activeSection.set('products');
      document.getElementById('products')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  protected clearCollectionFilter(): void {
    this.activeCollection.set(null);
  }

  protected countCategory(category: string): number { return this.products().filter((product) => product.categoryName === category).length; }
  protected setSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as ProductSort);
  }
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

