import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CommerceApiService } from '../core/api/commerce-api.service';
import { SellerService } from '../core/api/seller.service';
import {
  ApiSubscriptionPayment,
  ApiSubscriptionPayments,
  PaidPlan,
} from '../core/api/api.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

interface PlanOption {
  key: PaidPlan;
  label: string;
  blurb: string;
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    key: 'STANDARD',
    label: 'Growth',
    blurb: 'Sales and stock overview, store logo and cover controls.',
  },
  {
    key: 'PREMIUM',
    label: 'Professional',
    blurb: 'Everything in Growth, plus a multiple-store workspace.',
  },
];

/**
 * A seller's plan and billing history.
 *
 * Prices and the period come from the server, never from this file — the
 * pricing page's numbers are marketing copy, but what a seller is actually
 * charged has to be the server's own figure.
 */
@Component({
  selector: 'app-seller-billing',
  imports: [
    DatePipe,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
  ],
  template: `
    <app-navbar />

    <section class="container billing">
      <nav class="crumbs">
        <a routerLink="/seller/dashboard">Dashboard</a> <span>›</span>
        <span>Billing</span>
      </nav>

      @if (loading()) {
        <div class="card state">
          <ui-icon name="loader" [size]="26" />
          <p>Loading your plan…</p>
        </div>
      } @else if (error(); as message) {
        <div class="card state">
          <ui-icon name="alert-circle" [size]="26" />
          <h1>We couldn't load your billing</h1>
          <p>{{ message }}</p>
          <a class="btn btn-primary" routerLink="/seller/dashboard">
            Back to dashboard
          </a>
        </div>
      } @else if (data(); as billing) {
        <h1>Plan &amp; billing</h1>
        <p class="lede">{{ billing.subscription.storeName }}</p>

        @if (justPaid()) {
          <p class="banner ok" role="status">
            <ui-icon name="check-circle" [size]="15" />
            Payment confirmed — your {{ planLabel(billing.subscription.effectivePlan) }}
            plan is active.
          </p>
        }

        <div class="layout">
          <section class="card current">
            <h2>Current plan</h2>

            <div class="plan-now" [class.free]="!billing.subscription.active">
              <strong>{{ planLabel(billing.subscription.effectivePlan) }}</strong>
              @if (billing.subscription.active) {
                <small>
                  Active until
                  {{ billing.subscription.expiresAt | date: 'mediumDate' }}
                  · {{ daysLeft() }} days left
                </small>
              } @else if (billing.subscription.plan !== 'STARTER') {
                <small class="lapsed">
                  Your {{ planLabel(billing.subscription.plan) }} plan expired on
                  {{ billing.subscription.expiresAt | date: 'mediumDate' }}. The
                  store is on Starter until it is renewed.
                </small>
              } @else {
                <small>Free forever. Upgrade any time.</small>
              }
            </div>

            <div class="options">
              @for (option of planOptions; track option.key) {
                <div class="option">
                  <div class="option-head">
                    <strong>{{ option.label }}</strong>
                    <span class="price">
                      \${{ billing.subscription.prices[option.key].toFixed(2) }}
                      <em>/ {{ billing.subscription.periodDays }} days</em>
                    </span>
                  </div>
                  <p>{{ option.blurb }}</p>
                  <a
                    class="btn"
                    [class.btn-primary]="!isCurrent(option.key)"
                    [class.btn-outline]="isCurrent(option.key)"
                    [routerLink]="['/seller/plan/pay']"
                    [queryParams]="{ store: storeId(), plan: option.key }"
                  >
                    <ui-icon
                      name="credit-card"
                      [size]="15"
                      [color]="isCurrent(option.key) ? '' : '#fff'"
                    />
                    {{ isCurrent(option.key) ? 'Renew with ABA' : 'Pay with ABA' }}
                  </a>
                </div>
              }
            </div>

            <p class="fine">
              <ui-icon name="info" [size]="12" />
              Plans are paid one period at a time with an ABA KHQR code.
              Nothing is stored to charge you automatically, so a plan simply
              lapses to Starter if it is not renewed.
            </p>
          </section>

          <aside class="card history">
            <h2>Payment history</h2>

            @if (billing.payments.length === 0) {
              <p class="empty">No plan payments yet.</p>
            } @else {
              @for (payment of billing.payments; track payment.id) {
                <div class="row">
                  <div>
                    <strong>{{ payment.planLabel }}</strong>
                    <small>{{ payment.createdAt | date: 'mediumDate' }}</small>
                  </div>
                  <div class="right">
                    <span class="amount">\${{ payment.amount.toFixed(2) }}</span>
                    <span class="badge" [class]="badgeClass(payment)">
                      {{ statusLabel(payment) }}
                    </span>
                  </div>
                </div>
              }
            }
          </aside>
        </div>
      }
    </section>

    <app-footer />
  `,
  styles: [
    `
      .billing {
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
        margin-bottom: 4px;
      }
      .lede {
        color: var(--color-muted);
        font-size: 14px;
        margin-bottom: 18px;
      }
      .banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 15px;
        border-radius: var(--radius-sm);
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 18px;
      }
      .banner.ok {
        background: var(--color-success-soft);
        color: var(--color-success);
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
      .layout {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 24px;
        align-items: start;
      }
      .current,
      .history {
        padding: 22px;
      }
      .current h2,
      .history h2 {
        font-size: 16px;
        margin-bottom: 14px;
      }
      .plan-now {
        border: 1px solid var(--color-accent);
        background: var(--color-accent-soft);
        border-radius: var(--radius-sm);
        padding: 15px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 18px;
      }
      .plan-now.free {
        border-color: var(--color-border-strong);
        background: var(--color-bg-alt);
      }
      .plan-now strong {
        font-size: 18px;
      }
      .plan-now small {
        color: var(--color-muted);
        font-size: 12.5px;
      }
      .plan-now small.lapsed {
        color: var(--color-danger);
        font-weight: 600;
      }
      .options {
        display: grid;
        gap: 12px;
      }
      .option {
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        padding: 15px;
        display: grid;
        gap: 9px;
      }
      .option-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 10px;
      }
      .option-head strong {
        font-size: 15px;
      }
      .price {
        font-weight: 700;
        color: var(--color-accent);
        white-space: nowrap;
      }
      .price em {
        color: var(--color-muted);
        font-style: normal;
        font-weight: 500;
        font-size: 11.5px;
      }
      .option p {
        color: var(--color-muted);
        font-size: 12.5px;
        line-height: 1.5;
      }
      .option .btn {
        justify-self: start;
      }
      .fine {
        display: flex;
        align-items: flex-start;
        gap: 7px;
        color: var(--color-muted);
        font-size: 11.5px;
        line-height: 1.5;
        border-top: 1px solid var(--color-border);
        margin-top: 16px;
        padding-top: 13px;
      }
      .history .row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 11px 0;
        border-bottom: 1px solid var(--color-border);
      }
      .history .row:last-child {
        border-bottom: 0;
      }
      .history strong {
        display: block;
        font-size: 13.5px;
      }
      .history small {
        color: var(--color-muted);
        font-size: 11.5px;
      }
      .right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
      }
      .amount {
        font-weight: 600;
        font-size: 13px;
      }
      .badge {
        font-size: 10.5px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;
        width: fit-content;
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
      .empty {
        color: var(--color-muted);
        font-size: 13px;
      }
      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SellerBillingComponent {
  private readonly api = inject(CommerceApiService);
  private readonly sellers = inject(SellerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly planOptions = PLAN_OPTIONS;
  protected readonly data = signal<ApiSubscriptionPayments | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly storeId = signal('');
  protected readonly justPaid = signal(
    this.route.snapshot.queryParamMap.get('paid') === '1',
  );

  protected readonly daysLeft = computed(() => {
    const expires = this.data()?.subscription.expiresAt;
    if (!expires) {
      return 0;
    }
    return Math.max(
      0,
      Math.ceil((Date.parse(expires) - Date.now()) / (24 * 60 * 60 * 1000)),
    );
  });

  constructor() {
    void this.load();
  }

  protected planLabel(plan: string): string {
    return (
      { STARTER: 'Starter', STANDARD: 'Growth', PREMIUM: 'Professional' }[
        plan
      ] ?? plan
    );
  }

  protected isCurrent(plan: PaidPlan): boolean {
    return this.data()?.subscription.effectivePlan === plan;
  }

  protected statusLabel(payment: ApiSubscriptionPayment): string {
    return {
      PAID: 'Paid',
      PENDING: 'Unpaid',
      FAILED: 'Failed',
      REFUNDED: 'Refunded',
    }[payment.status];
  }

  protected badgeClass(payment: ApiSubscriptionPayment): string {
    return {
      PAID: 'badge-paid',
      PENDING: 'badge-pending',
      FAILED: 'badge-failed',
      REFUNDED: 'badge-failed',
    }[payment.status];
  }

  /**
   * The store comes from the query string when we were sent here from a
   * payment, and otherwise from the seller's own stores — so a seller can
   * reach billing from the dashboard without knowing their store id.
   */
  private async load(): Promise<void> {
    try {
      let storeId = this.route.snapshot.queryParamMap.get('store') ?? '';

      if (!storeId) {
        const mine = await firstValueFrom(this.sellers.getMyStores());
        const first = mine[0];
        if (!first) {
          await this.router.navigate(['/seller/onboarding']);
          return;
        }
        storeId = first.id;
      }

      this.storeId.set(storeId);
      this.data.set(await firstValueFrom(this.api.subscriptionPayments(storeId)));
    } catch (error: unknown) {
      const body = (error as { error?: { error?: { message?: string } } })
        ?.error;
      this.error.set(
        body?.error?.message ?? 'Could not load your plan. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
