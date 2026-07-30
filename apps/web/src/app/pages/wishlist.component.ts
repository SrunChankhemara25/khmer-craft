import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../shared/navbar.component';
import { FooterComponent } from '../shared/footer.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, IconComponent],
  template: `
  <app-navbar active="" [cartCount]="0" [wishlistCount]="items.length"></app-navbar>

  <ng-container *ngIf="items.length > 0; else emptyState">
    <section class="container head animate-in">
      <h1><ui-icon name="heart" [size]="24" [filled]="true" color="var(--color-danger)"></ui-icon> Your wishlist</h1>
      <p>{{ items.length }} saved piece{{ items.length > 1 ? 's' : '' }} from Cambodian artisans you've been eyeing.</p>
    </section>

    <section class="container wishlist-grid">
      <div class="wishlist-card card card-hover" *ngFor="let item of items">
        <div class="thumb img-placeholder">
          {{ item.name }}
          <button class="remove-btn" (click)="remove(item)" aria-label="Remove from wishlist">
            <ui-icon name="heart" [size]="15" [filled]="true" color="var(--color-danger)"></ui-icon>
          </button>
          <span class="badge" [ngClass]="item.stock === 'Low Stock' ? 'badge-low-stock' : 'badge-in-stock'">{{ item.stock }}</span>
        </div>
        <div class="body">
          <span class="tag">{{ item.category }}</span>
          <h4>{{ item.name }}</h4>
          <small class="store">{{ item.store }}</small>
          <div class="rating-row"><ui-icon name="star" [size]="13" [filled]="true" color="var(--color-gold)"></ui-icon> {{ item.rating }}</div>
          <div class="price-row">
            <span class="price">\${{ item.price }}</span>
            <button class="cart-add"><ui-icon name="cart" [size]="14" color="#fff"></ui-icon></button>
          </div>
        </div>
      </div>
    </section>
  </ng-container>

  <ng-template #emptyState>
    <section class="container empty-state animate-in">
      <div class="empty-image img-placeholder"><ui-icon name="heart" [size]="40"></ui-icon></div>
      <h1>Your wishlist is empty</h1>
      <p>Save pieces you love while browsing and they'll show up here, ready whenever you're ready to buy.</p>
      <button class="btn btn-primary btn-lg" routerLink="/products">Browse Products</button>
    </section>
  </ng-template>

  <app-footer></app-footer>
  `,
  styles: [`
    .head { padding: 32px 32px 8px; }
    .head h1 { font-size: 25px; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
    .head p { color: var(--color-muted); font-size: 13px; }

    .wishlist-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 20px 32px 56px; }
    .thumb { position: relative; height: 155px; font-size: 11px; padding: 10px; }
    .remove-btn {
      position: absolute; top: 10px; right: 10px; background: #fff; border: none; border-radius: 50%;
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-xs);
    }
    .thumb .badge { position: absolute; top: 10px; left: 10px; background-color: #fff; }
    .body { padding: 14px; display: flex; flex-direction: column; gap: 4px; }
    .tag { font-size: 10px; color: var(--color-gold); font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
    .body h4 { font-size: 14px; }
    .store { color: var(--color-muted); font-size: 11.5px; }
    .price-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .price { font-weight: 700; }
    .cart-add { background: var(--color-accent); border: none; border-radius: var(--radius-sm); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
    .cart-add:hover { background: var(--color-accent-hover); }

    .empty-state { text-align: center; padding: 70px 32px 90px; display: flex; flex-direction: column; align-items: center; }
    .empty-image { width: 180px; height: 180px; border-radius: 50%; margin-bottom: 28px; color: var(--color-muted-2); }
    .empty-state h1 { font-size: 27px; margin-bottom: 12px; }
    .empty-state p { color: var(--color-muted); font-size: 14px; max-width: 420px; margin-bottom: 26px; line-height: 1.6; }

    @media (max-width: 980px) {
      .wishlist-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class WishlistComponent {
  items = [
    { name: 'Hand-Woven Silk Scarf', category: 'Weaving', store: 'Battambang Weavers Guild', rating: 4.8, price: '45.00', stock: 'In Stock' },
    { name: 'Celadon Tea Set', category: 'Pottery', store: 'Phnom Penh Pottery House', rating: 4.7, price: '65.00', stock: 'Low Stock' },
    { name: 'Angkor Silver Earrings', category: 'Jewelry', store: 'Siem Reap Silversmiths', rating: 4.9, price: '120.00', stock: 'In Stock' }
  ];

  remove(item: any) {
    this.items = this.items.filter(i => i !== item);
  }
}
