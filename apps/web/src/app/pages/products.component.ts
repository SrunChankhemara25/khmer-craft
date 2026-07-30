import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../shared/navbar.component';
import { FooterComponent } from '../shared/footer.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, IconComponent],
  template: `
  <app-navbar active="products" [cartCount]="0"></app-navbar>

  <section class="container hero-section">
    <div class="hero-copy animate-in">
      <h1>Discover Cambodian<br>handmade &amp; local products</h1>
      <p>Empowering local artisans by bringing the soul of Cambodian heritage directly to your home. Curated, authentic, and sustainably sourced.</p>
      <div class="hero-actions">
        <button class="btn btn-primary">Explore Collections</button>
        <button class="btn btn-outline">Meet the Artisans</button>
      </div>
    </div>
    <div class="hero-collage animate-scale delay-1">
      <div class="collage-item big img-placeholder">Weaving pattern</div>
      <div class="collage-item img-placeholder">Pottery making</div>
      <div class="collage-item img-placeholder">Spices &amp; ingredients</div>
      <div class="collage-item img-placeholder">Bamboo weaving</div>
    </div>
  </section>

  <section class="container main-layout">
    <aside class="filters">
      <div class="filters-head"><strong>Filters</strong> <a href="javascript:void(0)">Clear all</a></div>

      <div class="filter-group">
        <h5>Category</h5>
        <label><input type="checkbox"> Artisan Crafts</label>
        <label><input type="checkbox"> Organic Foods</label>
        <label><input type="checkbox"> Kitchenware</label>
      </div>

      <div class="filter-group">
        <h5>Price range</h5>
        <div class="price-inputs">
          <input type="text" placeholder="Min">
          <input type="text" placeholder="Max">
        </div>
      </div>

      <div class="filter-group">
        <h5>Location</h5>
        <select>
          <option>All Regions</option>
        </select>
      </div>

      <div class="filter-group">
        <h5>Rating</h5>
        <label><input type="radio" name="rating"> 4.5 &amp; up</label>
        <label><input type="radio" name="rating"> 4.0 &amp; up</label>
      </div>

      <div class="filter-group">
        <h5>Availability</h5>
        <label><input type="checkbox"> In Stock Only</label>
      </div>

      <button class="btn btn-primary btn-block">Apply Filters</button>
    </aside>

    <div class="product-list">
      <div class="list-head">
        <span>Showing {{ products.length }} products</span>
        <div class="sort">
          Sort by: <strong>Recommended</strong> <ui-icon name="chevron-down" [size]="14"></ui-icon>
        </div>
      </div>

      <div class="product-grid">
        <div class="product-card card card-hover" *ngFor="let p of products" [routerLink]="['/product', p.id]">
          <div class="product-thumb img-placeholder">
            {{ p.name }}
            <button class="wish-btn" (click)="$event.stopPropagation()"><ui-icon name="heart" [size]="14"></ui-icon></button>
            <span class="badge" [ngClass]="p.stock === 'Low Stock' ? 'badge-low-stock' : 'badge-in-stock'">{{ p.stock }}</span>
          </div>
          <div class="product-body">
            <span class="tag">{{ p.category }}</span>
            <h4>{{ p.name }}</h4>
            <small class="store">{{ p.store }}</small>
            <div class="rating-row"><ui-icon name="star" [size]="13" [filled]="true" color="var(--color-gold)"></ui-icon> {{ p.rating }}</div>
            <div class="price-row">
              <span class="price">\${{ p.price }}</span>
              <button class="cart-add" (click)="$event.stopPropagation()"><ui-icon name="cart" [size]="14" color="#fff"></ui-icon></button>
            </div>
          </div>
        </div>
      </div>

      <div class="load-more">
        <button class="btn btn-outline">Load More Products</button>
      </div>
    </div>
  </section>

  <app-footer></app-footer>
  `,
  styles: [`
    .hero-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding: 44px 32px; align-items: center; }
    .hero-copy h1 { font-size: 32px; line-height: 1.2; margin-bottom: 16px; }
    .hero-copy p { color: var(--color-muted); font-size: 14px; margin-bottom: 22px; max-width: 460px; line-height: 1.6; }
    .hero-actions { display: flex; gap: 12px; }
    .hero-collage { display: grid; grid-template-columns: 1.4fr 1fr; grid-template-rows: 1fr 1fr; gap: 12px; height: 300px; }
    .collage-item.big { grid-row: span 2; }
    .collage-item { border-radius: var(--radius-md); font-size: 11px; }

    .main-layout { display: grid; grid-template-columns: 224px 1fr; gap: 32px; padding: 0 32px 56px; align-items: start; }
    .filters { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px; background: #fff; position: sticky; top: 90px; }
    .filters-head { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 14px; }
    .filters-head a { color: var(--color-accent); font-size: 12px; font-weight: 600; }
    .filter-group { margin-bottom: 20px; }
    .filter-group h5 { font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--color-muted); margin-bottom: 10px; }
    .filter-group label { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 9px; color: var(--color-text-secondary); }
    .price-inputs { display: flex; gap: 8px; }
    .price-inputs input { width: 100%; padding: 8px 10px; border-radius: var(--radius-xs); border: 1px solid var(--color-border-strong); font-size: 12px; }
    .filter-group select { width: 100%; padding: 8px 10px; border-radius: var(--radius-xs); border: 1px solid var(--color-border-strong); font-size: 12px; }

    .list-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 13px; color: var(--color-muted); }
    .sort { display: flex; align-items: center; gap: 4px; }
    .sort strong { color: var(--color-text); }
    .product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .product-card { cursor: pointer; }
    .product-thumb { position: relative; height: 155px; font-size: 11px; padding: 10px; }
    .wish-btn { position: absolute; top: 10px; right: 10px; background: #fff; border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); box-shadow: var(--shadow-xs); }
    .wish-btn:hover { color: var(--color-danger); }
    .product-thumb .badge { position: absolute; top: 10px; left: 10px; background-color: #fff; }
    .product-body { padding: 14px; }
    .tag { font-size: 10px; color: var(--color-gold); font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
    .product-body h4 { font-size: 14px; margin: 5px 0 3px; }
    .store { color: var(--color-muted); font-size: 11.5px; }
    .price-row { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
    .price { font-weight: 700; }
    .cart-add { background: var(--color-accent); border: none; border-radius: var(--radius-sm); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
    .cart-add:hover { background: var(--color-accent-hover); }
    .load-more { text-align: center; margin-top: 32px; }

    @media (max-width: 980px) {
      .hero-section, .main-layout { grid-template-columns: 1fr; }
      .product-grid { grid-template-columns: repeat(2, 1fr); }
      .filters { position: static; }
    }
  `]
})
export class ProductsComponent {
  products = [
    { id: 1, name: 'Handmade Khmer Scarf', category: 'Handmade Crafts', store: 'Srey Khmer Handmade Store', rating: 4.8, price: '12.50', stock: 'In Stock' },
    { id: 2, name: 'Palm Sugar Pack (500g)', category: 'Palm Sugar', store: 'Kampong Speu Palm Sugar', rating: 4.6, price: '3.50', stock: 'Low Stock' },
    { id: 3, name: 'Clay Pottery Cup', category: 'Pottery', store: 'Phnom Penh Pottery House', rating: 4.7, price: '6.00', stock: 'In Stock' },
    { id: 4, name: 'Organic Rice Bag (5kg)', category: 'Rice Products', store: 'Battambang Rice Farm', rating: 4.9, price: '18.00', stock: 'In Stock' },
    { id: 5, name: 'Hand-woven Bamboo Basket', category: 'Bamboo Products', store: 'Takeo Bamboo Craft', rating: 4.5, price: '8.00', stock: 'In Stock' },
    { id: 6, name: 'Dried Mango Pack (200g)', category: 'Local Food', store: 'Kampot Local Food', rating: 4.4, price: '4.50', stock: 'In Stock' },
    { id: 7, name: 'Handmade Wooden Spoon', category: 'Handmade Crafts', store: 'Siem Reap Woodcraft', rating: 4.6, price: '5.50', stock: 'In Stock' },
    { id: 8, name: 'Khmer Ceramic Bowl', category: 'Pottery', store: 'Phnom Penh Pottery House', rating: 4.8, price: '9.00', stock: 'In Stock' }
  ];
}
