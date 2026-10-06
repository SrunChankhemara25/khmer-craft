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

    <section class="pay">
      @if (poller.loading()) {
        <div class="state">
          <ui-icon name="loader" [size]="22" />
          <p>Preparing your payment QR…</p>
        </div>
      } @else if (poller.fatal(); as message) {
        <div class="state">
          <ui-icon name="alert-circle" [size]="22" color="var(--color-danger)" />
          <h1>Payment couldn't start</h1>
          <p>{{ message }}</p>
          <div class="actions">
            <button class="btn btn-primary" (click)="poller.start()">Try again</button>
            <a class="btn btn-ghost" routerLink="/orders">My orders</a>
          </div>
        </div>
      } @else if (poller.session(); as qr) {
        <app-payway-qr
          [qr]="qr"
          [now]="poller.now()"
          eyebrow="Pay KhmerCraft"
          [caption]="'Order ' + qr.orderNumber"
          [label]="'order ' + qr.orderNumber"
          expiredNote="Nothing was charged and your order is still saved. Get a new QR to pay."
          [checking]="poller.checking()"
          [checkError]="poller.checkError()"
          (renew)="poller.start()"
          (check)="poller.checkNow()"
        />
        <a class="later" routerLink="/orders">Pay later</a>
      }
    </section>

    <app-footer />
  `,
  styles: [
    `
      .pay {
        min-height: 70vh;
        padding: clamp(28px, 6vh, 64px) 20px 64px;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: var(--color-bg-alt);
      }
      .state {
        width: min(100%, 400px);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 48px 24px;
        text-align: center;
        color: var(--color-muted);
      }
      .state h1 {
        font-size: 19px;
        color: var(--color-text);
      }
      .actions {
        display: flex;
        gap: 10px;
        margin-top: 6px;
      }
      .later {
        margin-top: 18px;
        font-size: 13px;
        color: var(--color-muted);
      }
      .later:hover {
        color: var(--color-accent);
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
