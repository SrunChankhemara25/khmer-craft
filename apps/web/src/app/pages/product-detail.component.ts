import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CartService } from '../core/cart/cart.service';
import { CatalogService } from '../core/catalog/catalog.service';
import { WishlistService } from '../core/wishlist/wishlist.service';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { ProductRailComponent } from '../components/user/catalog/product-rail/product-rail.component';

@Component({
  selector: 'app-product-detail',
  imports: [
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    ProductRailComponent,
  ],
  template: `
    <app-navbar />

    @if (!catalog.loaded()) {
      <section class="container missing" aria-live="polite">
        <ui-icon class="spin" name="loader" [size]="30" />
        <h1>Loading product</h1>
      </section>
    } @else if (catalog.productError()) {
      <section class="container missing" role="alert">
        <ui-icon name="alert-circle" [size]="32" />
        <h1>We couldn’t load this product</h1>
        <p>{{ catalog.productError() }}</p>
        <button class="btn btn-primary" type="button" (click)="catalog.load()">Try again</button>
      </section>
    } @else if (product(); as p) {
      <section class="container detail">
        <nav class="crumbs">
          <a routerLink="/">Home</a> <span>›</span>
          <a routerLink="/products">Products</a> <span>›</span>
          <a routerLink="/products" [queryParams]="{ category: p.categorySlug }">{{
            p.categoryName
          }}</a>
          <span>›</span> <span>{{ p.name }}</span>
        </nav>

        <div class="product-layout">
          <div class="gallery">
            @if (p.image) {
              <img class="main-image product-photo" [src]="p.image" [alt]="p.name" />
            } @else {
              <div class="main-image img-placeholder">{{ p.name }}</div>
            }
          </div>

          <div class="info">
            <span class="badge badge-soft">{{ p.categoryName }}</span>
            <h1>{{ p.name }}</h1>

            @if (p.reviewCount > 0) {
              <div class="rating-row">
                <ui-icon name="star" [size]="15" [filled]="true" class="stars" />
                <span>{{ p.rating }}</span>
                <span class="count">({{ p.reviewCount }} reviews)</span>
              </div>
            } @else {
              <div class="rating-row no-reviews">No customer reviews yet</div>
            }

            <a class="store-row card" [routerLink]="['/stores', p.storeId]">
              <div class="store-avatar img-placeholder"></div>
              <div>
                <small>Store</small>
                <strong>{{ p.sellerName }}</strong>
              </div>
              <span class="visit">Visit <ui-icon name="arrow-right" [size]="13" /></span>
            </a>

            <div class="price-block">
              <span class="price">\${{ p.price.toFixed(2) }}</span>
              @if (p.compareAtPrice; as was) {
                <span class="was">\${{ was.toFixed(2) }}</span>
                <span class="badge badge-gold">-{{ discount() }}%</span>
              }
            </div>

            <p class="desc">{{ p.description }}</p>

            <div class="purchase-info" aria-label="Order information">
              <div><ui-icon name="store" [size]="16" /><span><strong>Ships from this seller</strong><small>Items from other stores may arrive separately.</small></span></div>
              <div><ui-icon name="credit-card" [size]="16" /><span><strong>Total confirmed at checkout</strong><small>Availability and pricing are checked again before ordering.</small></span></div>
            </div>

            <div class="qty-avail-row">
              <div>
                <strong>Quantity</strong>
                <div class="qty-stepper">
                  <button
                    type="button"
                    (click)="step(-1)"
                    [disabled]="quantity() <= 1 || p.status === 'out-of-stock'"
                    aria-label="Decrease quantity"
                  >
                    <ui-icon name="minus" [size]="14" />
                  </button>
                  <span aria-live="polite">{{ quantity() }}</span>
                  <button
                    type="button"
                    (click)="step(1)"
                    [disabled]="quantity() >= p.stock"
                    aria-label="Increase quantity"
                  >
                    <ui-icon name="plus" [size]="14" />
                  </button>
                </div>
              </div>
              <div>
                <strong>Availability</strong>
                @if (p.status === 'out-of-stock') {
                  <div class="avail out">Out of stock</div>
                } @else {
                  <div class="avail">
                    <span class="dot"></span> {{ p.stock }} items in stock
                  </div>
                }
              </div>
            </div>

            <div class="buy-row">
              <button
                class="btn btn-primary btn-lg btn-block"
                [disabled]="p.status === 'out-of-stock'"
                (click)="addToCart()"
              >
                <ui-icon name="cart" [size]="16" color="#fff" />
                {{ p.status === 'out-of-stock' ? 'Out of stock' : 'Add to Cart' }}
              </button>
              <button
                class="btn btn-outline btn-lg wish"
                [class.saved]="saved()"
                (click)="toggleWishlist()"
                [attr.aria-pressed]="saved()"
                [attr.aria-label]="
                  saved() ? 'Remove from wishlist' : 'Save to wishlist'
                "
              >
                <ui-icon name="heart" [size]="16" [filled]="saved()" />
              </button>
            </div>

            @if (feedback(); as message) {
              <p class="feedback" role="status">
                <ui-icon name="check-circle" [size]="14" /> {{ message }}
                <a routerLink="/cart">View cart</a>
              </p>
            }
          </div>
        </div>
      </section>

      @if (related().length) {
        <section class="container related-section">
          <app-product-rail
            [title]="'More from ' + p.categoryName"
            [products]="related()"
            linkRoute="/products"
            [linkParams]="{ category: p.categorySlug }"
          />
        </section>
      }
    } @else {
      <section class="container missing">
        <h1>Product not found</h1>
        <p>This item may have been delisted by its seller.</p>
        <button class="btn btn-primary" routerLink="/products">
          Browse products
        </button>
      </section>
    }

    <app-footer />
  `,
  styles: [
    `
      .detail {
        padding: 26px 32px 0;
      }
      .crumbs {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 20px;
      }
      .crumbs a:hover {
        color: var(--color-accent);
      }
      .product-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
        align-items: start;
      }
      .main-image {
        height: 460px;
        border-radius: var(--radius-lg);
        font-size: 13px;
      }
      .product-photo { display: block; object-fit: contain; width: 100%; background: var(--color-bg-alt); }
      .info {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      h1 {
        font-size: 30px;
        line-height: 1.15;
      }
      .store-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        color: var(--color-text);
      }
      .store-row:hover {
        border-color: var(--color-border-strong);
      }
      .store-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .store-row small {
        display: block;
        color: var(--color-muted);
        font-size: 11.5px;
      }
      .store-row strong {
        font-size: 14px;
      }
      .visit {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--color-accent);
        font-size: 13px;
        font-weight: 600;
      }
      .price-block {
        display: flex;
        align-items: baseline;
        gap: 12px;
        margin-top: 4px;
      }
      .price {
        font-size: 32px;
        font-weight: 800;
        letter-spacing: -0.02em;
      }
      .was {
        color: var(--color-muted);
        font-size: 17px;
        text-decoration: line-through;
      }
      .desc {
        color: var(--color-text-secondary);
        font-size: 14.5px;
        line-height: 1.7;
      }
      .no-reviews { color: var(--color-muted); font-size: 12.5px; }
      .purchase-info { border-block: 1px solid var(--color-border); display: grid; gap: 10px; margin-top: 3px; padding: 12px 0; }
      .purchase-info > div { align-items: flex-start; color: var(--color-accent); display: flex; gap: 10px; }
      .purchase-info span { display: grid; gap: 2px; }
      .purchase-info strong { color: var(--color-text); font-size: 12.5px; }
      .purchase-info small { color: var(--color-muted); font-size: 11.5px; line-height: 1.4; }
      .qty-avail-row {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        margin: 10px 0 4px;
        flex-wrap: wrap;
      }
      .qty-avail-row strong {
        font-size: 13px;
      }
      .qty-stepper {
        display: flex;
        align-items: center;
        gap: 16px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        padding: 7px 14px;
        margin-top: 7px;
        width: fit-content;
      }
      .qty-stepper button {
        background: none;
        border: none;
        display: flex;
        color: var(--color-text-secondary);
      }
      .qty-stepper button:disabled {
        color: var(--color-muted-2);
        cursor: not-allowed;
      }
      .avail {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-top: 9px;
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .avail.out {
        color: var(--color-danger);
        font-weight: 600;
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--color-success);
      }
      .buy-row {
        display: flex;
        gap: 10px;
        margin-top: 8px;
      }
      .wish {
        width: 54px;
        flex-shrink: 0;
        padding: 0;
      }
      .wish.saved {
        color: var(--color-danger);
        border-color: var(--color-danger);
      }
      .feedback {
        display: flex;
        align-items: center;
        gap: 7px;
        color: var(--color-success);
        font-size: 13px;
        font-weight: 600;
      }
      .feedback a {
        color: var(--color-accent);
        text-decoration: underline;
      }
      .related-section {
        padding: 44px 32px 60px;
      }
      .related-section h2 {
        font-size: 19px;
        margin-bottom: 16px;
      }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 18px;
      }
      .missing {
        padding: 70px 32px 90px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }
      .missing > ui-icon { color: var(--color-accent); }
      .spin { animation: spin 900ms linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (max-width: 900px) {
        .product-layout {
          grid-template-columns: 1fr;
          gap: 24px;
        }
        .main-image {
          height: 320px;
        }
        .product-grid {
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
      }
      @media (max-width: 520px) {
        .product-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ProductDetailComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);

  private readonly id = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  protected readonly product = computed(() => this.catalog.productById(this.id()));
  protected readonly related = computed(() => {
    const current = this.product();
    return current ? this.catalog.related(current, 8) : [];
  });

  protected readonly quantity = signal(1);
  protected readonly feedback = signal('');

  protected readonly saved = computed(() => this.wishlist.isWishlisted(this.id()));

  protected readonly discount = computed(() => {
    const current = this.product();
    if (!current?.compareAtPrice) {
      return 0;
    }
    return Math.round(
      ((current.compareAtPrice - current.price) / current.compareAtPrice) * 100,
    );
  });

  constructor() {
    // Navigating between related products reuses this component instance, so
    // the quantity and any stale confirmation must reset when the id changes.
    effect(() => {
      this.id();
      this.quantity.set(1);
      this.feedback.set('');
    });
  }

  protected step(delta: number): void {
    const current = this.product();
    if (!current) {
      return;
    }
    this.quantity.update((value) =>
      Math.max(1, Math.min(value + delta, current.stock)),
    );
  }

  protected async addToCart(): Promise<void> {
    const current = this.product();
    if (!current) {
      return;
    }
    const units = this.quantity();
    if (!(await this.cart.add(current, units))) {
      // cart.error carries the server's reason, e.g. "Only 3 left in stock".
      this.feedback.set('');
      return;
    }
    this.feedback.set(`${units} × ${current.name} added to your cart.`);
  }

  protected toggleWishlist(): void {
    this.wishlist.toggle(this.id());
  }
}
