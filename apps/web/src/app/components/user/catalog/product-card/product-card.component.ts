import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../../core/cart/cart.service';
import { WishlistService } from '../../../../core/wishlist/wishlist.service';
import { Product } from '../../../../core/catalog/catalog.models';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * The single product card used on the homepage, products page, wishlist,
 * store pages and related-products rows.
 *
 * Card behaviour, per spec: the whole card opens the detail page, but the
 * wishlist and cart buttons must not trigger that navigation — hence the
 * explicit stopPropagation in each handler.
 */
@Component({
  selector: 'app-product-card',
  imports: [RouterLink, IconComponent],
  template: `
    <article
      class="product-card card card-hover"
      (click)="open()"
      (keydown.enter)="open()"
      tabindex="0"
      [attr.aria-label]="product().name"
    >
      <div class="thumb-wrap">
        <div class="product-thumb img-placeholder">{{ product().name }}</div>

        @if (product().status === 'out-of-stock') {
          <span class="stock-badge badge badge-neutral">Out of stock</span>
        } @else if (product().status === 'low-stock') {
          <span class="stock-badge badge badge-low-stock"
            >Only {{ product().stock }} left</span
          >
        } @else {
          <span class="stock-badge badge badge-in-stock">In stock</span>
        }

        @if (discount(); as off) {
          <span class="discount-badge badge badge-gold">-{{ off }}%</span>
        }

        <button
          type="button"
          class="wish-btn"
          [class.saved]="saved()"
          (click)="toggleWishlist($event)"
          [attr.aria-pressed]="saved()"
          [attr.aria-label]="
            saved() ? 'Remove from wishlist' : 'Save to wishlist'
          "
        >
          <ui-icon name="heart" [size]="15" [filled]="saved()" />
        </button>
      </div>

      <div class="product-body">
        <span class="tag">{{ product().categoryName }}</span>
        <h3 class="name">{{ product().name }}</h3>
        <a
          class="seller"
          [routerLink]="['/stores', product().storeId]"
          (click)="$event.stopPropagation()"
          >{{ product().sellerName }}</a
        >

        <div class="rating-row">
          <ui-icon name="star" [size]="13" [filled]="true" class="stars" />
          <span>{{ product().rating }}</span>
          <span class="count">({{ product().reviewCount }})</span>
        </div>

        <div class="price-row">
          <div class="prices">
            <span class="price">\${{ product().price.toFixed(2) }}</span>
            @if (product().compareAtPrice; as was) {
              <span class="was">\${{ was.toFixed(2) }}</span>
            }
          </div>

          <button
            type="button"
            class="cart-add"
            [disabled]="product().status === 'out-of-stock'"
            (click)="addToCart($event)"
            [attr.aria-label]="
              product().status === 'out-of-stock'
                ? 'Out of stock'
                : 'Add ' + product().name + ' to cart'
            "
          >
            <ui-icon name="cart" [size]="14" color="#fff" />
          </button>
        </div>

        @if (justAdded()) {
          <span class="added-flash" role="status">Added to cart</span>
        }
      </div>
    </article>
  `,
  styles: [
    `
      .product-card {
        display: flex;
        flex-direction: column;
        cursor: pointer;
        outline: none;
      }
      .product-card:focus-visible {
        border-color: var(--color-accent);
        box-shadow: var(--shadow-focus);
      }
      .thumb-wrap {
        position: relative;
      }
      .product-thumb {
        height: 178px;
      }
      .stock-badge {
        position: absolute;
        top: 10px;
        left: 10px;
      }
      .discount-badge {
        position: absolute;
        bottom: 10px;
        left: 10px;
      }
      .wish-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-full);
        background: rgba(255, 255, 255, 0.92);
        color: var(--color-muted);
      }
      .wish-btn:hover {
        color: var(--color-danger);
        border-color: var(--color-border-strong);
      }
      .wish-btn.saved {
        color: var(--color-danger);
        border-color: var(--color-danger);
      }
      .product-body {
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 12px 13px 14px;
      }
      .tag {
        color: var(--color-muted);
        font-size: 10.5px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .name {
        font-size: 14px;
        font-weight: 650;
        line-height: 1.35;
        /* Two-line clamp keeps every card in a row the same height. */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .seller {
        color: var(--color-muted);
        font-size: 12px;
      }
      .seller:hover {
        color: var(--color-accent);
        text-decoration: underline;
      }
      .price-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 6px;
      }
      .prices {
        display: flex;
        align-items: baseline;
        gap: 7px;
      }
      .price {
        font-size: 16px;
        font-weight: 700;
      }
      .was {
        color: var(--color-muted);
        font-size: 12.5px;
        text-decoration: line-through;
      }
      .cart-add {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: var(--radius-sm);
        background: var(--color-accent);
      }
      .cart-add:hover:not(:disabled) {
        background: var(--color-accent-hover);
      }
      .cart-add:disabled {
        background: var(--color-border-strong);
        cursor: not-allowed;
      }
      .added-flash {
        margin-top: 4px;
        color: var(--color-success);
        font-size: 11.5px;
        font-weight: 650;
      }
    `,
  ],
})
export class ProductCardComponent {
  readonly product = input.required<Product>();

  private readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);
  private readonly router = inject(Router);

  protected readonly justAdded = signal(false);

  protected readonly saved = computed(() =>
    this.wishlist.isWishlisted(this.product().id),
  );

  protected readonly discount = computed(() => {
    const { price, compareAtPrice } = this.product();
    if (!compareAtPrice || compareAtPrice <= price) {
      return null;
    }
    return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  });

  protected open(): void {
    this.router.navigate(['/product', this.product().id]);
  }

  protected toggleWishlist(event: Event): void {
    event.stopPropagation();
    this.wishlist.toggle(this.product().id);
  }

  protected async addToCart(event: Event): Promise<void> {
    event.stopPropagation();
    // Adding is a server round-trip when signed in, so this awaits rather
    // than flashing "Added" before the server has agreed.
    if (!(await this.cart.add(this.product()))) {
      return;
    }
    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 1600);
  }
}
