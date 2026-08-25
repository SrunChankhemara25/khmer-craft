import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../../core/cart/cart.service';
import { FlyToCartService } from '../../../../core/cart/fly-to-cart.service';
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
        @if (product().image; as image) {
          <img class="product-thumb product-photo" [src]="image" [alt]="product().name" />
        } @else {
          <div class="product-thumb img-placeholder" aria-hidden="true">
            <span class="craft-mark">{{ product().name.charAt(0) }}</span>
            <span class="thumb-label">{{ product().name }}</span>
          </div>
        }

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
          [class.bounce]="wishBounce()"
          (click)="toggleWishlist($event)"
          (animationend)="wishBounce.set(false)"
          [attr.aria-pressed]="saved()"
          [attr.aria-label]="
            saved() ? 'Remove from wishlist' : 'Save to wishlist'
          "
        >
          <ui-icon name="heart" [size]="15" [filled]="saved()" />
        </button>
      </div>

      <div class="product-body">
        <div class="product-kicker">
          <span class="tag">{{ product().categoryName }}</span>
          <div class="rating-row" [attr.aria-label]="product().rating + ' out of 5 stars, ' + product().reviewCount + ' reviews'">
            <ui-icon name="star" [size]="12" [filled]="true" class="stars" />
            <span>{{ product().rating }}</span>
            <span class="count">({{ product().reviewCount }})</span>
          </div>
        </div>
        <h3 class="name">{{ product().name }}</h3>
        <a
          class="seller"
          [routerLink]="['/stores', product().storeId]"
          (click)="$event.stopPropagation()"
          >{{ product().sellerName }}</a
        >

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
            [class.popped]="justAdded()"
            [disabled]="product().status === 'out-of-stock'"
            (click)="addToCart($event)"
            [attr.aria-label]="
              product().status === 'out-of-stock'
                ? 'Out of stock'
                : 'Add ' + product().name + ' to cart'
            "
          >
            <span class="ring" aria-hidden="true"></span>
            <ui-icon [name]="justAdded() ? 'check' : 'cart'" [size]="14" color="#fff" />
            <span class="cart-label">{{ justAdded() ? 'Added' : 'Add to cart' }}</span>
          </button>
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      .product-card {
        display: flex;
        flex-direction: column;
        min-width: 0;
        height: 100%;
        cursor: pointer;
        outline: none;
      }
      .product-card:focus-visible {
        border-color: var(--color-accent);
        box-shadow: var(--shadow-focus);
      }
      .thumb-wrap {
        position: relative;
        overflow: hidden;
      }
      .product-thumb {
        aspect-ratio: 4 / 3.15;
        min-height: clamp(176px, 12vw, 222px);
        flex-direction: column;
        gap: 12px;
        transition: transform 500ms var(--ease-out);
      }
      .product-photo { width: 100%; object-fit: cover; object-position: center; display: block; }
      .product-card:hover .product-thumb {
        transform: scale(1.025);
      }
      .craft-mark {
        display: grid;
        place-items: center;
        width: clamp(48px, 4vw, 62px);
        aspect-ratio: 1;
        border: 1px solid rgba(142, 48, 33, .18);
        border-radius: 50% 50% 46% 54%;
        background: rgba(255, 253, 248, .7);
        color: var(--color-accent);
        font-family: var(--font-heading);
        font-size: clamp(23px, 2.5vw, 32px);
        box-shadow: 0 12px 32px rgba(82, 59, 34, .08);
      }
      .thumb-label {
        max-width: 76%;
        color: var(--color-text-secondary);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .09em;
        line-height: 1.4;
        text-align: center;
        text-transform: uppercase;
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
        width: 36px;
        height: 36px;
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
      /* The heart itself pops — not the button chrome around it — so the
         emotion reads on the symbol, the way a "like" button does. */
      .wish-btn.bounce ui-icon {
        display: inline-flex;
        animation: heart-pop 900ms cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes heart-pop {
        0% { transform: scale(1); }
        30% { transform: scale(1.55); }
        55% { transform: scale(0.85); }
        80% { transform: scale(1.15); }
        100% { transform: scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .wish-btn.bounce ui-icon {
          animation: none;
        }
      }
      .product-body {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 5px;
        padding: 12px 14px 13px;
      }
      .product-kicker {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .tag {
        color: var(--color-muted);
        min-width: 0;
        overflow: hidden;
        font-size: 9.5px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .rating-row {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
        gap: 4px;
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      .rating-row .stars {
        color: var(--color-gold);
      }
      .rating-row .count {
        color: var(--color-muted);
      }
      .name {
        min-height: 2.4em;
        font-family: var(--font-body);
        font-size: clamp(14px, .25vw + 12px, 16px);
        font-weight: 700;
        line-height: 1.35;
        /* Two-line clamp keeps every card in a row the same height. */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .seller {
        color: var(--color-muted);
        overflow: hidden;
        font-size: 11.5px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .seller:hover {
        color: var(--color-accent);
        text-decoration: underline;
      }
      .price-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: auto;
        padding-top: 5px;
      }
      .prices {
        display: flex;
        align-items: baseline;
        gap: 7px;
      }
      .price {
        font-size: 16px;
        font-weight: 750;
      }
      .was {
        color: var(--color-muted);
        font-size: 12.5px;
        text-decoration: line-through;
      }
      .cart-add {
        position: relative;
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 12px;
        background: var(--color-accent);
        overflow: visible;
      }
      .cart-label {
        display: none;
      }
      .cart-add:hover:not(:disabled) {
        background: var(--color-accent-hover);
      }
      .cart-add:disabled {
        background: var(--color-border-strong);
        cursor: not-allowed;
      }
      /* The pop: a quick overshoot scale so the click reads as a satisfying
         "thunk" rather than a flat state change. */
      .cart-add.popped {
        animation: cart-pop 850ms cubic-bezier(0.34, 1.56, 0.64, 1);
        background: var(--color-success, #2f7a4f);
      }
      @keyframes cart-pop {
        0% { transform: scale(1); }
        35% { transform: scale(1.35) rotate(-6deg); }
        60% { transform: scale(0.92) rotate(3deg); }
        100% { transform: scale(1) rotate(0); }
      }
      /* The ring: expands and fades outward from the button, like a small
         shockwave — this is the "surprise" cue, distinct from the pop. */
      .ring {
        position: absolute;
        inset: 0;
        border-radius: 12px;
        border: 2px solid var(--color-success, #2f7a4f);
        opacity: 0;
        pointer-events: none;
      }
      .cart-add.popped .ring {
        animation: cart-ring 950ms ease-out;
      }
      @keyframes cart-ring {
        0% { opacity: 0.9; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.9); }
      }
      @media (prefers-reduced-motion: reduce) {
        .cart-add.popped,
        .cart-add.popped .ring {
          animation: none;
        }
      }

      /* Dense catalog grid: marketplace browsing should expose more products
         per viewport than editorial rails and store showcases. */
      :host-context(.product-grid) .product-thumb {
        min-height: clamp(145px, 10vw, 180px);
      }
      :host-context(.product-grid) .product-body {
        gap: 4px;
        padding: 10px 11px 11px;
      }
      :host-context(.product-grid) .name {
        font-size: 13.5px;
      }
      :host-context(.product-grid) .seller {
        font-size: 10.5px;
      }
      :host-context(.product-grid) .price {
        font-size: 15px;
      }
      :host-context(.product-grid) .cart-add {
        width: 33px;
        height: 33px;
        border-radius: 10px;
      }
      :host-context(.product-grid) .wish-btn {
        width: 32px;
        height: 32px;
      }

      /* Category list view: a marketplace search-result row with a strong
         image column and all decision-making information beside it. Grid
         cards keep the compact vertical layout above. */
      :host-context(.product-list) .product-card {
        display: grid;
        grid-template-columns: clamp(190px, 26%, 270px) minmax(0, 1fr);
        min-height: 210px;
        height: auto;
        overflow: hidden;
      }
      :host-context(.product-list) .thumb-wrap {
        min-height: 210px;
        border-right: 1px solid var(--color-border);
        background: var(--color-bg-alt);
      }
      :host-context(.product-list) .product-thumb {
        width: 100%;
        height: 100%;
        min-height: 210px;
        aspect-ratio: auto;
      }
      :host-context(.product-list) .product-body {
        display: flex;
        justify-content: flex-start;
        gap: 8px;
        padding: clamp(18px, 2.4vw, 28px);
      }
      :host-context(.product-list) .product-kicker {
        justify-content: flex-start;
        gap: 16px;
      }
      :host-context(.product-list) .tag {
        font-size: 10px;
      }
      :host-context(.product-list) .name {
        min-height: 0;
        max-width: 760px;
        font-size: clamp(17px, 1.4vw, 21px);
        line-height: 1.3;
      }
      :host-context(.product-list) .seller {
        width: fit-content;
        font-size: 12.5px;
      }
      :host-context(.product-list) .price-row {
        justify-content: flex-start;
        gap: 24px;
        margin-top: 7px;
        padding-top: 0;
      }
      :host-context(.product-list) .price {
        font-size: 22px;
      }
      :host-context(.product-list) .cart-add {
        display: inline-flex;
        width: auto;
        min-width: 126px;
        height: 38px;
        padding: 0 16px;
        gap: 8px;
        border-radius: var(--radius-full);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
      }
      :host-context(.product-list) .cart-label {
        display: inline;
      }
      :host-context(.product-list) .wish-btn {
        width: 34px;
        height: 34px;
      }

      @media (max-width: 640px) {
        :host-context(.product-list) .product-card {
          grid-template-columns: 128px minmax(0, 1fr);
          min-height: 168px;
        }
        :host-context(.product-list) .thumb-wrap,
        :host-context(.product-list) .product-thumb {
          min-height: 168px;
        }
        :host-context(.product-list) .product-body {
          gap: 5px;
          padding: 13px;
        }
        :host-context(.product-list) .product-kicker .tag {
          display: none;
        }
        :host-context(.product-list) .name {
          font-size: 14px;
        }
        :host-context(.product-list) .price-row {
          gap: 12px;
        }
        :host-context(.product-list) .price {
          font-size: 17px;
        }
        :host-context(.product-list) .cart-add {
          min-width: 0;
          width: 36px;
          padding: 0;
        }
        :host-context(.product-list) .cart-label {
          display: none;
        }
      }
      @media (max-width: 520px) {
        .product-thumb { min-height: 190px; }
        .product-body { padding: 12px 13px 13px; }
      }
    `,
  ],
})
export class ProductCardComponent {
  readonly product = input.required<Product>();

  private readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);
  private readonly router = inject(Router);
  private readonly flyToCart = inject(FlyToCartService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly justAdded = signal(false);
  protected readonly wishBounce = signal(false);

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
    // Retrigger even on rapid re-clicks: false then true forces the
    // animation class to re-apply instead of a no-op state change.
    this.wishBounce.set(false);
    requestAnimationFrame(() => this.wishBounce.set(true));
  }

  protected async addToCart(event: Event): Promise<void> {
    event.stopPropagation();

    // Fires immediately, independent of the server round-trip below, so the
    // click feels instant instead of waiting on a network response.
    const thumb = this.host.nativeElement.querySelector('.product-thumb') as HTMLElement | null;
    const trigger = event.currentTarget as HTMLElement;
    const thumbRect = thumb?.getBoundingClientRect();
    const thumbIsVisible = Boolean(
      thumbRect &&
      thumbRect.bottom > 0 &&
      thumbRect.top < window.innerHeight &&
      thumbRect.right > 0 &&
      thumbRect.left < window.innerWidth,
    );
    // A horizontal product rail can leave the image above the sticky header
    // while its Add button is still visible. Starting at that off-screen
    // image makes the whole first half of the flight invisible, so fall back
    // to the button the shopper actually clicked.
    this.flyToCart.fly(
      this.product().image,
      thumbIsVisible && thumb ? thumb : trigger,
      this.product().name,
    );

    // Adding is a server round-trip when signed in, so this awaits rather
    // than flashing "Added" before the server has agreed.
    if (!(await this.cart.add(this.product()))) {
      return;
    }
    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 1000);
  }
}
