import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../shared/navbar.component';
import { FooterComponent } from '../shared/footer.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent, IconComponent],
  template: `
  <app-navbar active="categories" [cartCount]="0"></app-navbar>

  <section class="container page-head animate-in">
    <div class="breadcrumb">Home <ui-icon name="chevron-right" [size]="11"></ui-icon> <strong>Categories</strong></div>
    <h1>Shop by category</h1>
    <p>Discover the diverse heritage of Cambodia through our curated collections. From ancient weaving techniques to sustainable local flavors, find products that tell a story.</p>
  </section>

  <section class="container category-grid">
    <div class="category-card img-placeholder dark card-hover" *ngFor="let c of categories">
      <div class="cat-overlay">
        <span class="items-count">{{ c.count }} ITEMS</span>
        <div class="cat-foot">
          <strong>{{ c.name }}</strong>
          <button class="btn btn-outline btn-sm explore-btn">Explore <ui-icon name="arrow-right" [size]="13"></ui-icon></button>
        </div>
      </div>
    </div>
  </section>

  <section class="container popular-section">
    <div class="section-head">
      <div>
        <h2>Popular in each category</h2>
        <p>The most sought-after pieces from our artisan community.</p>
      </div>
      <a href="javascript:void(0)" class="see-all">View all categories <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
    </div>
    <div class="popular-grid">
      <div class="popular-card card-hover" *ngFor="let p of popular">
        <div class="img-placeholder">{{ p.name }}</div>
        <span class="tag">{{ p.category }}</span>
        <strong>{{ p.name }}</strong>
        <small>by {{ p.by }}</small>
        <span class="price">\${{ p.price }}</span>
      </div>
    </div>
  </section>

  <app-footer></app-footer>
  `,
  styles: [`
    .page-head { padding: 32px 32px 0; }
    .breadcrumb { font-size: 12px; color: var(--color-muted); margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
    .breadcrumb strong { color: var(--color-text); }
    .page-head h1 { font-size: 26px; margin-bottom: 10px; }
    .page-head p { color: var(--color-muted); font-size: 14px; max-width: 700px; line-height: 1.6; }

    .category-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 28px 32px; }
    .category-card { height: 180px; border-radius: var(--radius-lg); position: relative; cursor: pointer; }
    .cat-overlay {
      position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between;
      padding: 16px; z-index: 1;
    }
    .items-count { color: rgba(255,255,255,0.75); font-size: 11px; font-weight: 700; letter-spacing: .03em; }
    .cat-foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; }
    .cat-foot strong { color: #fff; font-size: 15px; }
    .explore-btn { color: #fff; border-color: rgba(255,255,255,0.5); background: rgba(0,0,0,0.25); padding: 6px 12px; font-size: 12px; flex-shrink: 0; }
    .explore-btn:hover { background: rgba(0,0,0,0.4); }

    .popular-section { padding: 12px 32px 44px; }
    .section-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .section-head p { color: var(--color-muted); font-size: 13px; margin-top: 4px; }
    .popular-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
    .popular-card { display: flex; flex-direction: column; gap: 3px; border-radius: var(--radius-md); padding: 6px; }
    .popular-card .img-placeholder { height: 200px; border-radius: var(--radius-md); font-size: 11px; margin-bottom: 8px; }
    .popular-card .tag { font-size: 10px; text-transform: uppercase; color: var(--color-muted); letter-spacing: .03em; }
    .popular-card small { color: var(--color-muted); font-size: 12px; }
    .popular-card .price { font-weight: 700; margin-top: 3px; }

    @media (max-width: 980px) {
      .category-grid, .popular-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class CategoriesComponent {
  categories = [
    { name: 'Handmade Crafts', count: 142 },
    { name: 'Pottery', count: 84 },
    { name: 'Weaving', count: 210 },
    { name: 'Palm Sugar', count: 45 },
    { name: 'Rice Products', count: 67 },
    { name: 'Local Food', count: 120 },
    { name: 'Bamboo Products', count: 53 },
    { name: 'Dried Fruits', count: 38 }
  ];

  popular = [
    { name: 'Carved Stone Apsara', category: 'Handmade Crafts', by: 'Chhem Artisan Studio', price: '45.00' },
    { name: 'Saffron Silk Scarf', category: 'Weaving', by: 'Takeo Weavers Guild', price: '120.00' },
    { name: 'Kampot Black Pepper', category: 'Local Food', by: 'Organic · 200g', price: '18.50' },
    { name: 'Hand-thrown Bowl', category: 'Pottery', by: 'Siem Reap Ceramics', price: '32.00' }
  ];
}
