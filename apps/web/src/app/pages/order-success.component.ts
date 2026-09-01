import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { CommerceApiService } from '../core/api/commerce-api.service';
import { ApiOrder } from '../core/api/api.models';
import { cartErrorMessage } from '../core/cart/cart.service';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
  <div class="page">
    @if (loading()) {
      <div class="success-card animate-scale">
        <p class="muted">Loading your order…</p>
      </div>
    } @else if (error(); as message) {
      <div class="success-card animate-scale">
        <p class="error-feedback">
          <ui-icon name="alert-circle" [size]="14" /> {{ message }}
        </p>
        <div class="actions">
          <button class="btn btn-outline" routerLink="/products">Continue Shopping</button>
        </div>
      </div>
    } @else if (order(); as order) {
      <div class="success-card animate-scale">
        <div class="check-circle"><ui-icon name="check" [size]="26" [strokeWidth]="2.6"></ui-icon></div>
        <h1>Order placed successfully</h1>
        <p>Thank you for supporting Cambodian local sellers.<br>Your contribution helps preserve ancient traditions.</p>

        <div class="order-meta">
          <div><small>ORDER ID</small><strong>{{ order.orderNumber }}</strong></div>
          <div><small>DATE</small><strong>{{ order.createdAt | date: 'MMM d, y' }}</strong></div>
          <div><small>PAYMENT</small><strong>{{ order.paymentMethod }}</strong></div>
          <div><small>STATUS</small><span class="badge badge-gold">{{ order.orderStatus | titlecase }}</span></div>
        </div>

        <div class="order-summary">
          <h4>Order Summary</h4>
          <div class="order-item" *ngFor="let item of order.items">
            <div class="thumb img-placeholder"></div>
            <div class="info">
              <strong>{{ item.productName }}</strong>
              <small>Qty: {{ item.quantity }} &middot; {{ item.sellerName }}</small>
            </div>
            <span class="price">\${{ item.subtotal.toFixed(2) }}</span>
          </div>
          <div class="total-row"><span>Total</span><span>\${{ order.totalAmount.toFixed(2) }}</span></div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" routerLink="/orders">View My Orders</button>
          <button class="btn btn-outline" routerLink="/products">Continue Shopping</button>
        </div>
      </div>
    }

    <div class="info-strip animate-in delay-1">
      <div class="info-card">
        <span class="info-icon"><ui-icon name="leaf" [size]="18" color="var(--color-accent)"></ui-icon></span>
        <strong>Sustainable Impact</strong>
        <p>Your purchase provides sustainable income for 3 artisan families in the Siem Reap province.</p>
      </div>
      <div class="info-card">
        <span class="info-icon"><ui-icon name="truck" [size]="18" color="var(--color-accent)"></ui-icon></span>
        <strong>Tracking Updates</strong>
        <p>We'll send you an SMS with tracking details as soon as the artisan ships your package.</p>
      </div>
      <div class="info-card">
        <span class="info-icon"><ui-icon name="check-circle" [size]="18" color="var(--color-accent)"></ui-icon></span>
        <strong>Artisan Authenticity</strong>
        <p>Every item in this order comes with a signed certificate of authenticity from the creator.</p>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .page { background: var(--color-bg-alt); min-height: 100vh; padding: 56px 20px; display: flex; flex-direction: column; align-items: center; }
    .success-card { background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); max-width: 460px; width: 100%; padding: 40px; text-align: center; }
    .muted { color: var(--color-muted); font-size: 13.5px; }
    .error-feedback { color: var(--color-danger); font-size: 13.5px; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .check-circle {
      width: 60px; height: 60px; border-radius: 50%; background: var(--color-success-soft); color: var(--color-success);
      display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;
    }
    .success-card h1 { font-size: 23px; margin-bottom: 12px; }
    .success-card > p { color: var(--color-muted); font-size: 13.5px; margin-bottom: 26px; line-height: 1.6; }
    .order-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: left; margin-bottom: 26px; }
    .order-meta small { display: block; color: var(--color-muted); font-size: 10px; margin-bottom: 3px; letter-spacing: .03em; }
    .order-meta strong { font-size: 13px; }
    .order-summary { text-align: left; border-top: 1px solid var(--color-border); padding-top: 18px; }
    .order-summary h4 { font-size: 13px; margin-bottom: 12px; color: var(--color-muted); }
    .order-item { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .thumb { width: 42px; height: 42px; border-radius: var(--radius-xs); flex-shrink: 0; font-size: 9px; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .info small { color: var(--color-muted); font-size: 11px; }
    .price { font-weight: 600; font-size: 13px; }
    .total-row { display: flex; justify-content: space-between; font-weight: 700; border-top: 1px solid var(--color-border); padding-top: 14px; margin-top: 6px; color: var(--color-accent); font-size: 16px; }
    .actions { display: flex; gap: 10px; margin-top: 26px; }
    .actions .btn { flex: 1; }

    .info-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 900px; width: 100%; margin-top: 32px; }
    .info-card { background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px; text-align: left; }
    .info-icon { width: 36px; height: 36px; border-radius: 50%; background: var(--color-accent-soft); display: flex; align-items: center; justify-content: center; }
    .info-card strong { display: block; margin: 10px 0 5px; font-size: 13.5px; }
    .info-card p { font-size: 12px; color: var(--color-muted); line-height: 1.5; }

    @media (max-width: 700px) {
      .order-meta, .info-strip { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class OrderSuccessComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CommerceApiService);

  protected readonly order = signal<ApiOrder | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const orderNumber = this.route.snapshot.queryParamMap.get('order');
    if (!orderNumber) {
      this.error.set('No order to show.');
      this.loading.set(false);
      return;
    }

    try {
      this.order.set(await firstValueFrom(this.api.getOrder(orderNumber)));
    } catch (error: unknown) {
      this.error.set(cartErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
