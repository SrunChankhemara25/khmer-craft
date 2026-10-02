import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CommerceApiService } from '../core/api/commerce-api.service';
import { ApiOrder } from '../core/api/api.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

const PAYMENT_LABELS: Record<string, string> = {
  COD: 'Cash on delivery',
  ABA_PAYWAY: 'ABA PayWay',
  ABA_DEMO: 'ABA (demo)',
  STRIPE_SANDBOX: 'Stripe (sandbox)',
};

/**
 * The page a buyer lands on after ordering — and, for ABA PayWay, after
 * returning from their banking app.
 *
 * It deliberately does not congratulate anyone for arriving. Reaching this
 * URL proves only that a browser followed a link: ABA's `continue_success_url`
 * and the app's return deeplink are both reachable by a buyer who abandoned
 * the payment, and either could be typed by hand. So an unpaid PayWay order
 * says so plainly and offers the way back to paying, and "paid" is shown only
 * when the server — having asked ABA — says the money arrived.
 */
@Component({
  selector: 'app-order-success',
  imports: [
    DatePipe,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
  ],
  template: `
    <app-navbar />

    <section class="container page">
      @if (loading()) {
        <div class="card state">
          <ui-icon name="loader" [size]="26" />
          <p>Loading your order…</p>
        </div>
      } @else if (error(); as message) {
        <div class="card state">
          <ui-icon name="alert-circle" [size]="26" />
          <h1>We couldn't load that order</h1>
          <p>{{ message }}</p>
          <a class="btn btn-primary" routerLink="/orders">View my orders</a>
        </div>
      } @else if (order(); as o) {
        <div class="card main">
          <div class="mark" [class.unpaid]="awaitingPayment()">
            <ui-icon
              [name]="awaitingPayment() ? 'clock' : 'check'"
              [size]="26"
              [strokeWidth]="2.6"
            />
          </div>

          <h1>{{ awaitingPayment() ? 'Order placed — not yet paid' : 'Order placed successfully' }}</h1>

          @if (awaitingPayment()) {
            <p class="lede">
              We're holding order {{ o.orderNumber }}, but ABA hasn't confirmed
              a payment for it. Nothing has been charged.
            </p>
            <a class="btn btn-primary" [routerLink]="['/checkout/pay', o.orderNumber]">
              <ui-icon name="credit-card" [size]="16" color="#fff" /> Pay now
            </a>
          } @else {
            <p class="lede">
              Thank you for supporting Cambodian artisans. The seller has been
              notified and will confirm your order shortly.
            </p>
          }

          <div class="meta">
            <div>
              <small>ORDER</small><strong>{{ o.orderNumber }}</strong>
            </div>
            <div>
              <small>DATE</small>
              <strong>{{ o.createdAt | date: 'mediumDate' }}</strong>
            </div>
            <div>
              <small>PAYMENT</small><strong>{{ paymentLabel() }}</strong>
            </div>
            <div>
              <small>STATUS</small>
              <span class="badge" [class]="badgeClass()">{{ paymentText() }}</span>
            </div>
          </div>

          <div class="summary">
            <h2>Order summary</h2>
            @for (item of o.items; track item.productId) {
              <div class="line">
                <div class="thumb">
                  @if (item.productImage) {
                    <img [src]="item.productImage" [alt]="item.productName" />
                  }
                </div>
                <div class="info">
                  <strong>{{ item.productName }}</strong>
                  <small>Qty {{ item.quantity }} · {{ item.sellerName }}</small>
                </div>
                <span class="price">\${{ item.subtotal.toFixed(2) }}</span>
              </div>
            }

            <div class="row"><span>Subtotal</span><span>\${{ o.subtotal.toFixed(2) }}</span></div>
            <div class="row">
              <span>Delivery</span>
              @if (o.deliveryFee === 0) {
                <span class="free">Free</span>
              } @else {
                <span>\${{ o.deliveryFee.toFixed(2) }}</span>
              }
            </div>
            <div class="row total">
              <span>Total</span><span>\${{ o.totalAmount.toFixed(2) }}</span>
            </div>
          </div>

          <div class="actions">
            <a class="btn btn-primary" routerLink="/orders">View my orders</a>
            <a class="btn btn-outline" routerLink="/products">Continue shopping</a>
          </div>
        </div>

        <div class="strip">
          <div class="card info-card">
            <span class="info-icon"><ui-icon name="store" [size]="18" color="var(--color-accent)" /></span>
            <strong>Straight to the artisan</strong>
            <p>Your payment reaches the seller who made these pieces, not a middleman.</p>
          </div>
          <div class="card info-card">
            <span class="info-icon"><ui-icon name="truck" [size]="18" color="var(--color-accent)" /></span>
            <strong>Delivery updates</strong>
            <p>Track this order from your orders page as the seller confirms and ships it.</p>
          </div>
          <div class="card info-card">
            <span class="info-icon"><ui-icon name="shield" [size]="18" color="var(--color-accent)" /></span>
            <strong>Buyer protection</strong>
            <p>Something wrong with your order? Reach us from the order page and we'll step in.</p>
          </div>
        </div>
      }
    </section>

    <app-footer />
  `,
  styles: [
    `
      .page {
        padding: 40px 32px 60px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 28px;
      }
      .state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 60px 32px;
        text-align: center;
        color: var(--color-muted);
        max-width: 480px;
        width: 100%;
      }
      .state h1 {
        font-size: 20px;
      }
      .main {
        max-width: 520px;
        width: 100%;
        padding: 38px;
        text-align: center;
      }
      .mark {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: var(--color-success-soft);
        color: var(--color-success);
        display: grid;
        place-items: center;
        margin: 0 auto 20px;
      }
      .mark.unpaid {
        background: var(--color-accent-soft);
        color: var(--color-accent);
      }
      h1 {
        font-size: 23px;
        margin-bottom: 12px;
      }
      .lede {
        color: var(--color-muted);
        font-size: 13.5px;
        line-height: 1.6;
        margin-bottom: 20px;
      }
      .meta {
        display: grid;
        /* Sized to content, not four equal shares: an order number is one
           unbreakable token, and an equal share is narrower than it needs. */
        grid-template-columns: repeat(4, max-content);
        justify-content: space-between;
        gap: 10px 20px;
        text-align: left;
        margin: 26px 0;
      }
      .meta small {
        display: block;
        color: var(--color-muted);
        font-size: 10px;
        margin-bottom: 3px;
        letter-spacing: 0.03em;
      }
      .meta strong {
        font-size: 13px;
        /* KC-260922-LF0748 is a code to read back, so it must never break
           across lines — the column widens to fit it instead. */
        white-space: nowrap;
      }
      .badge {
        /* Sits in a grid cell, so it needs an explicit shrink-to-fit or the
           pill stretches the full column width. */
        display: inline-block;
        width: fit-content;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 999px;
      }
      .badge-paid {
        background: var(--color-success-soft);
        color: var(--color-success);
      }
      .badge-pending {
        background: var(--color-accent-soft);
        color: var(--color-accent);
      }
      .badge-failed {
        background: var(--color-danger-soft);
        color: var(--color-danger);
      }
      .summary {
        text-align: left;
        border-top: 1px solid var(--color-border);
        padding-top: 18px;
        display: grid;
        gap: 10px;
      }
      .summary h2 {
        font-size: 13px;
        color: var(--color-muted);
      }
      .line {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .thumb {
        width: 42px;
        height: 42px;
        border-radius: var(--radius-xs);
        background: var(--color-bg-alt);
        overflow: hidden;
        flex-shrink: 0;
      }
      .thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .info strong {
        font-size: 13.5px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .info small {
        color: var(--color-muted);
        font-size: 11px;
      }
      .price {
        font-weight: 600;
        font-size: 13px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .free {
        color: var(--color-success);
        font-weight: 650;
      }
      .row.total {
        border-top: 1px solid var(--color-border);
        padding-top: 12px;
        font-weight: 700;
        font-size: 17px;
        color: var(--color-accent);
      }
      .actions {
        display: flex;
        gap: 10px;
        margin-top: 26px;
      }
      .actions .btn {
        flex: 1;
      }
      .strip {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        max-width: 900px;
        width: 100%;
      }
      .info-card {
        padding: 20px;
        text-align: left;
      }
      .info-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--color-accent-soft);
        display: grid;
        place-items: center;
      }
      .info-card strong {
        display: block;
        margin: 10px 0 5px;
        font-size: 13.5px;
      }
      .info-card p {
        font-size: 12px;
        color: var(--color-muted);
        line-height: 1.5;
      }
      @media (max-width: 700px) {
        .meta {
          grid-template-columns: repeat(2, max-content);
        }
        .strip {
          grid-template-columns: repeat(2, 1fr);
        }
        .main {
          padding: 28px 20px;
        }
      }
    `,
  ],
})
export class OrderSuccessComponent {
  private readonly api = inject(CommerceApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly order = signal<ApiOrder | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  /** An ABA order that exists but has no confirmed payment behind it. */
  protected readonly awaitingPayment = computed(() => {
    const o = this.order();
    return (
      !!o && o.paymentMethod === 'ABA_PAYWAY' && o.paymentStatus !== 'PAID'
    );
  });

  protected readonly paymentLabel = computed(
    () => PAYMENT_LABELS[this.order()?.paymentMethod ?? ''] ?? '—',
  );

  protected readonly paymentText = computed(() => {
    const o = this.order();
    if (!o) {
      return '';
    }
    if (o.paymentMethod === 'COD') {
      return 'Pay on delivery';
    }
    return {
      PAID: 'Paid',
      PENDING: 'Unpaid',
      FAILED: 'Payment failed',
      REFUNDED: 'Refunded',
    }[o.paymentStatus];
  });

  protected readonly badgeClass = computed(() => {
    const o = this.order();
    if (!o || o.paymentMethod === 'COD') {
      return 'badge-pending';
    }
    return {
      PAID: 'badge-paid',
      PENDING: 'badge-pending',
      FAILED: 'badge-failed',
      REFUNDED: 'badge-failed',
    }[o.paymentStatus];
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const orderNumber = this.route.snapshot.queryParamMap.get('order') ?? '';
    if (!orderNumber) {
      this.error.set('No order was given.');
      this.loading.set(false);
      return;
    }

    try {
      let order = await firstValueFrom(this.api.getOrder(orderNumber));

      // The buyer may have arrived here straight from the ABA app, before
      // ABA's webhook reached us (or on a dev machine, where it never will).
      // One authoritative check with ABA settles it, so what this page shows
      // is the real outcome rather than a stale PENDING.
      if (order.paymentMethod === 'ABA_PAYWAY' && order.paymentStatus !== 'PAID') {
        try {
          await firstValueFrom(this.api.paywayStatus(orderNumber));
          order = await firstValueFrom(this.api.getOrder(orderNumber));
        } catch {
          // Leave the order as fetched: showing it as unpaid is the safe
          // reading, and the orders page will settle it on a later visit.
        }
      }

      this.order.set(order);
    } catch (error: unknown) {
      const body = (error as { error?: { error?: { message?: string } } })
        ?.error;
      this.error.set(
        body?.error?.message ??
          'You may need to sign in again to see this order.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
