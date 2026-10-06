import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CommerceApiService } from '../core/api/commerce-api.service';
import { ApiPlanCheckoutSession, PaidPlan } from '../core/api/api.models';
import { SellerFlowHeaderComponent } from '../components/shared/layout/seller-flow-header/seller-flow-header.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { PaywayQrComponent } from '../components/shared/payments/payway-qr/payway-qr.component';
import { PaymentCheck, PaymentPoller } from '../core/payments/payment-poller';

const PAID_PLANS: PaidPlan[] = ['STANDARD', 'PREMIUM'];

/**
 * Pays for a seller plan with the same KHQR the storefront uses.
 *
 * The plan is not granted here, and cannot be: reaching this page, or coming
 * back to it from the ABA app, proves only that a browser followed a link.
 * The server activates the plan when ABA confirms the money arrived, and this
 * page only reflects that.
 */
@Component({
  selector: 'app-plan-payment',
  imports: [
    RouterLink,
    SellerFlowHeaderComponent,
    IconComponent,
    PaywayQrComponent,
  ],
  template: `
    <!-- A focused checkout: the full site navbar (search, categories, cart,
         account menu) is all somewhere to wander off to mid-payment. -->
    <app-seller-flow-header [step]="fromSetup ? 2 : null" />

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
            <a class="btn btn-ghost" [routerLink]="leaveLink" [queryParams]="leaveParams">
              {{ fromSetup ? 'Skip for now' : 'Back to billing' }}
            </a>
          </div>
        </div>
      } @else if (poller.session(); as qr) {
        <app-payway-qr
          [qr]="qr"
          [now]="poller.now()"
          [eyebrow]="qr.planLabel + ' plan'"
          [caption]="qr.periodDays + ' days · no automatic renewal'"
          [label]="'the ' + qr.planLabel + ' plan'"
          expiredNote="Nothing was charged and your plan hasn't changed. Get a new QR to pay."
          [checking]="poller.checking()"
          [checkError]="poller.checkError()"
          (renew)="poller.start()"
          (check)="poller.checkNow()"
        />
        <a class="later" [routerLink]="leaveLink" [queryParams]="leaveParams">
          {{ fromSetup ? 'Pay later — start on the free plan' : 'Pay later' }}
        </a>
        <!-- Sandbox only: marks the plan paid without a real transfer. -->
        <button type="button" class="dev" [disabled]="simulating()" (click)="simulatePayment()">
          {{ simulating() ? 'Activating…' : 'Test mode: simulate payment' }}
        </button>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--color-bg-alt);
      }
      .pay {
        padding: clamp(28px, 6vh, 64px) 20px 64px;
        display: flex;
        flex-direction: column;
        align-items: center;
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
      .dev {
        margin-top: 28px;
        border: 1px dashed var(--color-border-strong);
        border-radius: 999px;
        background: none;
        padding: 5px 12px;
        font: inherit;
        font-size: 11.5px;
        color: var(--color-muted);
        cursor: pointer;
      }
      .dev:hover:not(:disabled) {
        color: var(--color-text);
      }
    `,
  ],
})
export class PlanPaymentComponent {
  private readonly api = inject(CommerceApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly storeId =
    this.route.snapshot.queryParamMap.get('store') ?? '';
  /** Paying as the last step of creating a store, vs. renewing from billing. */
  protected readonly fromSetup =
    this.route.snapshot.queryParamMap.get('from') === 'setup';
  protected readonly leaveLink = this.fromSetup
    ? ['/seller/store-ready']
    : ['/seller/dashboard'];
  protected readonly leaveParams = this.fromSetup
    ? { store: this.storeId }
    : { storeId: this.storeId, view: 'billing' };
  private readonly plan = this.route.snapshot.queryParamMap.get(
    'plan',
  ) as PaidPlan | null;

  /**
   * Held separately rather than read back off `poller.session()`: the poller's
   * own config cannot reference the poller it is constructing.
   */
  private paymentId = '';
  protected readonly simulating = signal(false);

  protected async simulatePayment(): Promise<void> {
    if (!this.paymentId) return;
    this.simulating.set(true);
    try {
      await firstValueFrom(this.api.simulatePlanPayment(this.paymentId));
      await this.afterPaid();
    } catch (err: unknown) {
      const body = (err as { error?: { error?: { message?: string } } })?.error;
      alert(body?.error?.message ?? 'Failed to simulate payment. Please try again.');
    } finally {
      this.simulating.set(false);
    }
  }


  protected readonly poller = new PaymentPoller<ApiPlanCheckoutSession>({
    open: async () => {
      const session = await firstValueFrom(
        this.api.createPlanCheckout(this.storeId, this.plan!),
      );
      this.paymentId = session.paymentId;
      return session;
    },
    check: async (): Promise<PaymentCheck> => {
      const status = await firstValueFrom(
        this.api.planPaymentStatus(this.paymentId),
      );
      return { paid: status.paid, failed: status.status === 'FAILED' };
    },
    onPaid: () => this.afterPaid(),
    missingTarget: this.missingTarget(),
    pendingMessage:
      'ABA has not received this payment yet. Finish it in your banking app, then check again.',
    failedMessage:
      'ABA reports this payment did not go through. Get a new QR and try again.',
  });

  /**
   * Both of these are only reachable by hand-editing the URL, but a plan that
   * is not a real paid plan would otherwise be sent to the server as one.
   */
  private missingTarget(): string {
    if (!this.storeId) {
      return 'No store was given to bill.';
    }
    if (!this.plan || !PAID_PLANS.includes(this.plan)) {
      return 'That is not a paid plan.';
    }
    return '';
  }

  /** Setup ends on the "store is live" page; a renewal goes back to billing. */
  private async afterPaid(): Promise<void> {
    if (this.fromSetup) {
      await this.router.navigate(['/seller/store-ready'], {
        queryParams: { store: this.storeId, paid: 1 },
      });
    } else {
      await this.router.navigate(['/seller/dashboard'], {
        queryParams: { storeId: this.storeId, view: 'billing', paid: 1 },
      });
    }
  }
}
