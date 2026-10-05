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
            <a class="btn btn-ghost" [routerLink]="leaveLink" [queryParams]="leaveParams">
              {{ fromSetup ? 'Skip for now' : 'Back to billing' }}
            </a>
          </div>
        </div>
      } @else if (poller.session(); as qr) {
        <h1>Activate the {{ qr.planLabel }} plan</h1>
        <p class="lede">
          <strong>\${{ qr.amount.toFixed(2) }}</strong> {{ qr.currency }} for
          {{ qr.periodDays }} days
        </p>

        <div class="layout">
          <app-payway-qr
            [qr]="qr"
            [now]="poller.now()"
            [label]="'the ' + qr.planLabel + ' plan'"
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
                      ? 'No payment reached ABA before this QR expired. Your plan has not changed.'
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

            <button
              class="btn btn-solid btn-block"
              style="margin-top: 8px; justify-content: center; background: var(--brand-700, #176242); color: #fff;"
              (click)="simulatePayment()"
              [disabled]="simulating()"
            >
              <ui-icon [name]="simulating() ? 'loader' : 'check'" [size]="15" />
              {{ simulating() ? 'Activating…' : 'Simulate Payment (Dev / Test)' }}
            </button>


            <ol class="how">
              <li>Open ABA Mobile, or any KHQR-capable banking app.</li>
              <li>Scan this code and confirm the payment.</li>
              <li>
                Your plan activates the moment ABA confirms it — no need to
                tell us.
              </li>
            </ol>

            <p class="fine">
              <ui-icon name="lock" [size]="12" />
              This buys {{ qr.periodDays }} days. There is no automatic renewal
              and nothing is stored to charge you again — you come back here
              when it runs out.
            </p>

            <a class="leave" [routerLink]="leaveLink" [queryParams]="leaveParams">
              {{
                fromSetup
                  ? 'Pay later — continue on the free Starter plan'
                  : 'Pay later — back to billing'
              }}
            </a>
          </aside>
        </div>
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
        width: min(100%, 980px);
        margin: 0 auto;
        padding: clamp(28px, 5vh, 56px) 20px 60px;
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
