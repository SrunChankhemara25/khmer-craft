import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../shared/navbar.component';
import { FooterComponent } from '../shared/footer.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-stores',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent, IconComponent],
  template: `
  <app-navbar active="stores" [cartCount]="0"></app-navbar>

  <section class="container page-head animate-in">
    <div class="breadcrumb">HOME / STORES</div>
    <h1>Discover local stores</h1>
    <p>Support independent Cambodian artisans and discover the stories behind their crafts. From the heart of Phnom Penh to the rural workshops of Kampong Speu.</p>
  </section>

  <section class="container filters-bar">
    <div class="filter-field">
      <label>SEARCH STORES</label>
      <div class="search-input"><ui-icon name="search" [size]="15" color="var(--color-muted)"></ui-icon><input type="text" placeholder="Find by store name..."></div>
    </div>
    <div class="filter-field">
      <label>LOCATION</label>
      <select><option>All Regions</option></select>
    </div>
    <div class="filter-field">
      <label>CATEGORY</label>
      <select><option>All Crafts</option></select>
    </div>
    <button class="btn btn-primary apply-btn">Apply Filters</button>
  </section>

  <section class="container store-grid">
    <div class="store-card card card-hover" *ngFor="let s of stores">
      <div class="store-banner img-placeholder">{{ s.name }}</div>
      <div class="store-avatar img-placeholder">{{ s.initials }}</div>
      <div class="store-info">
        <div class="store-title-row">
          <strong>{{ s.name }}</strong>
          <span class="rating-row"><ui-icon name="star" [size]="13" [filled]="true" color="var(--color-gold)"></ui-icon> {{ s.rating }}</span>
        </div>
        <small class="location"><ui-icon name="map-pin" [size]="12"></ui-icon> {{ s.location }}</small>
        <p>{{ s.desc }}</p>
        <div class="store-foot">
          <span>{{ s.products }} Products</span>
          <button class="btn btn-outline btn-sm">View Store</button>
        </div>
      </div>
    </div>
  </section>

  <section class="container featured-sellers">
    <div class="section-head">
      <div>
        <h2>Featured sellers</h2>
        <p>Handpicked artisans with exceptional craftsmanship.</p>
      </div>
      <a href="javascript:void(0)" class="see-all">Meet all artisans <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
    </div>
    <div class="seller-grid">
      <div class="seller-card" *ngFor="let a of artisans">
        <div class="seller-avatar img-placeholder">{{ a.initials }}</div>
        <div class="seller-body">
          <span class="badge badge-soft">{{ a.badge }}</span>
          <strong>{{ a.name }}</strong>
          <small>{{ a.role }}</small>
          <div class="seller-thumbs">
            <span class="img-placeholder mini"></span>
            <span class="img-placeholder mini"></span>
            <span class="img-placeholder mini"></span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <app-footer></app-footer>
  `,
  styles: [`
    .page-head { padding: 36px 32px 0; }
    .breadcrumb { font-size: 11px; color: var(--color-muted); letter-spacing: .06em; margin-bottom: 14px; font-weight: 600; }
    .page-head h1 { font-size: 30px; margin-bottom: 12px; }
    .page-head p { color: var(--color-muted); font-size: 14px; max-width: 700px; line-height: 1.6; }

    .filters-bar { display: flex; gap: 20px; align-items: flex-end; padding: 28px 32px; }
    .filter-field { flex: 1; }
    .filter-field label { display: block; font-size: 11px; color: var(--color-muted); margin-bottom: 7px; letter-spacing: .04em; font-weight: 600; }
    .search-input { display: flex; align-items: center; gap: 9px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); padding: 10px 13px; background: #fff; }
    .search-input input { border: none; outline: none; width: 100%; font-size: 13px; }
    .filter-field select { width: 100%; padding: 10px 13px; border-radius: var(--radius-sm); border: 1px solid var(--color-border-strong); font-size: 13px; background: #fff; }
    .apply-btn { flex-shrink: 0; }

    .store-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 0 32px 44px; }
    .store-card { position: relative; }
    .store-banner { height: 120px; font-size: 11px; }
    .store-avatar {
      width: 56px; height: 56px; border-radius: 50%; border: 3px solid #fff;
      position: absolute; top: 92px; left: 20px; font-size: 11px; box-shadow: var(--shadow-xs);
    }
    .store-info { padding: 38px 18px 20px; }
    .store-title-row { display: flex; justify-content: space-between; align-items: center; }
    .location { color: var(--color-muted); font-size: 12px; display: flex; align-items: center; gap: 4px; margin-top: 4px; }
    .store-info p { font-size: 12.5px; color: var(--color-muted); margin: 10px 0 16px; line-height: 1.5; }
    .store-foot { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--color-muted); }

    .featured-sellers { background: var(--color-bg-alt); margin: 0 32px 44px; border-radius: var(--radius-lg); padding: 32px; }
    .featured-sellers .section-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
    .featured-sellers .section-head p { color: var(--color-muted); font-size: 13px; margin-top: 4px; }
    .seller-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
    .seller-card { display: flex; gap: 14px; background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 18px; }
    .seller-avatar { width: 58px; height: 58px; border-radius: var(--radius-md); flex-shrink: 0; font-size: 10px; }
    .seller-body { display: flex; flex-direction: column; gap: 5px; }
    .seller-thumbs { display: flex; gap: 6px; margin-top: 8px; }
    .img-placeholder.mini { width: 36px; height: 36px; border-radius: var(--radius-xs); }

    @media (max-width: 980px) {
      .filters-bar { flex-direction: column; align-items: stretch; }
      .store-grid, .seller-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class StoresComponent {
  stores = [
    { name: 'Srey Khmer Handmade', initials: 'SK', location: 'Siem Reap', rating: 4.9, products: 142, desc: 'Exquisite hand-woven silk scarves and traditional Khmer garments made using heritage techniques.' },
    { name: 'Phnom Penh Pottery', initials: 'PP', location: 'Phnom Penh', rating: 4.7, products: 85, desc: 'Contemporary ceramics rooted in traditional Khmer design. Minimalist, functional, and beautiful.' },
    { name: 'Kampong Speu Palm Sugar', initials: 'KS', location: 'Kampong Speu', rating: 5.0, products: 24, desc: 'PGI-certified organic palm sugar, sustainably harvested and processed by hand.' }
  ];

  artisans = [
    { initials: 'SX', name: 'Sreysor Textiles', role: 'Master Weaver since 1995', badge: 'Artisan of the Month' },
    { initials: 'SC', name: 'Sopheak Carvings', role: 'Preserving Wood Craft', badge: 'Rising Star' }
  ];
}
