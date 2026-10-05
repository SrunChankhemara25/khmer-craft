import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SellerService, SellerStore } from '../core/api/seller.service';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { SellerFlowHeaderComponent } from '../components/shared/layout/seller-flow-header/seller-flow-header.component';

const PLAN_NAMES: Record<string, string> = {
  STARTER: 'Starter',
  STANDARD: 'Growth',
  PREMIUM: 'Professional',
};

/**
 * The last step of store setup: shown once the store exists and, for a paid
 * plan, once ABA has confirmed the payment — never before, so "your store is
 * live on Growth" is always true when someone reads it.
 */
@Component({
  selector: 'app-seller-store-ready',
  imports: [RouterLink, IconComponent, SellerFlowHeaderComponent],
  template: `
    <app-seller-flow-header [step]="3" />

    <main class="ready">
      @if (loading()) {
        <div class="card state"><ui-icon name="loader" [size]="26" /><p>Getting your store ready…</p></div>
      } @else if (store(); as s) {
        <section class="card success">
          <div class="mark"><ui-icon name="check" [size]="30" [strokeWidth]="2.6" /></div>
          <p class="eyebrow">{{ paid ? 'Payment received · Store created' : 'Store created' }}</p>
          <h1>{{ s.storeName }} is live</h1>
          <p class="lede">
            Buyers can already find your store on KhmerCraft. Add your first products so
            they have something to buy.
          </p>

          <div class="summary">
            <div class="logo">{{ initials(s.storeName) }}</div>
            <div class="summary-copy">
              <strong>{{ s.storeName }}</strong>
              <small>{{ storeMeta(s) }}</small>
            </div>
            <span class="plan">{{ planName() }} plan</span>
          </div>

          <div class="actions">
            <a class="btn btn-primary btn-lg" [routerLink]="['/stores', s.slug || s.id]">
              View your store <ui-icon name="arrow-right" [size]="15" />
            </a>
            <a class="btn btn-outline btn-lg" routerLink="/seller/dashboard" [queryParams]="{ storeId: s.id }">
              Go to dashboard
            </a>
          </div>
          <a class="quiet" routerLink="/seller/dashboard" [queryParams]="{ storeId: s.id, view: 'add' }">
            Add your first product →
          </a>
        </section>
      } @else {
        <div class="card state">
          <ui-icon name="alert-circle" [size]="26" />
          <h1>We couldn’t find that store</h1>
          <p>It may belong to another account. Your stores are all on your dashboard.</p>
          <a class="btn btn-primary" routerLink="/seller/dashboard">Go to dashboard</a>
        </div>
      }
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--color-bg-alt); }
    .ready { display: grid; place-items: center; padding: clamp(32px, 7vh, 80px) 20px; }
    .card { width: min(100%, 560px); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 22px; box-shadow: var(--shadow-md); }
    .state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 56px 32px; text-align: center; color: var(--color-muted); }
    .state h1 { font-size: 20px; color: var(--color-text); }
    .success { display: flex; flex-direction: column; align-items: center; padding: clamp(28px, 5vw, 44px); text-align: center; animation: scaleIn var(--dur-slow) var(--ease-out) both; }
    .mark { width: 64px; height: 64px; display: grid; place-items: center; border-radius: 50%; color: #fff; background: var(--color-success); box-shadow: 0 0 0 8px var(--color-success-soft); }
    .eyebrow { margin-top: 22px; color: var(--color-success); font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    h1 { margin-top: 8px; font-size: clamp(26px, 3.4vw, 34px); }
    .lede { max-width: 400px; margin-top: 10px; line-height: 1.6; }
    .summary { width: 100%; display: flex; align-items: center; gap: 12px; margin-top: 26px; padding: 14px 16px; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-bg); text-align: left; }
    .logo { width: 44px; height: 44px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 12px; background: var(--color-accent-soft); color: var(--color-accent); font: 700 16px Georgia, serif; }
    .summary-copy { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .summary-copy small { color: var(--color-muted); font-size: 12px; }
    .plan { padding: 4px 10px; border-radius: var(--radius-full); background: var(--color-success-soft); color: var(--color-success); font-size: 11.5px; font-weight: 700; white-space: nowrap; }
    .actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 22px; }
    .quiet { margin-top: 16px; color: var(--color-accent); font-size: 13px; font-weight: 600; }
    .quiet:hover { text-decoration: underline; }
    @media (max-width: 520px) { .actions { grid-template-columns: 1fr; } }
  `],
})
export class SellerStoreReadyComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly sellers = inject(SellerService);

  private readonly storeId = this.route.snapshot.queryParamMap.get('store') ?? '';
  protected readonly paid = this.route.snapshot.queryParamMap.get('paid') === '1';
  protected readonly loading = signal(true);
  protected readonly store = signal<SellerStore | null>(null);
  protected readonly planName = computed(
    () => PLAN_NAMES[this.store()?.subscriptionPlan ?? 'STARTER'] ?? 'Starter',
  );

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const mine = await firstValueFrom(this.sellers.getMyStores());
      this.store.set(mine.find((s) => s.id === this.storeId) ?? null);
    } catch {
      this.store.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  protected storeMeta(store: SellerStore): string {
    return [store.category, store.location].filter((part) => !!part).join(' · ');
  }

  protected initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  }
}
