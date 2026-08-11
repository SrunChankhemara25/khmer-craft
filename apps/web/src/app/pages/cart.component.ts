import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiOrder } from '../core/api/api.models';
import { CommerceApiService } from '../core/api/commerce-api.service';
import { AuthService } from '../core/auth/auth.service';
import { CartService, cartErrorMessage } from '../core/cart/cart.service';
import { WishlistService } from '../core/wishlist/wishlist.service';
import { CartLine } from '../core/catalog/catalog.models';
import { NavbarComponent } from '../shared/navbar.component';
import { FooterComponent } from '../shared/footer.component';
import { IconComponent } from '../shared/icon.component';
import { OrderStatusBadgeComponent } from '../shared/order-status-badge.component';

@Component({
  selector: 'app-cart',
  imports: [
    DatePipe,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    OrderStatusBadgeComponent,
  ],
  template: `
    <app-navbar />

    @if (!cart.isEmpty()) {
      <section class="container cart-layout">
        <div class="cart-items">
          <h1>Your cart</h1>
          <p class="sub">
            {{ cart.count() }} {{ cart.count() === 1 ? 'item' : 'items' }} from
            {{ storeCount() }}
            {{ storeCount() === 1 ? 'seller' : 'sellers' }}
          </p>

          <!-- Grouped by seller: this is a multi-vendor marketplace, and items
               from different artisans ship separately. -->
          @for (group of groups(); track group.storeId) {
            <div class="store-group card">
              <a class="store-label" [routerLink]="['/stores', group.storeId]">
                <ui-icon name="store" [size]="14" /> {{ group.sellerName }}
              </a>

              @for (line of group.lines; track line.product.id) {
                <div class="cart-item">
                  <div class="item-row">
                    <a
                      class="item-thumb img-placeholder"
                      [routerLink]="['/product', line.product.id]"
                      >{{ line.product.name }}</a
                    >
                    <div class="item-main">
                      <a
                        class="item-name"
                        [routerLink]="['/product', line.product.id]"
                        >{{ line.product.name }}</a
                      >
                      <span class="item-cat">{{ line.product.categoryName }}</span>
                      <span class="unit"
                        >\${{ line.product.price.toFixed(2) }} each</span
                      >

                      <div class="qty-stepper">
                        <button
                          type="button"
                          (click)="cart.changeQuantity(line.product.id, -1)"
                          aria-label="Decrease quantity"
                        >
                          <ui-icon name="minus" [size]="13" />
                        </button>
                        <span aria-live="polite">{{ line.quantity }}</span>
                        <button
                          type="button"
                          (click)="cart.changeQuantity(line.product.id, 1)"
                          [disabled]="line.quantity >= line.product.stock"
                          aria-label="Increase quantity"
                        >
                          <ui-icon name="plus" [size]="13" />
                        </button>
                      </div>
                      @if (line.quantity >= line.product.stock) {
                        <small class="max-note"
                          >Only {{ line.product.stock }} in stock</small
                        >
                      }
                    </div>
                    <div class="item-side">
                      <span class="line-total"
                        >\${{ line.lineTotal.toFixed(2) }}</span
                      >
                      <button
                        type="button"
                        class="move"
                        (click)="moveToWishlist(line)"
                      >
                        <ui-icon name="heart" [size]="13" /> Save for later
                      </button>
                      <button
                        type="button"
                        class="remove"
                        (click)="cart.remove(line.product.id)"
                      >
                        <ui-icon name="trash" [size]="13" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <button class="btn btn-ghost btn-sm continue" routerLink="/products">
            <ui-icon name="arrow-left" [size]="14" /> Continue shopping
          </button>
        </div>

        <aside class="summary card">
          <h2>Order summary</h2>
          <div class="row">
            <span>Subtotal ({{ cart.count() }} items)</span>
            <span>\${{ cart.subtotal().toFixed(2) }}</span>
          </div>
          <div class="row">
            <span>Delivery</span>
            @if (cart.shipping() === 0) {
              <span class="free">Free</span>
            } @else {
              <span>\${{ cart.shipping().toFixed(2) }}</span>
            }
          </div>

          @if (cart.freeShippingRemaining() > 0) {
            <p class="ship-hint">
              Spend \${{ cart.freeShippingRemaining().toFixed(2) }} more for free
              delivery.
            </p>
          }

          <div class="row total">
            <span>Total</span>
            <span>\${{ cart.total().toFixed(2) }}</span>
          </div>

          <button
            class="btn btn-primary btn-block btn-lg"
            (click)="goToCheckout()"
          >
            Proceed to Checkout <ui-icon name="arrow-right" [size]="16" color="#fff" />
          </button>

          @if (!isAuthenticated()) {
            <p class="login-note">
              <ui-icon name="lock" [size]="13" />
              You'll be asked to sign in before payment.
            </p>
          }

          <div class="trust-list">
            <div><ui-icon name="shield" [size]="14" /> Secure checkout</div>
            <div><ui-icon name="truck" [size]="14" /> Free delivery over $50</div>
          </div>
        </aside>
      </section>
    } @else {
      <section class="container empty-cart">
        <div class="empty-image img-placeholder">
          <ui-icon name="cart" [size]="40" />
        </div>
        <h1>Your cart is empty</h1>
        <p>
          Browse handmade crafts, palm sugar and rice products from Cambodian
          artisans.
        </p>
        <div class="empty-actions">
          <button class="btn btn-primary btn-lg" routerLink="/products">
            Browse Products
          </button>
          @if (!wishlist.isEmpty()) {
            <button class="btn btn-outline btn-lg" routerLink="/wishlist">
              View wishlist ({{ wishlist.count() }})
            </button>
          }
        </div>
      </section>
    }

    @if (showOrderHistory()) {
      <section class="container cart-history">
        <div class="history-head">
          <div>
            <h2>Purchase history</h2>
            <p>Recent orders from this buyer account.</p>
          </div>
          @if (orderHistory().length) {
            <a class="see-orders" routerLink="/orders">
              View all <ui-icon name="arrow-right" [size]="13" />
            </a>
          }
        </div>

        @if (historyLoading()) {
          <p class="history-muted">Loading your purchase history...</p>
        } @else if (historyError(); as message) {
          <p class="history-error" role="alert">
            <ui-icon name="alert-circle" [size]="14" /> {{ message }}
          </p>
        } @else if (orderHistory().length === 0) {
          <div class="history-empty card">
            <ui-icon name="package" [size]="28" />
            <div>
              <strong>No purchase history yet</strong>
              <span>Your completed checkout orders will appear here.</span>
            </div>
          </div>
        } @else {
          <div class="history-list">
            @for (order of orderHistory(); track order.id) {
              <article class="history-order card">
                <header>
                  <div>
                    <strong>{{ order.orderNumber }}</strong>
                    <span>{{ order.createdAt | date: 'd MMM y, HH:mm' }}</span>
                  </div>
                  <div class="history-badges">
                    <app-order-status [status]="order.orderStatus" />
                    <app-order-status [status]="order.paymentStatus" />
                  </div>
                </header>

                <div class="history-summary">
                  <span>
                    {{ order.items.length }}
                    {{ order.items.length === 1 ? 'item' : 'items' }}
                  </span>
                  <strong>\${{ order.totalAmount.toFixed(2) }}</strong>
                </div>

                <div class="history-preview">
                  @for (item of order.items.slice(0, 2); track item.productId) {
                    <a [routerLink]="['/product', item.productId]">
                      {{ item.productName }}
                      <small>{{ item.quantity }} x \${{ item.price.toFixed(2) }}</small>
                    </a>
                  }
                  @if (order.items.length > 2) {
                    <span class="more-items">
                      +{{ order.items.length - 2 }} more
                    </span>
                  }
                </div>

                <button
                  type="button"
                  class="btn btn-outline btn-sm detail-toggle"
                  (click)="toggleOrderDetail(order)"
                >
                  {{ expandedOrderId() === order.id ? 'Hide detail' : 'View detail' }}
                  <ui-icon
                    [name]="expandedOrderId() === order.id ? 'chevron-up' : 'chevron-down'"
                    [size]="13"
                  />
                </button>

                @if (expandedOrderId() === order.id) {
                  <div class="history-detail">
                    <div class="detail-grid">
                      <div>
                        <small>Delivery to</small>
                        <strong>{{ order.deliveryInfo.fullName }}</strong>
                        <span>
                          {{ order.deliveryInfo.city }},
                          {{ order.deliveryInfo.province }}
                        </span>
                      </div>
                      <div>
                        <small>Payment</small>
                        <strong>{{ order.paymentMethod }}</strong>
                        <span>
                          Delivery
                          {{
                            order.deliveryFee === 0
                              ? 'free'
                              : '$' + order.deliveryFee.toFixed(2)
                          }}
                        </span>
                      </div>
                    </div>

                    <div class="detail-items">
                      @for (item of order.items; track item.productId) {
                        <div class="detail-item">
                          <a
                            class="detail-thumb img-placeholder"
                            [routerLink]="['/product', item.productId]"
                          >
                            {{ item.productName }}
                          </a>
                          <div>
                            <a
                              class="detail-name"
                              [routerLink]="['/product', item.productId]"
                            >
                              {{ item.productName }}
                            </a>
                            <span>{{ item.sellerName }}</span>
                          </div>
                          <strong>\${{ item.subtotal.toFixed(2) }}</strong>
                        </div>
                      }
                    </div>

                    @if (order.statusHistory.length) {
                      <div class="detail-timeline">
                        @for (event of order.statusHistory; track $index) {
                          <span>
                            {{ event.status }}
                            <small>{{ event.at | date: 'd MMM HH:mm' }}</small>
                          </span>
                        }
                      </div>
                    }
                  </div>
                }
              </article>
            }
          </div>
        }
      </section>
    }

    <app-footer />
  `,
  styles: [
    `
      .cart-layout {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 32px;
        padding: 32px 32px 44px;
        align-items: start;
      }
      .cart-items h1 {
        font-size: 25px;
        margin-bottom: 6px;
      }
      .sub {
        color: var(--color-muted);
        font-size: 13.5px;
        margin-bottom: 18px;
      }
      .store-group {
        padding: 16px 18px;
        margin-bottom: 14px;
      }
      .store-label {
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
      }
      .store-label:hover {
        color: var(--color-accent);
      }
      .cart-item + .cart-item {
        border-top: 1px solid var(--color-border);
        margin-top: 14px;
        padding-top: 14px;
      }
      .item-row {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }
      .item-thumb {
        width: 92px;
        height: 92px;
        border-radius: var(--radius-sm);
        flex-shrink: 0;
        font-size: 10px;
        text-align: center;
      }
      .item-main {
        display: flex;
        flex-direction: column;
        gap: 3px;
        flex: 1;
      }
      .item-name {
        font-size: 14.5px;
        font-weight: 650;
      }
      .item-name:hover {
        color: var(--color-accent);
      }
      .item-cat {
        color: var(--color-muted);
        font-size: 12px;
      }
      .unit {
        color: var(--color-text-secondary);
        font-size: 12.5px;
      }
      .qty-stepper {
        display: flex;
        align-items: center;
        gap: 13px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-xs);
        padding: 5px 11px;
        width: fit-content;
        margin-top: 6px;
      }
      .qty-stepper button {
        background: none;
        border: 0;
        display: flex;
        color: var(--color-text-secondary);
      }
      .qty-stepper button:disabled {
        color: var(--color-muted-2);
        cursor: not-allowed;
      }
      .max-note {
        color: var(--color-gold);
        font-size: 11.5px;
        margin-top: 3px;
      }
      .item-side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }
      .line-total {
        font-size: 16px;
        font-weight: 700;
      }
      .move,
      .remove {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: 0;
        background: none;
        font-size: 12px;
        padding: 0;
      }
      .move {
        color: var(--color-muted);
      }
      .move:hover {
        color: var(--color-danger);
      }
      .remove {
        color: var(--color-danger);
      }
      .remove:hover {
        text-decoration: underline;
      }
      .continue {
        margin-top: 6px;
      }
      .summary {
        padding: 20px 22px;
        display: flex;
        flex-direction: column;
        gap: 11px;
        position: sticky;
        top: 100px;
      }
      .summary h2 {
        font-size: 16px;
        margin-bottom: 4px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        font-size: 13.5px;
        color: var(--color-text-secondary);
      }
      .free {
        color: var(--color-success);
        font-weight: 650;
      }
      .ship-hint {
        color: var(--color-muted);
        font-size: 12px;
        line-height: 1.5;
      }
      .row.total {
        color: var(--color-text);
        font-weight: 700;
        font-size: 18px;
        border-top: 1px solid var(--color-border);
        padding-top: 14px;
        margin-top: 4px;
      }
      .login-note {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--color-muted);
        font-size: 12px;
      }
      .trust-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
        margin-top: 6px;
        padding-top: 14px;
        border-top: 1px solid var(--color-border);
        color: var(--color-muted);
        font-size: 12.5px;
      }
      .trust-list div {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .empty-cart {
        text-align: center;
        padding: 70px 32px 90px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .empty-image {
        width: 180px;
        height: 180px;
        border-radius: 50%;
        margin-bottom: 28px;
        color: var(--color-muted-2);
      }
      .empty-cart h1 {
        font-size: 27px;
        margin-bottom: 12px;
      }
      .empty-cart p {
        color: var(--color-muted);
        font-size: 14px;
        max-width: 420px;
        margin-bottom: 26px;
        line-height: 1.6;
      }
      .empty-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .cart-history {
        padding: 0 32px 26px;
      }
      .history-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 18px;
        margin-bottom: 16px;
      }
      .history-head h2 {
        font-size: 21px;
        margin-bottom: 5px;
      }
      .history-head p,
      .history-muted {
        color: var(--color-muted);
        font-size: 13px;
      }
      .see-orders {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--color-text-secondary);
        font-size: 13px;
        font-weight: 700;
      }
      .see-orders:hover {
        color: var(--color-accent);
      }
      .history-error {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: var(--color-danger);
        font-size: 13px;
        font-weight: 700;
      }
      .history-empty {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 18px 20px;
        color: var(--color-muted);
      }
      .history-empty strong {
        display: block;
        color: var(--color-text);
        margin-bottom: 3px;
      }
      .history-empty span {
        font-size: 13px;
      }
      .history-list {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
      .history-order {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 13px;
      }
      .history-order header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .history-order header strong {
        display: block;
        font-size: 14px;
      }
      .history-order header span {
        color: var(--color-muted);
        font-size: 12px;
      }
      .history-badges {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 6px;
      }
      .history-summary {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
        font-size: 13px;
        color: var(--color-muted);
      }
      .history-summary strong {
        color: var(--color-text);
        font-size: 16px;
      }
      .history-preview {
        display: grid;
        gap: 8px;
      }
      .history-preview a,
      .more-items {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: var(--color-text-secondary);
        font-size: 12.5px;
      }
      .history-preview a:hover,
      .detail-name:hover {
        color: var(--color-accent);
      }
      .history-preview small,
      .more-items {
        color: var(--color-muted);
      }
      .detail-toggle {
        align-self: flex-start;
      }
      .history-detail {
        display: grid;
        gap: 14px;
        padding-top: 14px;
        border-top: 1px solid var(--color-border);
      }
      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .detail-grid div {
        display: grid;
        gap: 3px;
      }
      .detail-grid small {
        color: var(--color-muted);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .detail-grid strong {
        font-size: 13px;
      }
      .detail-grid span {
        color: var(--color-muted);
        font-size: 12px;
      }
      .detail-items {
        display: grid;
        gap: 10px;
      }
      .detail-item {
        display: grid;
        grid-template-columns: 44px 1fr auto;
        align-items: center;
        gap: 10px;
      }
      .detail-thumb {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-xs);
        font-size: 7px;
      }
      .detail-item div {
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      .detail-name {
        font-size: 12.5px;
        font-weight: 700;
      }
      .detail-item span {
        color: var(--color-muted);
        font-size: 11.5px;
      }
      .detail-item strong {
        font-size: 12.5px;
      }
      .detail-timeline {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        color: var(--color-muted);
        font-size: 11px;
      }
      .detail-timeline span {
        display: inline-flex;
        gap: 4px;
      }
      @media (max-width: 900px) {
        .cart-layout {
          grid-template-columns: 1fr;
        }
        .summary {
          position: static;
        }
        .history-list {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 560px) {
        .cart-layout,
        .cart-history {
          padding-left: 20px;
          padding-right: 20px;
        }
        .item-row {
          flex-wrap: wrap;
        }
        .item-side {
          align-items: flex-start;
          flex-direction: row;
          gap: 14px;
          width: 100%;
        }
        .history-head,
        .history-order header,
        .history-preview a,
        .more-items {
          align-items: flex-start;
          flex-direction: column;
        }
        .history-badges {
          justify-content: flex-start;
        }
        .detail-grid {
          grid-template-columns: 1fr;
        }
        .detail-item {
          grid-template-columns: 40px 1fr;
        }
        .detail-item strong {
          grid-column: 2;
        }
      }
    `,
  ],
})
export class CartComponent {
  protected readonly cart = inject(CartService);
  protected readonly wishlist = inject(WishlistService);
  private readonly auth = inject(AuthService);
  private readonly api = inject(CommerceApiService);
  private readonly router = inject(Router);

  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly showOrderHistory = computed(
    () => this.auth.user()?.role === 'BUYER',
  );
  protected readonly orderHistory = signal<ApiOrder[]>([]);
  protected readonly historyLoading = signal(false);
  protected readonly historyError = signal('');
  protected readonly expandedOrderId = signal('');

