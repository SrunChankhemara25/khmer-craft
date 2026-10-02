import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CommerceApiService } from '../core/api/commerce-api.service';
import { ApiPaywayCheckoutSession } from '../core/api/api.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { PaywayQrComponent } from '../components/shared/payments/payway-qr/payway-qr.component';
import { PaymentPoller } from '../core/payments/payment-poller';

/**
 * Pays an ABA PayWay order.
 *
 * Our merchant account is KHQR, so there is no ABA-hosted page to redirect
 * to — PayWay hands the server a QR and this page displays it. Payment then
 * happens entirely outside the browser, in the buyer's banking app, which is
 * why this page cannot know the outcome by watching the user: it asks the
 * server, which asks ABA. Nothing here ever decides an order is paid; it only
 * reflects what the server confirmed.
 */
@Component({
  selector: 'app-payway-payment',
  imports: [
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    PaywayQrComponent,
  ],
  template: `
    <app-navbar />

    <section class="container pay">
      <nav class="crumbs">
        <a routerLink="/cart">Cart</a> <span>›</span>
        <a routerLink="/checkout">Checkout</a> <span>›</span>
        <span>Payment</span>
      </nav>

      @if (poller.loading()) {
        <div class="card state">
          <ui-icon name="loader" [size]="26" />
          <p>Asking ABA for a payment QR…</p>
        </div>
      } @else if (poller.fatal(); as message) {
        <div class="card state error">
          <ui-icon name="alert-circle" [size]="26" />
          <h1>Payment could not be started</h1>
          <p>{{ message }}</p>
          <div class="actions">
            <button class="btn btn-primary" (click)="poller.start()">
              Try again
            </button>
            <a class="btn btn-ghost" routerLink="/orders">View my orders</a>
          </div>
        </div>
      } @else if (poller.session(); as qr) {
        <h1>Pay with ABA</h1>
        <p class="lede">
          Order {{ qr.orderNumber }} ·
          <strong>\${{ qr.amount.toFixed(2) }}</strong> {{ qr.currency }}
        </p>

        <div class="layout">
          <app-payway-qr
            [qr]="qr"
            [now]="poller.now()"
            [label]="'order ' + qr.orderNumber"
            (renew)="poller.start()"
          />

          <aside class="card status-card">
            <h2>Payment status</h2>

            <div class="status" [class.waiting]="!poller.expired()">
              <ui-icon
                [name]="poller.expired() ? 'clock' : 'loader'"
                [size]="18"
                [color]="
                  poller.expired() ? 'var(--color-muted)' : 'var(--color-accent)'
                "
              />
              <div>
                <strong>
                  {{
                    poller.expired()
                      ? 'Expired, not paid'
                      : 'Waiting for your payment'
                  }}
                </strong>
                <small>
                  {{
                    poller.expired()
                      ? 'No payment reached ABA before this QR expired. Your order is still unpaid.'
                      : 'Checking with ABA every few seconds.'
                  }}
                </small>
              </div>
            </div>

            @if (poller.checkError(); as message) {
              <p class="warn" role="status">
                <ui-icon name="alert-circle" [size]="13" /> {{ message }}
              </p>
            }

            <button
              class="btn btn-outline btn-block"
              (click)="poller.checkNow()"
              [disabled]="poller.checking()"
            >
              {{
                poller.checking()
                  ? 'Checking with ABA…'
                  : "I've paid — check now"
              }}
            </button>

            <ol class="how">
              <li>Open ABA Mobile, or any KHQR-capable banking app.</li>
              <li>Scan this code and confirm the payment.</li>
              <li>
                This page confirms with ABA on its own — no need to tell us.
              </li>
            </ol>

            <p class="fine">
              <ui-icon name="lock" [size]="12" />
              KhmerCraft never sees your card or banking details. Your order is
              marked paid only after ABA confirms the transaction.
            </p>

            <a class="leave" routerLink="/orders">
              Pay later — go to my orders
            </a>
          </aside>
        </div>
      }
    </section>

    <app-footer />
  `,
  styles: [
    `
      .pay {
        padding: 26px 32px 60px;
      }
      .crumbs {
        display: flex;
        gap: 8px;
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 16px;
      }
      .crumbs a:hover {
        color: var(--color-accent);
      }
      h1 {
        font-size: 26px;
        margin-bottom: 6px;
      }
      .lede {
        color: var(--color-muted);
        font-size: 14px;
        margin-bottom: 20px;
      }
      .lede strong {
        color: var(--color-accent);
        font-size: 17px;
      }
      .state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 60px 32px;
        text-align: center;
        color: var(--color-muted);
      }
      .state h1 {
        font-size: 20px;
      }
      .state.error ui-icon {
        color: var(--color-danger);
      }
      .state .actions {
        display: flex;
        gap: 10px;
        margin-top: 8px;
      }
      .layout {
        display: grid;
        grid-template-columns: 340px 1fr;
        gap: 24px;
        align-items: start;
      }
      .status-card {
        padding: 22px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .status-card h2 {
        font-size: 16px;
      }
      .status {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
      }
      .status div {
        display: flex;
        flex-direction: column;
      }
      .status strong {
        font-size: 14px;
      }
      .status small {
        color: var(--color-muted);
        font-size: 12px;
      }
      .status.waiting {
        background: var(--color-accent-soft);
        border-color: var(--color-accent);
      }
      .warn {
        display: flex;
        align-items: center;
        gap: 7px;
        color: var(--color-muted);
        font-size: 12px;
      }
      .how {
        display: grid;
        gap: 7px;
        padding-left: 18px;
        color: var(--color-text-secondary);
        font-size: 13px;
      }
      .fine {
        display: flex;
        align-items: flex-start;
        gap: 7px;
        color: var(--color-muted);
        font-size: 11.5px;
        line-height: 1.5;
        border-top: 1px solid var(--color-border);
        padding-top: 13px;
      }
      .leave {
        color: var(--color-muted);
        font-size: 12.5px;
        text-align: center;
      }
      .leave:hover {
        color: var(--color-accent);
      }
      @media (max-width: 860px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PaywayPaymentComponent {
  private readonly api = inject(CommerceApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly orderNumber =
    this.route.snapshot.paramMap.get('orderNumber') ?? '';

  protected readonly poller = new PaymentPoller<ApiPaywayCheckoutSession>({
    open: () => firstValueFrom(this.api.createPaywayCheckout(this.orderNumber)),
    check: async () => {
      const status = await firstValueFrom(this.api.paywayStatus(this.orderNumber));
      return {
        paid: status.paid,
        failed: status.paymentStatus === 'FAILED',
      };
    },
    onPaid: () => this.goToOrder(),
    // An already-paid order is not a failure — it is the destination.
    onAlreadySettled: () => this.goToOrder(),
    missingTarget: this.orderNumber ? '' : 'No order was given to pay.',
    pendingMessage:
      'ABA has not received this payment yet. Finish it in your banking app, then check again.',
    failedMessage:
      'ABA reports this payment did not go through. Get a new QR and try again.',
  });

  private async goToOrder(): Promise<void> {
    await this.router.navigate(['/order-success'], {
      queryParams: { order: this.orderNumber },
    });
  }
}
