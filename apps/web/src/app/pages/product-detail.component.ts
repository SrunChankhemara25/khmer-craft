import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../shared/navbar.component';
import { FooterComponent } from '../shared/footer.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent, IconComponent],
  template: `
  <app-navbar active="products" [cartCount]="0"></app-navbar>

  <section class="container breadcrumb-row">
    <span>Home <ui-icon name="chevron-right" [size]="10"></ui-icon> Products <ui-icon name="chevron-right" [size]="10"></ui-icon> Handmade Khmer Scarf</span>
  </section>

  <section class="container product-layout">
    <div class="gallery animate-in">
      <div class="main-image img-placeholder">Handmade Khmer Scarf</div>
      <div class="thumb-row">
        <div class="thumb img-placeholder small active"></div>
        <div class="thumb img-placeholder small"></div>
        <div class="thumb img-placeholder small"></div>
        <div class="thumb img-placeholder small"></div>
        <div class="thumb play"><ui-icon name="camera" [size]="18"></ui-icon></div>
      </div>
    </div>

    <div class="details animate-in delay-1">
      <h1>Handmade Khmer Scarf</h1>
      <div class="rating-row">
        <span class="stars"><ui-icon *ngFor="let s of [1,2,3,4]" name="star" [size]="14" [filled]="true"></ui-icon></span> 4.8 (124 reviews)
      </div>

      <div class="store-row">
        <div class="store-avatar img-placeholder"></div>
        <div>
          <small>Store</small>
          <div><strong>Srey Khmer Handmade Store</strong></div>
        </div>
        <button class="btn btn-outline btn-sm follow-btn">Follow Store</button>
      </div>

      <div class="price-row">
        <span class="price">$45.00</span>
        <span class="old-price">$58.00</span>
        <span class="badge discount-badge">-22%</span>
      </div>

      <p class="desc">Authentic Cambodian Krama, hand-woven in the Takeo province using organic silk and natural dyes. A piece of living heritage designed for the modern connoisseur.</p>

      <div class="color-select">
        <strong>Select Color</strong>
        <div class="colors">
          <span class="color-swatch active" style="background:#2f4a3a;"></span>
          <span class="color-swatch" style="background:#5c3a26;"></span>
          <span class="color-swatch" style="background:#3f6350;"></span>
        </div>
        <small>Emerald &amp; Cream</small>
      </div>

      <div class="qty-avail-row">
        <div>
          <strong>Quantity</strong>
          <div class="qty-stepper">
            <button><ui-icon name="minus" [size]="14"></ui-icon></button><span>1</span><button><ui-icon name="plus" [size]="14"></ui-icon></button>
          </div>
        </div>
        <div>
          <strong>Availability</strong>
          <div class="avail"><span class="dot"></span> 12 items in stock (Ready to ship)</div>
        </div>
      </div>

      <div class="cta-row">
        <button class="btn btn-primary btn-block btn-lg"><ui-icon name="cart" [size]="16" color="#fff"></ui-icon> Add to Cart</button>
        <button class="icon-square" aria-label="Wishlist"><ui-icon name="heart" [size]="18"></ui-icon></button>
      </div>
      <button class="btn btn-gold btn-block btn-lg">Buy Now</button>

      <div class="trust-row">
        <div><ui-icon name="check-circle" [size]="16"></ui-icon> Secure Payment<br><small>PCI-DSS compliant checkout</small></div>
        <div><ui-icon name="truck" [size]="16"></ui-icon> Express Delivery<br><small>3-5 days worldwide</small></div>
      </div>
    </div>
  </section>

  <section class="container tabs-section">
    <div class="tabs">
      <span class="tab active">Description</span>
      <span class="tab">Materials</span>
      <span class="tab">Delivery</span>
      <span class="tab">Reviews (124)</span>
    </div>
    <p class="tab-content">The traditional Khmer Krama is more than just a scarf; it is a symbol of Cambodian identity and a versatile tool used for centuries by artisans and farmers alike. Our handmade silk variant elevates this rustic heritage into a piece of luxury wearable art.</p>
    <div class="feature-grid">
      <div *ngFor="let f of features"><ui-icon name="check-circle" [size]="15" color="var(--color-accent)"></ui-icon> {{ f }}</div>
    </div>
  </section>

  <section class="container related-section">
    <div class="section-head"><h3>Related treasures <small>Recommended for you</small></h3><a href="javascript:void(0)" class="see-all">View all <ui-icon name="arrow-right" [size]="14"></ui-icon></a></div>
    <div class="related-grid">
      <div class="related-card card-hover" *ngFor="let r of related">
        <div class="img-placeholder">{{ r.name }}</div>
        <span class="tag">{{ r.category }}</span>
        <strong>{{ r.name }}</strong>
        <span class="price">\${{ r.price }}</span>
      </div>
    </div>
  </section>

  <app-footer></app-footer>
  `,
  styles: [`
    .breadcrumb-row { padding: 20px 32px 0; font-size: 12px; color: var(--color-muted); }
    .breadcrumb-row span { display: inline-flex; align-items: center; gap: 6px; }
    .product-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; padding: 22px 32px 44px; }
    .main-image { height: 430px; border-radius: var(--radius-lg); font-size: 13px; }
    .thumb-row { display: flex; gap: 10px; margin-top: 12px; }
    .thumb.small { width: 72px; height: 72px; border-radius: var(--radius-sm); cursor: pointer; }
    .thumb.active { outline: 2px solid var(--color-accent); outline-offset: 2px; }
    .thumb.play { width: 72px; height: 72px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; color: var(--color-muted); }

    .details h1 { font-size: 27px; margin-bottom: 10px; }
    .store-row { display: flex; align-items: center; gap: 10px; margin: 18px 0; }
    .store-avatar { width: 38px; height: 38px; border-radius: 50%; }
    .store-row small { color: var(--color-muted); font-size: 11px; }
    .follow-btn { margin-left: auto; }
    .price-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .price { font-size: 26px; font-weight: 800; }
    .old-price { text-decoration: line-through; color: var(--color-muted); font-size: 15px; }
    .discount-badge { background: var(--color-danger-soft); color: var(--color-danger); }
    .desc { font-size: 13.5px; color: var(--color-muted); margin-bottom: 20px; line-height: 1.65; }
    .color-select .colors { display: flex; gap: 9px; margin: 10px 0 6px; }
    .color-swatch { width: 28px; height: 28px; border-radius: 50%; display: inline-block; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--color-border); cursor: pointer; transition: box-shadow var(--dur-fast) var(--ease-standard); }
    .color-swatch.active, .color-swatch:hover { box-shadow: 0 0 0 2px var(--color-accent); }
    .color-select small { color: var(--color-muted); }
    .qty-avail-row { display: flex; justify-content: space-between; margin: 22px 0; }
    .qty-stepper { display: flex; align-items: center; gap: 16px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); padding: 7px 14px; margin-top: 7px; width: fit-content; }
    .qty-stepper button { background: none; border: none; display: flex; color: var(--color-text-secondary); }
    .avail { display: flex; align-items: center; gap: 7px; font-size: 13px; margin-top: 7px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-success); display: inline-block; }
    .cta-row { display: flex; gap: 10px; margin-bottom: 10px; }
    .icon-square { width: 48px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); background: #fff; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); }
    .icon-square:hover { color: var(--color-danger); border-color: var(--color-danger); }
    .trust-row { display: flex; gap: 26px; margin-top: 20px; font-size: 12.5px; }
    .trust-row > div { display: flex; flex-direction: column; gap: 2px; }
    .trust-row ui-icon { margin-bottom: 4px; color: var(--color-accent); }
    .trust-row small { color: var(--color-muted); }

    .tabs-section { padding: 0 32px 44px; }
    .tabs { display: flex; gap: 30px; border-bottom: 1px solid var(--color-border); margin-bottom: 20px; }
    .tab { padding-bottom: 11px; font-size: 14px; color: var(--color-muted); cursor: pointer; }
    .tab.active { color: var(--color-text); font-weight: 600; border-bottom: 2px solid var(--color-accent); }
    .tab-content { font-size: 13.5px; color: var(--color-muted); line-height: 1.75; max-width: 900px; margin-bottom: 22px; }
    .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; font-size: 13.5px; }
    .feature-grid > div { display: flex; align-items: center; gap: 8px; }

    .related-section { padding: 0 32px 44px; }
    .section-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 18px; }
    .section-head small { display: block; color: var(--color-muted); font-weight: 400; font-size: 12px; }
    .related-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
    .related-card { display: flex; flex-direction: column; gap: 4px; border-radius: var(--radius-md); padding: 6px; cursor: pointer; }
    .related-card .img-placeholder { height: 155px; border-radius: var(--radius-md); font-size: 11px; }
    .related-card .tag { font-size: 10px; color: var(--color-muted); text-transform: uppercase; letter-spacing: .03em; }

    @media (max-width: 980px) {
      .product-layout, .related-grid, .feature-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ProductDetailComponent {
  features = [
    '100% Hand-woven Takeo Silk',
    'Size: 180cm x 70cm',
    'Natural pigments from local roots',
    'Ethically sourced directly from artisans',
    'Traditional checkered "Krama" pattern',
    'Supports rural weaving cooperatives'
  ];

  related = [
    { name: 'Embroidered Silk Purse', category: 'Silk Accessories', price: '65.00' },
    { name: 'Angkor Silver Earrings', category: 'Jewelry', price: '120.00' },
    { name: 'Celadon Tea Set', category: 'Ceramics', price: '65.00' },
    { name: 'Saffron Artisan Tie', category: "Men's Fashion", price: '35.00' }
  ];
}
