import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CommerceApiService } from '../core/api/commerce-api.service';
import {
  ApiSubscriptionPayment,
  ApiSubscriptionPayments,
  PaidPlan,
} from '../core/api/api.models';
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
 * A seller's plan and billing history — rendered as a view inside the seller
 * dashboard (sidebar, topbar and the dashboard's own palette), not as a
 * separate page with the shopping site's header.
 *
 * Prices and the period come from the server, never from this file — the
 * pricing page's numbers are marketing copy, but what a seller is actually
 * charged has to be the server's own figure.
 */
@Component({
  selector: 'app-seller-billing',
  imports: [DatePipe, RouterLink, IconComponent],
  template: `
    @if (loading()) {
      <div class="panel state">
        <ui-icon name="loader" [size]="22" />
        <p>Loading your plan…</p>
      </div>
    } @else if (error(); as message) {
      <div class="panel state">
        <ui-icon name="alert-circle" [size]="22" />
        <strong>We couldn't load your billing</strong>
        <p>{{ message }}</p>
        <button class="btn-solid" type="button" (click)="reload()">Try again</button>
      </div>
    } @else if (data(); as billing) {
      @if (justPaid() || upgradeSuccessMessage()) {
        <p class="banner" role="status">
          <ui-icon name="check-circle" [size]="15" />
          {{ upgradeSuccessMessage() || ('Payment confirmed — your ' + planLabel(billing.subscription.effectivePlan) + ' plan is active.') }}
        </p>
      }

      <div class="layout">
        <section class="panel">
          <h2>Current plan</h2>

          <div class="plan-now" [class.free]="!billing.subscription.active">
            <div>
              <span class="plan-name">{{ planLabel(billing.subscription.effectivePlan) }}</span>
              @if (billing.subscription.active) {
                <small>
                  Active until {{ billing.subscription.expiresAt | date: 'mediumDate' }}
                  · {{ daysLeft() }} days left
                </small>
              } @else if (billing.subscription.plan !== 'STARTER') {
                <small class="lapsed">
                  Your {{ planLabel(billing.subscription.plan) }} plan expired on
                  {{ billing.subscription.expiresAt | date: 'mediumDate' }}. The store is on Starter until it is renewed.
                </small>
              } @else {
                <small>Free forever. Upgrade any time.</small>
              }
            </div>
            <span class="status-pill" [class.on]="billing.subscription.active">
              {{ billing.subscription.active ? 'Active' : 'Free' }}
            </span>
          </div>

          <h3>Upgrade or renew</h3>
          <div class="options">
            @for (option of planOptions; track option.key) {
              <div class="option" [class.current]="isCurrent(option.key)">
                <div class="option-head">
                  <strong>{{ option.label }}</strong>
                  @if (isCurrent(option.key)) { <span class="tag">Current</span> }
                </div>
                <div class="price">
                  \${{ billing.subscription.prices[option.key].toFixed(2) }}
                  <em>/ {{ billing.subscription.periodDays }} days</em>
                </div>
                <p>{{ option.blurb }}</p>
                <div class="option-actions">
                  <a
                    class="btn-solid"
                    style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%; font-size:13.5px; padding:10px 16px; font-weight:700;"
                    [routerLink]="['/seller/plan/pay']"
                    [queryParams]="{ store: storeId(), plan: option.key }"
                  >
                    <ui-icon name="credit-card" [size]="15" />
                    {{ isCurrent(option.key) ? ('Pay & Renew · $' + billing.subscription.prices[option.key].toFixed(2)) : ('Pay & Upgrade · $' + billing.subscription.prices[option.key].toFixed(2)) }}
                  </a>
                </div>
              </div>
            }
          </div>

          @if (billing.subscription.active) {
            <div class="downgrade-row">
              <span>Looking to switch to the free tier?</span>
              <button
                type="button"
                class="btn-link"
                [disabled]="upgrading() === 'STARTER'"
                (click)="downgradeToStarter()"
              >
                {{ upgrading() === 'STARTER' ? 'Switching…' : 'Cancel paid plan & switch to Free Starter' }}
              </button>
            </div>
          }

          <p class="fine">
            <ui-icon name="info" [size]="12" />
            Plans are paid one period at a time with instant activation or an ABA KHQR code. Nothing is stored to charge you
            automatically, so a plan simply lapses to Starter if it is not renewed.
          </p>
        </section>

        <aside class="panel history">
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
                  <span class="badge" [class]="badgeClass(payment)">{{ statusLabel(payment) }}</span>
                </div>
              </div>
            }
          }
        </aside>
      </div>
    }
  `,
  styles: [
    `
      /* Reads the seller dashboard's tokens (it is always rendered inside
         it), with fallbacks so the panel never renders unstyled. */
      :host { display: block; margin-top: 24px; }
      .panel {
        background: var(--surface, #fff);
        border: 1px solid var(--line, #e2e8e5);
        border-radius: var(--r-lg, 14px);
        box-shadow: var(--sh-sm, 0 1px 2px rgba(20, 32, 27, .05));
        padding: 22px;
      }
      h2 { color: var(--ink-900, #14201b); font-size: 16px; margin-bottom: 14px; }
      h3 { color: var(--ink-900, #14201b); font-size: 13.5px; margin: 22px 0 10px; }
      .state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 24px; text-align: center; color: var(--ink-500, #697871); }
      .state strong { color: var(--ink-900, #14201b); }
      .banner {
        display: flex; align-items: center; gap: 8px; margin-bottom: 18px; padding: 12px 15px;
        border-radius: var(--r-md, 10px); background: var(--ok-bg, #e6f4ec); color: var(--ok, #1f7d55);
        font-size: 13px; font-weight: 600;
      }
      .layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
      .plan-now {
        display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px;
        border: 1px solid var(--brand-100, #d9eee2); border-radius: var(--r-md, 10px); background: var(--brand-50, #eff8f3);
      }
      .plan-now.free { border-color: var(--line, #e2e8e5); background: var(--raised, #fbfcfb); }
      .plan-name { display: block; color: var(--ink-900, #14201b); font-size: 19px; font-weight: 700; }
      .plan-now small { color: var(--ink-500, #697871); font-size: 12.5px; }
      .plan-now small.lapsed { color: var(--danger, #b5372a); font-weight: 600; }
      .status-pill { flex: 0 0 auto; padding: 4px 11px; border-radius: var(--r-pill, 999px); background: var(--line-soft, #eef2f0); color: var(--ink-500, #697871); font-size: 11.5px; font-weight: 700; }
      .status-pill.on { background: var(--ok-bg, #e6f4ec); color: var(--ok, #1f7d55); }
      .options { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
      .option { display: grid; gap: 8px; padding: 16px; border: 1px solid var(--line, #e2e8e5); border-radius: var(--r-md, 10px); background: var(--surface, #fff); }
      .option.current { border-color: var(--brand-600, #1f7d55); box-shadow: 0 0 0 3px var(--brand-50, #eff8f3); }
      .option-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .option-head strong { color: var(--ink-900, #14201b); font-size: 15px; }
      .tag { padding: 2px 8px; border-radius: var(--r-pill, 999px); background: var(--brand-100, #d9eee2); color: var(--brand-800, #124a33); font-size: 10.5px; font-weight: 700; }
      .price { color: var(--ink-900, #14201b); font-size: 20px; font-weight: 700; }
      .price em { color: var(--ink-500, #697871); font-size: 12px; font-style: normal; font-weight: 500; }
      .option p { color: var(--ink-500, #697871); font-size: 12.5px; line-height: 1.5; }
      .btn-solid, .btn-ghost {
        justify-self: start; display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px;
        border-radius: var(--r-pill, 999px); font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer;
      }
      .btn-solid { border: 0; background: var(--brand-700, #176242); color: #fff; }
      .btn-solid:hover { background: var(--brand-800, #124a33); }
      .btn-ghost { border: 1px solid var(--line, #e2e8e5); background: var(--surface, #fff); color: var(--ink-900, #14201b); }
      .btn-ghost:hover { border-color: var(--brand-600, #1f7d55); color: var(--brand-700, #176242); }
      .btn-subtle { font-size: 12px; padding: 7px 12px; }
      .option-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
      .downgrade-row {
        display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px;
        padding: 12px 16px; border-radius: var(--r-md, 10px); background: var(--raised, #fbfcfb);
        border: 1px dashed var(--line, #e2e8e5); font-size: 12.5px; color: var(--ink-500, #697871);
      }
      .btn-link { background: none; border: 0; color: var(--ink-700, #3b4943); font-size: 12.5px; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0; }
      .btn-link:hover { color: var(--danger, #b5372a); }
      .fine {
        display: flex; align-items: flex-start; gap: 7px; margin-top: 18px; padding-top: 14px;
        border-top: 1px solid var(--line-soft, #eef2f0); color: var(--ink-500, #697871); font-size: 11.5px; line-height: 1.5;
      }
      .history .row { display: flex; justify-content: space-between; gap: 10px; padding: 11px 0; border-bottom: 1px solid var(--line-soft, #eef2f0); }
      .history .row:last-child { border-bottom: 0; }
      .history strong { display: block; color: var(--ink-900, #14201b); font-size: 13.5px; }
      .history small { color: var(--ink-500, #697871); font-size: 11.5px; }
      .right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
      .amount { color: var(--ink-900, #14201b); font-size: 13px; font-weight: 600; }
      .badge { width: fit-content; padding: 2px 8px; border-radius: var(--r-pill, 999px); font-size: 10.5px; font-weight: 700; }
      .badge-paid { background: var(--ok-bg, #e6f4ec); color: var(--ok, #1f7d55); }
      .badge-pending { background: var(--warn-bg, #fdf4e3); color: var(--warn, #a9700f); }
      .badge-failed { background: var(--danger-bg, #fcece9); color: var(--danger, #b5372a); }
      .empty { color: var(--ink-500, #697871); font-size: 13px; }
      @media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }
    `,
  ],
})
export class SellerBillingComponent {
  private readonly api = inject(CommerceApiService);
  private readonly route = inject(ActivatedRoute);

  /** The dashboard's currently selected store. */
  readonly storeId = input.required<string>();
  readonly planChanged = output<void>();


  protected readonly planOptions = PLAN_OPTIONS;
  protected readonly data = signal<ApiSubscriptionPayments | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly upgrading = signal<string | null>(null);
  protected readonly upgradeSuccessMessage = signal<string>('');
  /** Set when the payment page sends a seller back after a renewal. */
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
    // Reload whenever the seller switches store in the dashboard.
    effect(() => {
      const storeId = this.storeId();
      if (storeId) void this.load(storeId);
    });
  }

  protected reload(): void {
    void this.load(this.storeId());
  }

  protected async downgradeToStarter(): Promise<void> {
    if (!confirm('Are you sure you want to cancel your paid plan and switch back to the free Starter plan? Your premium features will be deactivated.')) {
      return;
    }
    this.upgrading.set('STARTER');
    this.error.set('');
    try {
      await firstValueFrom(this.api.upgradePlan(this.storeId(), 'STARTER'));
      this.justPaid.set(false);
      this.upgradeSuccessMessage.set('Your store is now on the free Starter plan.');
      await this.load(this.storeId());
      this.planChanged.emit();
    } catch (err: unknown) {
      const body = (err as { error?: { error?: { message?: string } } })?.error;
      this.error.set(
        body?.error?.message ?? 'Failed to switch plan. Please try again.'
      );
    } finally {
      this.upgrading.set(null);
    }
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

  private async load(storeId: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
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