  constructor() {
    this.auth.loadCurrentUser().subscribe((user) => {
      if (user?.role === 'BUYER') {
        void this.loadOrderHistory();
      }
    });
  }

  /** Cart lines bucketed by seller, preserving first-seen store order. */
  protected readonly groups = computed(() => {
    const buckets = new Map<
      string,
      { storeId: string; sellerName: string; lines: CartLine[] }
    >();

    for (const line of this.cart.lines()) {
      const key = line.product.storeId;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.lines.push(line);
      } else {
        buckets.set(key, {
          storeId: key,
          sellerName: line.product.sellerName,
          lines: [line],
        });
      }
    }

    return [...buckets.values()];
  });

  protected readonly storeCount = computed(() => this.groups().length);

  protected moveToWishlist(line: CartLine): void {
    if (!this.wishlist.isWishlisted(line.product.id)) {
      this.wishlist.toggle(line.product.id);
    }
    this.cart.remove(line.product.id);
  }

  protected goToCheckout(): void {
    // The route guard also enforces this, but redirecting here keeps the
    // returnUrl pointing at checkout rather than the cart.
    this.router.navigate(['/checkout']);
  }

  protected toggleOrderDetail(order: ApiOrder): void {
    this.expandedOrderId.update((id) => (id === order.id ? '' : order.id));
  }

  private async loadOrderHistory(): Promise<void> {
    if (this.historyLoading()) {
      return;
    }

    this.historyLoading.set(true);
    this.historyError.set('');
    try {
      const response = await firstValueFrom(this.api.myOrders(1, 3));
      this.orderHistory.set(response.orders);
    } catch (error: unknown) {
      this.historyError.set(cartErrorMessage(error));
    } finally {
      this.historyLoading.set(false);
    }
  }
}
