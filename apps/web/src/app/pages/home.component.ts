import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../core/catalog/catalog.service';
import { NavbarComponent } from '../shared/navbar.component';
import { FooterComponent } from '../shared/footer.component';
import { IconComponent } from '../shared/icon.component';
import { ProductCardComponent } from '../shared/product-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, IconComponent, ProductCardComponent],
  template: `
  <app-navbar></app-navbar>

  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-copy animate-in">
        <span class="badge badge-soft"><ui-icon name="sparkles" [size]="13"></ui-icon> Proudly Local, Authentically Cambodian</span>
        <h1>Authentic Cambodian products, crafted with love</h1>
        <p>Support local artisans and farmers. Discover handmade crafts, organic foods, and traditional products from across Cambodia.</p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg" routerLink="/products">Shop Now <ui-icon name="arrow-right" [size]="16"></ui-icon></button>
          <button class="btn btn-outline btn-lg" routerLink="/categories">Explore Categories</button>
        </div>
      </div>
      <div class="hero-image img-placeholder dark animate-scale delay-1">Hero image</div>
    </div>
    <div class="container features-strip animate-in delay-2">
      <div class="feature-item"><span class="f-icon"><ui-icon name="check-circle" [size]="16"></ui-icon></span> Authentic &amp; Local <small>100% Cambodian</small></div>
      <div class="feature-item"><span class="f-icon"><ui-icon name="lock" [size]="16"></ui-icon></span> Secure Payment <small>Safe &amp; Trusted</small></div>
      <div class="feature-item"><span class="f-icon"><ui-icon name="truck" [size]="16"></ui-icon></span> Fast Delivery <small>Across Cambodia</small></div>
      <div class="feature-item"><span class="f-icon"><ui-icon name="heart" [size]="16"></ui-icon></span> Support Local <small>Artisans &amp; Farmers</small></div>
    </div>
  </section>

  <section class="container section">
    <div class="section-head">
      <h2>Browse by category</h2>
      <a routerLink="/categories" class="see-all">View all <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
    </div>
    <div class="category-strip">
      @for (c of categories; track c.slug) {
        <a
          class="category-pill"
          routerLink="/products"
          [queryParams]="{ category: c.slug }"
        >
          <div class="cat-icon"><ui-icon [name]="c.icon" [size]="20" [strokeWidth]="1.6"></ui-icon></div>
          <span>{{ c.name }}</span>
          <small>{{ catalog.countByCategory(c.slug) }} products</small>
        </a>
      }
      <a routerLink="/categories" class="category-pill more">
        <div class="cat-icon"><ui-icon name="arrow-right" [size]="18"></ui-icon></div>
        <span>View All</span>
      </a>
    </div>
  </section>

  <section class="container section">
    <div class="section-head">
      <h2>Top picks for Cambodia</h2>
      <a routerLink="/products" class="see-all">See all <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
    </div>
    <div class="product-grid">
      @for (p of topPicks; track p.id) {
        <app-product-card [product]="p" />
      }
    </div>
  </section>

  <section class="container section">
    <div class="section-head">
      <h2>Best sellers</h2>
      <a routerLink="/products" [queryParams]="{ sort: 'featured' }" class="see-all">See all <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
    </div>
    <div class="product-grid">
      @for (p of bestSellers; track p.id) {
        <app-product-card [product]="p" />
      }
    </div>
  </section>

  <section class="container section">
    <div class="section-head">
      <h2>New arrivals</h2>
      <a routerLink="/products" [queryParams]="{ sort: 'newest' }" class="see-all">See all <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
    </div>
    <div class="product-grid">
      @for (p of newArrivals; track p.id) {
        <app-product-card [product]="p" />
      }
    </div>
  </section>

  <section class="container section">
    <div class="section-head"><h2>Popular stores</h2><a routerLink="/stores" class="see-all">View all <ui-icon name="arrow-right" [size]="14"></ui-icon></a></div>
    <div class="stores-row">
      @for (s of stores; track s.id) {
        <a class="store-chip" [routerLink]="['/stores', s.id]">
          <div class="store-logo img-placeholder">{{ initials(s.name) }}</div>
          <div>
            <strong>{{ s.name }}</strong>
            <div class="rating-row"><ui-icon name="star" [size]="12" [filled]="true" color="var(--color-gold)"></ui-icon> {{ s.rating }} · {{ s.location }}</div>
          </div>
        </a>
      }
    </div>
  </section>

  <!-- Collection rows the spec calls for: agro-products and handmade crafts. -->
  <section class="container section">
    <div class="section-head">
      <h2>Local food &amp; agro products</h2>
      <a routerLink="/products" [queryParams]="{ collection: 'agro-products' }" class="see-all">Explore agro products <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
    </div>
    <div class="product-grid">
      @for (p of agroProducts; track p.id) {
        <app-product-card [product]="p" />
      }
    </div>
  </section>

  <section class="container section">
    <div class="section-head">
      <h2>Handmade craft collection</h2>
      <a routerLink="/products" [queryParams]="{ collection: 'handmade-crafts' }" class="see-all">Explore handmade crafts <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
    </div>
    <div class="product-grid">
      @for (p of handmadeCrafts; track p.id) {
        <app-product-card [product]="p" />
      }
    </div>
  </section>

  <section class="container section">
    <div class="section-head"><h2>Shop by collection</h2><a routerLink="/categories" class="see-all">View all <ui-icon name="arrow-right" [size]="14"></ui-icon></a></div>
    <div class="collection-grid">
      @for (c of collectionLinks; track c.label) {
        <a
          class="collection-card img-placeholder dark card-hover"
          routerLink="/products"
          [queryParams]="c.params"
          >{{ c.label }}</a
        >
      }
    </div>
  </section>

  <section class="container section">
    <div class="section-head">
      <h2>Recommended for you</h2>
      <a routerLink="/products" class="see-all">See all <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
    </div>
    <div class="product-grid">
      @for (p of recommended; track p.id) {
        <app-product-card [product]="p" />
      }
    </div>
  </section>

  <section class="container section why-choose">
    <h2 class="center">Why choose KhmerCraft</h2>
    <div class="why-grid">
      <div class="why-item" *ngFor="let w of whyChoose">
        <div class="why-icon"><ui-icon [name]="w.icon" [size]="22" [strokeWidth]="1.6"></ui-icon></div>
        <strong>{{ w.title }}</strong>
        <small>{{ w.desc }}</small>
      </div>
    </div>
  </section>

  <section class="container section three-banners">
    <div class="banner-card become-seller">
      <div>
        <h3>Become a seller</h3>
        <p>Grow your business with KhmerCraft Marketplace</p>
        <button class="btn btn-dark" routerLink="/become-a-seller">Start Selling Now</button>
      </div>
    </div>
    <div class="banner-card support-local">
      <div>
        <h3>Support local artisans</h3>
        <p>Your purchase helps preserve local traditions and families.</p>
        <button class="btn btn-outline-light" routerLink="/about">Learn More</button>
      </div>
    </div>
    <div class="banner-card subscribe">
      <div>
        <h3>Subscribe &amp; save</h3>
        <p>Get updates on new products and special offers.</p>
        <div class="subscribe-box">
          <input type="text" placeholder="Your email address" />
        </div>
      </div>
    </div>
  </section>

  <section class="container section">
    <div class="section-head"><h2>Latest from our blog</h2><a routerLink="/about" class="see-all">Read all <ui-icon name="arrow-right" [size]="14"></ui-icon></a></div>
    <div class="blog-grid">
      <div class="blog-card" *ngFor="let b of blogPosts">
        <div class="blog-thumb img-placeholder">{{ b.title }}</div>
        <span class="tag">{{ b.tag }}</span>
        <h4>{{ b.title }}</h4>
        <small>{{ b.date }} &middot; {{ b.readTime }}</small>
      </div>
    </div>
  </section>

  <section class="container section testimonials">
    <h2 class="center">Loved by thousands of customers</h2>
    <div class="rating-row center-row">
      <span class="stars"><ui-icon *ngFor="let s of [1,2,3,4,5]" name="star" [size]="15" [filled]="true"></ui-icon></span>
      4.8 &middot; From 2,500+ reviews
    </div>
    <div class="testimonial-row">
      <div class="testimonial-card" *ngFor="let t of testimonials">
        <p>&ldquo;{{ t.quote }}&rdquo;</p>
        <strong>{{ t.name }}</strong>
      </div>
    </div>
    <div class="trust-row">
      <span><ui-icon name="shield" [size]="14"></ui-icon> 100% Secure</span>
      <span><ui-icon name="lock" [size]="14"></ui-icon> Trusted Payments</span>
      <span><ui-icon name="map-pin" [size]="14"></ui-icon> Made in Cambodia</span>
    </div>
  </section>

  <app-footer></app-footer>
  `,
  styles: [`
    .hero { background: var(--color-bg-alt); padding: 56px 0 28px; }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
    .hero-copy h1 { font-size: 44px; line-height: 1.1; margin: 16px 0 18px; }
    .hero-copy p { color: var(--color-muted); font-size: 15.5px; margin-bottom: 26px; max-width: 460px; line-height: 1.6; }
    .hero-actions { display: flex; gap: 12px; }
    .hero-image { height: 340px; border-radius: var(--radius-lg); }
    .features-strip { display: flex; justify-content: space-between; margin-top: 40px; flex-wrap: wrap; gap: 20px; }
    .feature-item { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 13.5px; }
    .feature-item small { display: block; font-weight: 400; color: var(--color-muted); font-size: 12px; }
    .f-icon { width: 32px; height: 32px; border-radius: 50%; background: #fff; border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; color: var(--color-accent); flex-shrink: 0; }

    .section { padding: 44px 32px; }
    .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
    .section-head h2 { font-size: 21px; }
    .see-all { color: var(--color-text-secondary); font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; }
    .see-all:hover { color: var(--color-accent); }

    .category-strip { display: grid; grid-template-columns: repeat(9, 1fr); gap: 12px; }
    .category-pill {
      border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 18px 8px;
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; background: #fff;
      transition: all var(--dur-base) var(--ease-standard);
    }
    .category-pill:hover { border-color: var(--color-border-strong); box-shadow: var(--shadow-sm); transform: translateY(-2px); }
    .category-pill.more { background: var(--color-accent); color: #fff; justify-content: center; }
    .cat-icon { color: var(--color-accent); }
    .category-pill.more .cat-icon { color: #fff; }
    .category-pill span { font-size: 12px; font-weight: 600; }
    .category-pill small { font-size: 10px; color: var(--color-muted); }

    .scroll-row { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 10px; scroll-snap-type: x proximity; }
    .product-card { min-width: 210px; flex-shrink: 0; scroll-snap-align: start; }
    .product-thumb { height: 150px; font-size: 11px; padding: 8px; }
    .product-body { padding: 14px; display: flex; flex-direction: column; gap: 4px; }
    .tag { font-size: 10px; color: var(--color-gold); font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
    .product-body h4 { font-size: 14px; }
    .store { font-size: 11.5px; color: var(--color-muted); }
    .price-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .price { font-weight: 700; }
    .cart-add { background: var(--color-accent); border: none; border-radius: var(--radius-sm); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
    .cart-add:hover { background: var(--color-accent-hover); }

    .stores-row { display: flex; gap: 24px; flex-wrap: wrap; }
    .store-chip { display: flex; align-items: center; gap: 10px; padding: 6px; border-radius: var(--radius-sm); }
    .store-chip:hover { background: var(--color-bg-alt); }
    .store-logo { width: 44px; height: 44px; border-radius: 50%; font-size: 10px; }

    .collection-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; }
    .collection-card { height: 116px; border-radius: var(--radius-md); font-size: 12px; }

    .why-choose { text-align: center; }
    .center { text-align: center; margin-bottom: 28px; font-size: 24px; }
    .why-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 24px; }
    .why-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .why-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--color-accent-soft); color: var(--color-accent); display: flex; align-items: center; justify-content: center; }
    .why-item small { color: var(--color-muted); font-size: 12px; }

    .three-banners { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
    .banner-card { border-radius: var(--radius-lg); padding: 28px; color: #fff; display: flex; align-items: flex-end; min-height: 170px; transition: transform var(--dur-base) var(--ease-standard); }
    .banner-card:hover { transform: translateY(-3px); }
    .banner-card h3 { color: #fff; margin-bottom: 8px; }
    .banner-card p { color: rgba(255,255,255,0.8); font-size: 13px; margin-bottom: 16px; }
    .become-seller { background: linear-gradient(135deg, #3a5a45, #22362a); }
    .support-local { background: linear-gradient(135deg, #4b4136, #2c2620); }
    .subscribe { background: linear-gradient(135deg, #a3781f, #6b4d17); }
    .btn-outline-light { border: 1px solid rgba(255,255,255,0.4); color: #fff; background: transparent; }
    .btn-outline-light:hover { background: rgba(255,255,255,0.1); }
    .subscribe .subscribe-box { display: flex; }
    .subscribe input { padding: 11px 12px; border-radius: var(--radius-sm); border: none; font-size: 13px; width: 100%; }

    .blog-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
    .blog-card { display: flex; flex-direction: column; gap: 7px; }
    .blog-thumb { height: 130px; border-radius: var(--radius-md); font-size: 11px; }
    .blog-card h4 { font-size: 14px; }
    .blog-card small { color: var(--color-muted); font-size: 11px; }

    .testimonials { text-align: center; }
    .center-row { justify-content: center; margin-bottom: 28px; gap: 8px; }
    .testimonial-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .testimonial-card { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px; text-align: left; background: #fff; }
    .testimonial-card p { font-size: 13.5px; margin-bottom: 12px; line-height: 1.5; }
    .trust-row { display: flex; justify-content: center; gap: 28px; font-size: 12px; color: var(--color-muted); font-weight: 600; }
    .trust-row span { display: inline-flex; align-items: center; gap: 6px; }

    @media (max-width: 980px) {
      .hero-inner, .three-banners, .why-grid, .blog-grid, .testimonial-row { grid-template-columns: 1fr; }
      .category-strip { grid-template-columns: repeat(3, 1fr); }
      .collection-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class HomeComponent {
  protected readonly catalog = inject(CatalogService);

  // Everything below is derived from CatalogService, so the homepage shows the
  // same catalog as the products page instead of its own hardcoded copy.
  readonly categories = this.catalog.categories;
  readonly stores = this.catalog.stores;
  readonly topPicks = this.catalog.collection('top-picks', 4);
  readonly bestSellers = this.catalog.bestSellers(4);
  readonly newArrivals = this.catalog.newArrivals(4);
  readonly agroProducts = this.catalog.collection('agro-products', 4);
  readonly handmadeCrafts = this.catalog.collection('handmade-crafts', 4);
  readonly recommended = this.catalog.collection('recommended', 4);

  readonly collectionLinks = [
    { label: 'New Arrivals', params: { sort: 'newest' } },
    { label: 'Best Sellers', params: { sort: 'featured' } },
    { label: 'Handmade Crafts', params: { collection: 'handmade-crafts' } },
    { label: 'Local Food & Agro', params: { collection: 'agro-products' } },
    { label: 'Pottery', params: { category: 'pottery' } },
    { label: 'Weaving', params: { category: 'weaving' } },
  ];

  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }


  whyChoose = [
    { icon: 'check-circle', title: '100% Authentic', desc: 'Original products' },
    { icon: 'award', title: 'Quality Assured', desc: 'Support local' },
    { icon: 'shield', title: 'Quality Guaranteed', desc: 'Carefully selected for you' },
    { icon: 'credit-card', title: 'Secure Payments', desc: 'Safe & trusted checkout' },
    { icon: 'truck', title: 'Fast & Reliable', desc: 'Delivery across Cambodia' }
  ];

  blogPosts = [
    { title: 'The Art of Khmer Weaving', tag: 'Culture', date: 'May 15, 2026', readTime: '5 min read' },
    { title: 'How Palm Sugar Is Made', tag: 'Local Food', date: 'May 10, 2026', readTime: '4 min read' },
    { title: 'Why Choose Local Products', tag: 'Sustainability', date: 'May 5, 2026', readTime: '3 min read' },
    { title: 'Healthy Benefits of Brown Rice', tag: 'Local Food', date: 'Apr 28, 2026', readTime: '4 min read' }
  ];

  testimonials = [
    { quote: 'Beautiful handmade crafts, exactly as described.', name: 'Mony, Siem Reap' },
    { quote: 'Supporting local artisans has never been easier.', name: 'Bunthan, Phnom Penh' },
    { quote: 'Fast delivery and authentic Cambodian products.', name: 'Sokha, Battambang' }
  ];
}
