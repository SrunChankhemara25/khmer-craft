import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../shared/navbar.component';
import { FooterComponent } from '../shared/footer.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, IconComponent],
  template: `
  <app-navbar active="" [cartCount]="items.length"></app-navbar>

  <ng-container *ngIf="items.length > 0; else emptyState">
    <section class="container cart-layout">
      <div class="cart-items animate-in">
        <h1>Your shopping cart</h1>
        <p class="subtitle">Review your curated selection of Cambodian heritage pieces.</p>

        <div class="cart-item" *ngFor="let item of items">
          <div class="store-label"><ui-icon name="store" [size]="13"></ui-icon> {{ item.store }} &middot; Ships from Cambodia</div>
          <div class="item-row">
            <div class="thumb img-placeholder">{{ item.name }}</div>
            <div class="info">
              <strong>{{ item.name }}</strong>
              <small>{{ item.detail }}</small>
              <div class="qty-stepper">
                <button (click)="changeQty(item, -1)"><ui-icon name="minus" [size]="13"></ui-icon></button>
                <span>{{ item.qty }}</span>
                <button (click)="changeQty(item, 1)"><ui-icon name="plus" [size]="13"></ui-icon></button>
              </div>
            </div>
            <div class="item-side">
              <span class="price">\${{ (item.price * item.qty).toFixed(2) }}</span>
              <a href="javascript:void(0)" class="remove" (click)="remove(item)"><ui-icon name="trash" [size]="13"></ui-icon> Remove</a>
            </div>
          </div>
        </div>
      </div>

      <aside class="summary animate-in delay-1">
        <h3>Order Summary</h3>
        <div class="row"><span>Subtotal ({{ items.length }} items)</span><span>\${{ subtotal.toFixed(2) }}</span></div>
        <div class="row"><span>Standard Delivery</span><span>\${{ delivery.toFixed(2) }}</span></div>
        <div class="row"><span>Taxes</span><span>Calculated at checkout</span></div>
        <div class="row total"><span>Total</span><span>\${{ total.toFixed(2) }}</span></div>
        <button class="btn btn-primary btn-block btn-lg" (click)="goToCheckout()">Proceed to Checkout <ui-icon name="arrow-right" [size]="16" color="#fff"></ui-icon></button>

        <div class="promo">
          <label>Have a gift card or promo code?</label>
          <div class="promo-row">
            <input type="text" placeholder="CODE2026">
            <button class="btn btn-outline">Apply</button>
          </div>
        </div>

        <div class="trust-list">
          <div><ui-icon name="lock" [size]="14"></ui-icon> Secure Payment Gateway</div>
          <div><ui-icon name="truck" [size]="14"></ui-icon> Direct Artisan Shipping Tracking</div>
        </div>
      </aside>
    </section>

    <section class="container history-section">
      <div class="section-head"><h2><ui-icon name="clock" [size]="19" color="var(--color-accent)"></ui-icon> Order history</h2><a href="javascript:void(0)" class="see-all">View all orders <ui-icon name="arrow-right" [size]="14"></ui-icon></a></div>
      <p class="section-sub">A quick look at what you've ordered from KhmerCraft before.</p>
      <div class="history-list">
        <div class="history-entry" *ngFor="let o of orderHistory">
          <div class="history-card">
            <div class="history-thumb img-placeholder"></div>
            <div class="history-info">
              <div class="history-top">
                <strong>{{ o.id }}</strong>
                <span class="badge" [ngClass]="o.status === 'Delivered' ? 'badge-in-stock' : 'badge-gold'">{{ o.status }}</span>
              </div>
              <small>{{ o.date }} &middot; {{ o.itemCount }} item{{ o.itemCount > 1 ? 's' : '' }} &middot; {{ o.summary }}</small>
            </div>
            <div class="history-side">
              <span class="price">\${{ o.total.toFixed(2) }}</span>
              <div class="history-actions">
                <button class="btn btn-ghost btn-sm details-toggle" (click)="o.expanded = !o.expanded">
                  {{ o.expanded ? 'Hide Details' : 'View Details' }}
                  <ui-icon [name]="o.expanded ? 'chevron-up' : 'chevron-down'" [size]="13"></ui-icon>
                </button>
                <button class="btn btn-outline btn-sm">Reorder</button>
              </div>
            </div>
          </div>

          <div class="history-detail animate-fade" *ngIf="o.expanded">
            <div class="detail-item" *ngFor="let li of o.items">
              <div class="detail-thumb img-placeholder"></div>
              <div class="detail-info">
                <strong>{{ li.name }}</strong>
                <small>Qty: {{ li.qty }}</small>
              </div>
              <span class="detail-price">\${{ li.price.toFixed(2) }}</span>
            </div>
            <div class="detail-row"><span>Shipping</span><span>\${{ o.shipping.toFixed(2) }}</span></div>
            <div class="detail-row total"><span>Total</span><span>\${{ o.total.toFixed(2) }}</span></div>
          </div>
        </div>
      </div>
    </section>
  </ng-container>

  <ng-template #emptyState>
    <section class="container empty-cart animate-in">
      <div class="empty-image img-placeholder"><ui-icon name="cart" [size]="40"></ui-icon></div>
      <h1>Your cart is empty</h1>
      <p>Looks like you haven't added any Cambodian local products yet. Start exploring our collection of traditional crafts and sustainable goods.</p>
      <button class="btn btn-primary btn-lg" routerLink="/products">Browse Products</button>
      <div class="explore-cats">
        <span class="label">EXPLORE CATEGORIES</span>
        <div class="cat-grid">
          <div class="cat-card" *ngFor="let c of quickCategories">
            <span class="cat-icon"><ui-icon [name]="c.icon" [size]="20"></ui-icon></span>
            <strong>{{ c.name }}</strong>
          </div>
        </div>
      </div>
    </section>
  </ng-template>

  <app-footer></app-footer>
  `,
  styles: [`
    .cart-layout { display: grid; grid-template-columns: 1fr 340px; gap: 32px; padding: 32px 32px 44px; align-items: start; }
    .cart-items h1 { font-size: 25px; margin-bottom: 8px; }
    .subtitle { color: var(--color-muted); font-size: 13px; margin-bottom: 22px; }
    .cart-item { border: 1px solid var(--color-border); border-radius: var(--radius-md); background: #fff; padding: 18px; margin-bottom: 16px; transition: border-color var(--dur-base) var(--ease-standard); }
    .cart-item:hover { border-color: var(--color-border-strong); }
    .store-label { font-size: 12px; color: var(--color-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    .item-row { display: flex; align-items: center; gap: 16px; }
    .thumb { width: 72px; height: 72px; border-radius: var(--radius-sm); flex-shrink: 0; font-size: 10px; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 5px; }
    .info small { color: var(--color-muted); font-size: 12px; }
    .qty-stepper { display: flex; align-items: center; gap: 13px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-xs); padding: 5px 11px; width: fit-content; margin-top: 5px; }
    .qty-stepper button { background: none; border: none; display: flex; color: var(--color-text-secondary); }
    .item-side { display: flex; flex-direction: column; align-items: flex-end; gap: 9px; }
    .price { font-weight: 700; }
    .remove { color: var(--color-danger); font-size: 12px; display: flex; align-items: center; gap: 4px; }

    .summary { border: 1px solid var(--color-border); border-radius: var(--radius-md); background: #fff; padding: 22px; }
    .summary h3 { margin-bottom: 16px; }
    .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 11px; color: var(--color-muted); }
    .row.total { color: var(--color-text); font-weight: 700; font-size: 18px; border-top: 1px solid var(--color-border); padding-top: 14px; margin-top: 6px; }
    .promo { margin-top: 22px; }
    .promo label { font-size: 12px; color: var(--color-muted); }
    .promo-row { display: flex; gap: 8px; margin-top: 7px; }
    .promo-row input { flex: 1; padding: 9px 11px; border-radius: var(--radius-xs); border: 1px solid var(--color-border-strong); font-size: 13px; }
    .trust-list { margin-top: 20px; display: flex; flex-direction: column; gap: 9px; font-size: 12px; color: var(--color-muted); }
    .trust-list div { display: flex; align-items: center; gap: 7px; }

    .history-section { padding: 0 32px 44px; }
    .section-head { display: flex; justify-content: space-between; align-items: center; }
    .section-head h2 { display: flex; align-items: center; gap: 9px; }
    .section-sub { color: var(--color-muted); font-size: 13px; margin: 6px 0 18px; }
    .history-list { display: flex; flex-direction: column; gap: 12px; }
    .history-entry { border: 1px solid var(--color-border); border-radius: var(--radius-md); background: #fff; overflow: hidden; transition: border-color var(--dur-base) var(--ease-standard); }
    .history-entry:hover { border-color: var(--color-border-strong); }
    .history-card { display: flex; align-items: center; gap: 16px; padding: 16px; }
    .history-thumb { width: 56px; height: 56px; border-radius: var(--radius-sm); flex-shrink: 0; }
    .history-info { flex: 1; display: flex; flex-direction: column; gap: 5px; }
    .history-top { display: flex; align-items: center; gap: 10px; }
    .history-info small { color: var(--color-muted); font-size: 12px; }
    .history-side { display: flex; flex-direction: column; align-items: flex-end; gap: 9px; }
    .history-side .price { font-weight: 700; }
    .history-actions { display: flex; gap: 8px; }
    .details-toggle { display: flex; align-items: center; gap: 5px; }

    .history-detail { border-top: 1px solid var(--color-border); background: var(--color-bg-alt); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .detail-item { display: flex; align-items: center; gap: 12px; }
    .detail-thumb { width: 40px; height: 40px; border-radius: var(--radius-xs); flex-shrink: 0; font-size: 9px; }
    .detail-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .detail-info small { color: var(--color-muted); font-size: 11.5px; }
    .detail-price { font-weight: 600; font-size: 13px; }
    .detail-row { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--color-muted); padding-top: 8px; border-top: 1px dashed var(--color-border); }
    .detail-row.total { color: var(--color-text); font-weight: 700; font-size: 14px; }

    .empty-cart { text-align: center; padding: 70px 32px 90px; display: flex; flex-direction: column; align-items: center; }
    .empty-image { width: 180px; height: 180px; border-radius: 50%; margin-bottom: 28px; color: var(--color-muted-2); }
    .empty-cart h1 { font-size: 27px; margin-bottom: 12px; }
    .empty-cart p { color: var(--color-muted); font-size: 14px; max-width: 420px; margin-bottom: 26px; line-height: 1.6; }
    .explore-cats { margin-top: 44px; width: 100%; max-width: 700px; }
    .explore-cats .label { font-size: 12px; color: var(--color-muted); letter-spacing: .06em; display: block; margin-bottom: 16px; font-weight: 600; }
    .cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .cat-card { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 22px 10px; display: flex; flex-direction: column; align-items: center; gap: 9px; background: #fff; transition: all var(--dur-base) var(--ease-standard); }
    .cat-card:hover { border-color: var(--color-border-strong); box-shadow: var(--shadow-sm); transform: translateY(-2px); }
    .cat-icon { color: var(--color-accent); }

    @media (max-width: 980px) {
      .cart-layout { grid-template-columns: 1fr; }
      .cat-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class CartComponent {
  items = [
    { name: 'Hand-Woven Royal Silk Scarf', detail: 'Material: 100% Raw Silk | Indigo Gold', store: 'Battambang Weavers Guild', price: 85, qty: 1 },
    { name: 'Hand-Carved Apsara Relief Replica', detail: 'Material: Sandstone | 12 x 12 inches', store: 'Siem Reap Stone Carvings', price: 145, qty: 1 }
  ];

  orderHistory = [
    {
      id: 'KC-000482', date: 'Jun 14, 2026', status: 'Delivered', itemCount: 2,
      summary: 'Silk Scarf, Ceramic Bowl', total: 63.50, shipping: 3.50, expanded: false,
      items: [
        { name: 'Hand-Woven Silk Scarf', qty: 1, price: 45.00 },
        { name: 'Ceramic Tea Bowl', qty: 1, price: 15.00 }
      ]
    },
    {
      id: 'KC-000411', date: 'May 2, 2026', status: 'Delivered', itemCount: 1,
      summary: 'Palm Sugar Pack (500g)', total: 3.50, shipping: 0, expanded: false,
      items: [
        { name: 'Palm Sugar Pack (500g)', qty: 1, price: 3.50 }
      ]
    },
    {
      id: 'KC-000356', date: 'Mar 21, 2026', status: 'Cancelled', itemCount: 3,
      summary: 'Bamboo Basket, Rice Bag, Dried Mango', total: 30.50, shipping: 3.00, expanded: false,
      items: [
        { name: 'Hand-woven Bamboo Basket', qty: 1, price: 8.00 },
        { name: 'Organic Rice Bag (5kg)', qty: 1, price: 18.00 },
        { name: 'Dried Mango Pack (200g)', qty: 1, price: 1.50 }
      ]
    }
  ];

  quickCategories = [
    { icon: 'box', name: 'Handmade Crafts' },
    { icon: 'package', name: 'Pottery' },
    { icon: 'gift', name: 'Palm Sugar' },
    { icon: 'leaf', name: 'Rice Products' }
  ];

  delivery = 15;

  constructor(private router: Router) {}

  get subtotal() {
    return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  get total() {
    return this.subtotal + this.delivery;
  }

  changeQty(item: any, delta: number) {
    item.qty = Math.max(1, item.qty + delta);
  }

  remove(item: any) {
    this.items = this.items.filter(i => i !== item);
  }

  goToCheckout() {
    this.router.navigate(['/checkout']);
  }
}
