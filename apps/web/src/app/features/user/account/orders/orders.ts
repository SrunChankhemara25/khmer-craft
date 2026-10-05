import { Component, inject, signal } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CommerceApiService } from '../../../../core/api/commerce-api.service';
import { ApiOrder } from '../../../../core/api/api.models';
import { cartErrorMessage } from '../../../../core/cart/cart.service';
import { NavbarComponent } from '../../../../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../../../../components/shared/layout/footer/footer.component';
import { IconComponent } from '../../../../components/shared/ui/icon/icon.component';
import { OrderStatusBadgeComponent } from '../../../../components/shared/orders/order-status-badge/order-status-badge.component';

/** Buyer order history, read from the API. */
@Component({
  selector: 'app-orders',
  imports: [
    DatePipe,
    LowerCasePipe,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    OrderStatusBadgeComponent,
  ],
  template: `
    <app-navbar />

    <section class="container orders">
      <h1>My orders</h1>

      @if (loading()) {
        <p class="muted">Loading your orders…</p>
      } @else if (error(); as message) {
        <p class="error" role="alert">
          <ui-icon name="alert-circle" [size]="14" /> {{ message }}
        </p>
      } @else if (orders().length === 0) {
        <div class="empty card">
          <div class="empty-image img-placeholder">
            <ui-icon name="package" [size]="34" />
          </div>
          <h2>No orders yet</h2>
          <p>Once you place an order it will appear here with its status.</p>
          <button class="btn btn-primary" routerLink="/products">
            Start shopping
          </button>
        </div>
      } @else {
        <div class="list">
          @for (order of orders(); track order.id) {
            <article class="card order">
              <header>
                <div>
                  <strong class="number">{{ order.orderNumber }}</strong>
                  <span class="placed">{{
                    order.createdAt | date: 'd MMM y, HH:mm'
                  }}</span>
                </div>
                <div class="badges">
                  <app-order-status [status]="order.orderStatus" />
                  <app-order-status [status]="order.paymentStatus" />
                </div>
              </header>

              <!-- Prominent Order Status Banners -->
              @if (order.orderStatus === 'CONFIRMED') {
                <div class="confirmed-card">
                  <div class="confirmed-card-left">
                    <div class="confirmed-icon-circle">
                      <ui-icon name="check" [size]="16" color="#059669" [strokeWidth]="3" />
                    </div>
                    <div>
                      <div class="confirmed-title">Your order is confirmed by the seller!</div>
                      <div class="confirmed-subtitle">The seller has reviewed your purchase and is packing your handcrafted items.</div>
                    </div>
                  </div>
                  <button type="button" class="btn btn-sm btn-bought" (click)="openPurchasedModal(order)">
                    <ui-icon name="eye" [size]="14" />
                    View What You Bought
                  </button>
                </div>
              } @else if (order.orderStatus === 'SHIPPED') {
                <div class="shipped-card">
                  <div class="shipped-card-left">
                    <div class="shipped-icon-circle">
                      <ui-icon name="truck" [size]="16" color="#2563eb" [strokeWidth]="2.5" />
                    </div>
                    <div>
                      <div class="shipped-title">Your order has been shipped!</div>
                      <div class="shipped-subtitle">The seller dispatched your package for local courier delivery.</div>
                    </div>
                  </div>
                  <button type="button" class="btn btn-sm btn-bought-shipped" (click)="openPurchasedModal(order)">
                    <ui-icon name="eye" [size]="14" />
                    View What You Bought
                  </button>
                </div>
              } @else if (order.orderStatus === 'DELIVERED') {
                <div class="delivered-card">
                  <div class="delivered-card-left">
                    <div class="delivered-icon-circle">
                      <ui-icon name="gift" [size]="16" color="#059669" [strokeWidth]="2.5" />
                    </div>
                    <div>
                      <div class="delivered-title">Order delivered safely</div>
                      <div class="delivered-subtitle">Thank you for supporting Cambodian artisans and local craft makers!</div>
                    </div>
                  </div>
                  <div class="banner-action-group">
                    <button type="button" class="btn btn-sm btn-bought" (click)="openPurchasedModal(order)">
                      <ui-icon name="eye" [size]="14" />
                      View What You Bought
                    </button>
                    <a class="btn btn-sm btn-outline" routerLink="/products">
                      Buy Again
                    </a>
                  </div>
                </div>
              } @else if (order.orderStatus === 'PENDING') {
                <div class="pending-card">
                  <div class="pending-icon-circle">
                    <ui-icon name="clock" [size]="16" color="#d97706" [strokeWidth]="2.5" />
                  </div>
                  <div>
                    <div class="pending-title">Order placed — Waiting for seller confirmation</div>
                    <div class="pending-subtitle">The seller has been notified. You can still cancel this order before the seller accepts it.</div>
                  </div>
                </div>
              }

              <div class="items">
                @for (item of order.items; track item.productId) {
                  <div class="item">
                    <a class="thumb img-placeholder" [routerLink]="['/product', item.productId]">
                      @if (item.productImage) {
                        <img [src]="item.productImage" [alt]="item.productName" />
                      } @else {
                        {{ item.productName }}
                      }
                    </a>
                    <div class="item-main">
                      <a class="item-name" [routerLink]="['/product', item.productId]">{{
                        item.productName
                      }}</a>
                      <span class="seller">{{ item.sellerName }}</span>
                      <span class="qty"
                        >{{ item.quantity }} × \${{ item.price.toFixed(2) }}</span
                      >
                    </div>
                    <span class="line-total">\${{ item.subtotal.toFixed(2) }}</span>
                  </div>
                }
              </div>

              <footer>
                <div class="totals">
                  <span
                    >Delivery
                    {{
                      order.deliveryFee === 0
                        ? 'free'
                        : '$' + order.deliveryFee.toFixed(2)
                    }}</span
                  >
                  <strong>Total \${{ order.totalAmount.toFixed(2) }}</strong>
                </div>

                <div class="actions">
                  <!-- View What You Bought button -->
                  <button
                    type="button"
                    class="btn btn-outline btn-sm btn-view-receipt"
                    (click)="openPurchasedModal(order)"
                  >
                    <ui-icon name="eye" [size]="14" />
                    View What You Bought
                  </button>

                  <!-- The way back to an unpaid ABA order -->
                  @if (
                    order.paymentMethod === 'ABA_PAYWAY' &&
                    order.paymentStatus !== 'PAID' &&
                    order.orderStatus !== 'CANCELLED'
                  ) {
                    <a
                      class="btn btn-primary btn-sm"
                      [routerLink]="['/checkout/pay', order.orderNumber]"
                    >
                      <ui-icon name="credit-card" [size]="14" color="#fff" />
                      Pay with ABA
                    </a>
                  }

                  <!-- Only offered while PENDING: after the seller accepts,
                       the server refuses a buyer cancellation. -->
                  @if (order.orderStatus === 'PENDING') {
                    <button
                      class="btn btn-ghost btn-sm"
                      (click)="cancel(order)"
                      [disabled]="busyId() === order.id"
                    >
                      {{ busyId() === order.id ? 'Cancelling…' : 'Cancel order' }}
                    </button>
                  }
                </div>
              </footer>

              @if (order.statusHistory.length > 1) {
                <div class="history">
                  @for (event of order.statusHistory; track $index) {
                    <span class="event">
                      {{ event.status | lowercase }}
                      <small>{{ event.at | date: 'd MMM HH:mm' }}</small>
                    </span>
                  }
                </div>
              }
            </article>
          }
        </div>
      }
    </section>

    <!-- Modal: What You Bought -->
    @if (selectedOrderForModal(); as modalOrder) {
      <div class="modal-backdrop" (click)="closePurchasedModal()">
        <div class="modal-window" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-tag">ORDER RECEIPT</div>
              <h2 class="modal-title">What You Bought</h2>
              <span class="modal-sub">Order {{ modalOrder.orderNumber }} · {{ modalOrder.createdAt | date: 'mediumDate' }}</span>
            </div>
            <button type="button" class="close-btn" (click)="closePurchasedModal()" aria-label="Close modal">×</button>
          </div>

          <div class="modal-body">
            <!-- Order status notice -->
            @if (modalOrder.orderStatus === 'CONFIRMED') {
              <div class="modal-status-notice confirmed">
                <ui-icon name="check-circle" [size]="20" color="#059669" />
                <div>
                  <strong>Order Confirmed by Seller!</strong>
                  <p>The artisan has confirmed this order and is preparing to pack your items.</p>
                </div>
              </div>
            } @else if (modalOrder.orderStatus === 'SHIPPED') {
              <div class="modal-status-notice shipped">
                <ui-icon name="truck" [size]="20" color="#2563eb" />
                <div>
                  <strong>Package Dispatched &amp; On The Way</strong>
                  <p>Your order is on the way to your shipping address.</p>
                </div>
              </div>
            } @else if (modalOrder.orderStatus === 'DELIVERED') {
              <div class="modal-status-notice delivered">
                <ui-icon name="gift" [size]="20" color="#059669" />
                <div>
                  <strong>Delivered Successfully</strong>
                  <p>Enjoy your handcrafted Khmer pieces!</p>
                </div>
              </div>
            } @else if (modalOrder.orderStatus === 'PENDING') {
              <div class="modal-status-notice pending">
                <ui-icon name="clock" [size]="20" color="#d97706" />
                <div>
                  <strong>Waiting for Seller Confirmation</strong>
                  <p>The seller has been notified and will confirm shortly.</p>
                </div>
              </div>
            }

            <!-- Items Purchased List -->
            <div class="section-title">
              <span>Items Purchased ({{ modalOrder.items.length }})</span>
            </div>

            <div class="purchased-items-list">
              @for (item of modalOrder.items; track item.productId) {
                <div class="purchased-item-row">
                  <a class="item-thumb" [routerLink]="['/product', item.productId]" (click)="closePurchasedModal()">
                    @if (item.productImage) {
                      <img [src]="item.productImage" [alt]="item.productName" />
                    } @else {
                      <span class="no-img"><ui-icon name="package" [size]="20" /></span>
                    }
                  </a>
                  <div class="item-info">
                    <a class="item-title" [routerLink]="['/product', item.productId]" (click)="closePurchasedModal()">
                      {{ item.productName }}
                    </a>
                    <div class="item-artisan">
                      <ui-icon name="store" [size]="12" />
                      <span>Artisan: {{ item.sellerName }}</span>
                    </div>
                    <div class="item-pricing">
                      {{ item.quantity }} × \${{ item.price.toFixed(2) }}
                    </div>
                  </div>
                  <div class="item-total-col">
                    \${{ item.subtotal.toFixed(2) }}
                  </div>
                </div>
              }
            </div>

            <!-- Details Split: Delivery & Financial Summary -->
            <div class="modal-split">
              <div class="modal-box">
                <h4>Delivery Details</h4>
                <div class="info-row">
                  <span class="lbl">Recipient:</span>
                  <span class="val font-medium">{{ modalOrder.deliveryInfo.fullName }}</span>
                </div>
                <div class="info-row">
                  <span class="lbl">Phone:</span>
                  <span class="val">{{ modalOrder.deliveryInfo.phone }}</span>
                </div>
                <div class="info-row">
                  <span class="lbl">Address:</span>
                  <span class="val">
                    {{ modalOrder.deliveryInfo.address }}<br />
                    {{ modalOrder.deliveryInfo.city }}, {{ modalOrder.deliveryInfo.province }}
                  </span>
                </div>
                @if (modalOrder.deliveryInfo.note) {
                  <div class="info-row">
                    <span class="lbl">Delivery Note:</span>
                    <span class="val note-text">“{{ modalOrder.deliveryInfo.note }}”</span>
                  </div>
                }
                <div class="info-row pt-divider">
                  <span class="lbl">Payment Method:</span>
                  <span class="val font-medium">{{ modalOrder.paymentMethod }}</span>
                </div>
                <div class="info-row">
                  <span class="lbl">Payment Status:</span>
                  <span class="val">
                    <app-order-status [status]="modalOrder.paymentStatus" />
                  </span>
                </div>
              </div>

              <div class="modal-box">
                <h4>Payment Summary</h4>
                <div class="summary-line">
                  <span>Items Subtotal:</span>
                  <span>\${{ modalOrder.subtotal.toFixed(2) }}</span>
                </div>
                <div class="summary-line">
                  <span>Delivery Fee:</span>
                  <span>{{ modalOrder.deliveryFee === 0 ? 'Free' : ('$' + modalOrder.deliveryFee.toFixed(2)) }}</span>
                </div>
                <div class="summary-line total-highlight">
                  <span>Total Amount:</span>
                  <span>\${{ modalOrder.totalAmount.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            @if (
              modalOrder.paymentMethod === 'ABA_PAYWAY' &&
              modalOrder.paymentStatus !== 'PAID' &&
              modalOrder.orderStatus !== 'CANCELLED'
            ) {
              <a class="btn btn-primary" [routerLink]="['/checkout/pay', modalOrder.orderNumber]" (click)="closePurchasedModal()">
                <ui-icon name="credit-card" [size]="14" color="#fff" />
                Pay with ABA (\${{ modalOrder.totalAmount.toFixed(2) }})
              </a>
            }
            <a class="btn btn-outline" routerLink="/products" (click)="closePurchasedModal()">
              Browse More Crafts
            </a>
            <button type="button" class="btn btn-ghost" (click)="closePurchasedModal()">
              Close
            </button>
          </div>
        </div>
      </div>
    }

    <app-footer />
  `,
  styles: [
    `
      .orders {
        padding: 30px 32px 64px;
      }
      h1 {
        font-size: 27px;
        margin-bottom: 22px;
      }
      .muted {
        color: var(--color-muted);
        font-size: 14px;
      }
      .error {
        display: flex;
        align-items: center;
        gap: 7px;
        color: var(--color-danger);
        font-size: 13px;
        font-weight: 600;
      }
      .list {
        display: grid;
        gap: 16px;
      }
      .order {
        padding: 18px 20px;
        display: grid;
        gap: 14px;
      }
      .order header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 14px;
        flex-wrap: wrap;
      }
      .number {
        display: block;
        font-size: 15px;
      }
      .placed {
        color: var(--color-muted);
        font-size: 12.5px;
      }
      .badges {
        display: flex;
        gap: 7px;
      }

      /* Prominent Status Banners */
      .confirmed-card,
      .shipped-card,
      .delivered-card,
      .pending-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: var(--radius-md, 8px);
        flex-wrap: wrap;
      }
      .confirmed-card {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
      }
      .shipped-card {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
      }
      .delivered-card {
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
      }
      .pending-card {
        background: #fffbeb;
        border: 1px solid #fde68a;
      }

      .confirmed-card-left,
      .shipped-card-left,
      .delivered-card-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 240px;
      }
      .pending-card {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .confirmed-icon-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #dcfce7;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .shipped-icon-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #dbeafe;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .delivered-icon-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #d1fae5;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .pending-icon-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #fef3c7;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .confirmed-title {
        color: #15803d;
        font-weight: 700;
        font-size: 13.5px;
      }
      .confirmed-subtitle {
        color: #166534;
        font-size: 12px;
        margin-top: 1px;
      }
      .shipped-title {
        color: #1d4ed8;
        font-weight: 700;
        font-size: 13.5px;
      }
      .shipped-subtitle {
        color: #1e40af;
        font-size: 12px;
        margin-top: 1px;
      }
      .delivered-title {
        color: #047857;
        font-weight: 700;
        font-size: 13.5px;
      }
      .delivered-subtitle {
        color: #065f46;
        font-size: 12px;
        margin-top: 1px;
      }
      .pending-title {
        color: #b45309;
        font-weight: 700;
        font-size: 13.5px;
      }
      .pending-subtitle {
        color: #92400e;
        font-size: 12px;
        margin-top: 1px;
      }

      .banner-action-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .btn-bought {
        background: #059669;
        border-color: #059669;
        color: #fff;
        font-weight: 600;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
      }
      .btn-bought:hover {
        background: #047857;
        border-color: #047857;
      }
      .btn-bought-shipped {
        background: #2563eb;
        border-color: #2563eb;
        color: #fff;
        font-weight: 600;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
      }
      .btn-bought-shipped:hover {
        background: #1d4ed8;
        border-color: #1d4ed8;
      }
      .btn-view-receipt {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .items {
        display: grid;
        gap: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
      }
      .item {
        display: flex;
        align-items: center;
        gap: 13px;
      }
      .thumb {
        width: 60px;
        height: 60px;
        border-radius: var(--radius-sm);
        flex-shrink: 0;
        font-size: 9px;
        text-align: center;
        overflow: hidden;
      }
      .thumb img { height: 100%; object-fit: cover; width: 100%; }
      .item-main {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }
      .item-name {
        font-size: 14px;
        font-weight: 600;
      }
      .item-name:hover {
        color: var(--color-accent);
      }
      .seller,
      .qty {
        color: var(--color-muted);
        font-size: 12px;
      }
      .line-total {
        font-weight: 700;
      }
      .order footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
        flex-wrap: wrap;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .totals {
        display: flex;
        align-items: baseline;
        gap: 14px;
        font-size: 13px;
        color: var(--color-muted);
      }
      .totals strong {
        color: var(--color-text);
        font-size: 16px;
      }
      .history {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        color: var(--color-muted);
        font-size: 11.5px;
      }
      .event {
        display: inline-flex;
        gap: 5px;
        text-transform: capitalize;
      }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 54px 32px 58px;
        gap: 12px;
      }
      .empty-image {
        width: 130px;
        height: 130px;
        border-radius: 50%;
        color: var(--color-muted-2);
      }

      /* Modal styles */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 1000;
        backdrop-filter: blur(4px);
      }
      .modal-window {
        background: var(--color-surface, #fff);
        border-radius: var(--radius-lg, 12px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        max-width: 640px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 20px 24px;
        border-bottom: 1px solid var(--color-border);
      }
      .modal-tag {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: var(--color-accent, #c2410c);
      }
      .modal-title {
        font-size: 20px;
        font-weight: 700;
        margin: 2px 0 4px;
      }
      .modal-sub {
        font-size: 12.5px;
        color: var(--color-muted);
      }
      .close-btn {
        background: none;
        border: none;
        font-size: 26px;
        line-height: 1;
        cursor: pointer;
        color: var(--color-muted);
        padding: 0 4px;
      }
      .close-btn:hover {
        color: var(--color-text);
      }
      .modal-body {
        padding: 20px 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .modal-status-notice {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 16px;
        border-radius: var(--radius-md, 8px);
      }
      .modal-status-notice.confirmed {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
      }
      .modal-status-notice.shipped {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
      }
      .modal-status-notice.delivered {
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
      }
      .modal-status-notice.pending {
        background: #fffbeb;
        border: 1px solid #fde68a;
      }
      .modal-status-notice strong {
        display: block;
        font-size: 13.5px;
        margin-bottom: 2px;
      }
      .modal-status-notice p {
        margin: 0;
        font-size: 12px;
        color: var(--color-muted);
      }
      .section-title {
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-muted);
        padding-bottom: 6px;
        border-bottom: 1px solid var(--color-border);
      }
      .purchased-items-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .purchased-item-row {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 12px;
        background: var(--color-surface-subtle, #f8fafc);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md, 8px);
      }
      .item-thumb {
        width: 54px;
        height: 54px;
        border-radius: var(--radius-sm, 6px);
        overflow: hidden;
        flex-shrink: 0;
        background: #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .item-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .no-img {
        color: #94a3b8;
      }
      .item-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .item-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text);
        text-decoration: none;
      }
      .item-title:hover {
        color: var(--color-accent);
      }
      .item-artisan {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--color-muted);
      }
      .item-pricing {
        font-size: 12px;
        color: var(--color-muted);
      }
      .item-total-col {
        font-weight: 700;
        font-size: 15px;
      }
      .modal-split {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      @media (max-width: 600px) {
        .modal-split {
          grid-template-columns: 1fr;
        }
      }
      .modal-box {
        background: var(--color-surface-subtle, #f8fafc);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md, 8px);
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .modal-box h4 {
        font-size: 13px;
        font-weight: 700;
        margin: 0 0 6px;
        color: var(--color-text);
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        font-size: 12.5px;
      }
      .info-row .lbl {
        color: var(--color-muted);
        flex-shrink: 0;
      }
      .info-row .val {
        text-align: right;
        word-break: break-word;
      }
      .note-text {
        font-style: italic;
        color: var(--color-muted);
      }
      .pt-divider {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed var(--color-border);
      }
      .font-medium {
        font-weight: 600;
      }
      .summary-line {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: var(--color-muted);
      }
      .total-highlight {
        margin-top: 6px;
        padding-top: 8px;
        border-top: 1px solid var(--color-border);
        font-weight: 700;
        font-size: 15px;
        color: var(--color-text);
      }
      .modal-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 10px;
        padding: 16px 24px;
        border-top: 1px solid var(--color-border);
        background: var(--color-surface-subtle, #f8fafc);
        flex-wrap: wrap;
      }
    `,
  ],
})
export class Orders {
  private readonly api = inject(CommerceApiService);

  protected readonly orders = signal<ApiOrder[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly busyId = signal('');
  protected readonly selectedOrderForModal = signal<ApiOrder | null>(null);

  constructor() {
    void this.load();
  }

  protected openPurchasedModal(order: ApiOrder): void {
    this.selectedOrderForModal.set(order);
  }

  protected closePurchasedModal(): void {
    this.selectedOrderForModal.set(null);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await firstValueFrom(this.api.myOrders(1, 25));
      this.orders.set(response.orders);
      this.error.set('');
    } catch (error: unknown) {
      this.error.set(cartErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async cancel(order: ApiOrder): Promise<void> {
    this.busyId.set(order.id);
    try {
      const updated = await firstValueFrom(
        this.api.setOrderStatus(order.id, 'CANCELLED'),
      );
      this.orders.update((orders) =>
        orders.map((candidate) =>
          candidate.id === updated.id ? updated : candidate,
        ),
      );
    } catch (error: unknown) {
      this.error.set(cartErrorMessage(error));
    } finally {
      this.busyId.set('');
    }
  }
}

