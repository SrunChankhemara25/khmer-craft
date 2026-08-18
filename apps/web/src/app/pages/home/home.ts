import { Component } from '@angular/core';
import { KcIcon } from '../../components/ui/kc-icon';

@Component({
  selector: 'app-home',
  imports: [KcIcon],
  styles: [`
    :host {
      background: #fafbf8;
      color: #222b35;
      display: block;
    }

    .home-container {
      max-width: 1135px;
      margin: 0 auto;
      padding: 0 64px;
    }

    .home-hero {
      padding: 120px 0 70px;
    }

    .hero-grid {
      align-items: center;
      display: grid;
      gap: 72px;
      grid-template-columns: 0.82fr 1fr;
    }

    h1 {
      color: #202833;
      font-size: 54px;
      font-weight: 900;
      letter-spacing: -0.015em;
      line-height: 0.99;
      margin: 0 0 34px;
      max-width: 430px;
    }

    .hero-copy {
      color: #5e6a65;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.55;
      margin: 0 0 29px;
      max-width: 405px;
    }

    .actions {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }

    .btn {
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
      min-width: 156px;
      padding: 15px 21px;
      text-align: center;
      text-decoration: none;
    }

    .btn-primary {
      background: #176242;
      border: 1px solid #176242;
      color: #fff;
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid #176242;
      color: #176242;
    }

    .collage {
      display: grid;
      gap: 16px;
      grid-template-columns: 1.15fr 0.85fr;
    }

    .collage img {
      border-radius: 7px;
      display: block;
      object-fit: cover;
      width: 100%;
    }

    .collage-main {
      height: 294px;
    }

    .collage-side {
      height: 134px;
    }

    .collage-bottom {
      display: grid;
      gap: 16px;
      grid-column: 1 / 3;
      grid-template-columns: 1fr 1fr;
    }

    .collage-bottom img {
      height: 130px;
    }

    .section-title {
      color: #232a32;
      font-size: 31px;
      font-weight: 850;
      letter-spacing: -0.01em;
      line-height: 1.2;
      margin: 0;
      text-align: center;
    }

    .title-underline {
      background: #176242;
      border-radius: 999px;
      height: 3px;
      margin: 14px auto 48px;
      width: 86px;
    }

    .categories {
      padding: 0 0 29px;
    }

    .category-grid {
      display: grid;
      gap: 18px;
      grid-template-columns: 2.05fr 1fr 1fr;
      grid-template-rows: 167px 167px 167px;
    }

    .category-card {
      border-radius: 9px;
      overflow: hidden;
      position: relative;
      text-decoration: none;
    }

    .category-card.large {
      grid-row: span 2;
    }

    .category-card img {
      height: 100%;
      object-fit: cover;
      width: 100%;
    }

    .category-card::after {
      background: linear-gradient(0deg, rgba(17, 44, 33, 0.68), rgba(17, 44, 33, 0.06));
      content: "";
      inset: 0;
      position: absolute;
    }

    .cat-label {
      bottom: 21px;
      color: #fff;
      font-size: 18px;
      font-weight: 850;
      left: 22px;
      line-height: 1.1;
      position: absolute;
      z-index: 1;
    }

    .cat-label small {
      display: block;
      font-size: 11px;
      font-weight: 650;
      margin-top: 7px;
      opacity: 0.88;
    }

    .featured {
      background: #f2f5f0;
      border-radius: 0 24px 24px 0;
      margin-top: 0;
      padding: 108px 0 82px;
    }

    .section-head {
      align-items: end;
      display: flex;
      justify-content: space-between;
      margin-bottom: 34px;
    }

    .eyebrow {
      color: #459079;
      display: block;
      font-size: 11px;
      font-weight: 850;
      letter-spacing: 0.08em;
      margin-bottom: 9px;
      text-transform: uppercase;
    }

    .section-head h2,
    .stores h2,
    .philosophy h2 {
      color: #222b35;
      font-size: 31px;
      font-weight: 850;
      letter-spacing: -0.01em;
      line-height: 1.2;
      margin: 0;
    }

    .view-all {
      align-items: center;
      color: #176242;
      display: flex;
      font-size: 11px;
      font-weight: 850;
      gap: 6px;
      text-decoration: none;
    }

    .products {
      display: grid;
      gap: 22px;
      grid-template-columns: repeat(4, 1fr);
    }

    .product {
      background: #fff;
      border: 1px solid #e9eee7;
      border-radius: 7px;
      overflow: hidden;
    }

    .product img {
      display: block;
      height: 230px;
      object-fit: cover;
      width: 100%;
    }

    .product-body {
      padding: 15px 13px 14px;
    }

    .product h3 {
      color: #3a413e;
      font-size: 13px;
      font-weight: 800;
      margin: 0 0 3px;
    }

    .product p {
      color: #6a756f;
      font-size: 11px;
      font-weight: 650;
      margin: 0 0 8px;
    }

    .product-meta {
      align-items: center;
      color: #176242;
      display: flex;
      font-size: 12px;
      font-weight: 800;
      justify-content: space-between;
    }

    .stars {
      color: #6b4a25;
      font-size: 10px;
      letter-spacing: 1px;
    }

    .stores {
      padding: 38px 0 80px;
    }

    .stores-head {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 43px;
    }

    .round-controls {
      display: flex;
      gap: 10px;
    }

    .round-controls button {
      align-items: center;
      background: #fff;
      border: 1px solid #d5ded5;
      border-radius: 50%;
      color: #176242;
      display: flex;
      height: 37px;
      justify-content: center;
      width: 37px;
    }

    .store-row {
      display: grid;
      gap: 25px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      overflow: hidden;
    }

    .store-card {
      background: #fff;
      border: 1px solid #e5ebe4;
      border-radius: 8px;
      min-width: 255px;
      padding: 14px;
    }

    .store-top {
      align-items: center;
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }

    .store-top img {
      border-radius: 50%;
      height: 44px;
      object-fit: cover;
      width: 44px;
    }

    .store-top h3 {
      color: #2a332f;
      font-size: 13px;
      font-weight: 850;
      margin: 0 0 3px;
    }

    .store-top p {
      color: #6a756f;
      font-size: 10.5px;
      font-weight: 650;
      margin: 0;
    }

    .store-products {
      display: grid;
      gap: 9px;
      grid-template-columns: repeat(3, 1fr);
      margin-bottom: 13px;
    }

    .store-products img {
      border-radius: 5px;
      height: 66px;
      object-fit: cover;
      width: 100%;
    }

    .visit {
      background: transparent;
      border: 1px solid #176242;
      border-radius: 5px;
      color: #176242;
      display: block;
      font-size: 11px;
      font-weight: 800;
      padding: 9px;
      text-align: center;
      text-decoration: none;
    }

    .philosophy {
      padding: 0 0 111px;
    }

    .philosophy h2 {
      margin-bottom: 38px;
      text-align: center;
    }

    .philosophy-grid {
      display: grid;
      gap: 24px;
      grid-template-columns: repeat(3, 1fr);
    }

    .belief {
      background: #fff;
      border: 1px solid #e8ede7;
      border-radius: 8px;
      padding: 31px 31px 36px;
      text-align: center;
    }

    .icon-pill {
      align-items: center;
      background: #b7e4c7;
      border-radius: 50%;
      color: #176242;
      display: flex;
      height: 61px;
      justify-content: center;
      margin: 0 auto 21px;
      width: 61px;
    }

    .belief h3 {
      color: #2c3330;
      font-size: 14px;
      font-weight: 850;
      margin: 0 0 10px;
    }

    .belief p {
      color: #6b756f;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.45;
      margin: 0;
    }

    .home-cta {
      padding: 0 0 162px;
    }

    .cta-photo {
      background-image:
        linear-gradient(90deg, rgba(23, 70, 48, 0.78), rgba(23, 70, 48, 0.3)),
        url('https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1500&q=85');
      background-position: center;
      background-size: cover;
      border-radius: 0 0 23px 23px;
      min-height: 355px;
      padding: 61px 60px;
    }

    .cta-photo h2 {
      color: #fff;
      font-size: 40px;
      font-weight: 900;
      letter-spacing: -0.01em;
      line-height: 1.08;
      margin: 0 0 22px;
      max-width: 520px;
    }

    .cta-photo p {
      color: rgba(255, 255, 255, 0.84);
      font-size: 13px;
      font-weight: 650;
      line-height: 1.6;
      margin: 0 0 28px;
      max-width: 560px;
    }

    .cta-photo .btn {
      background: #fff;
      border-color: #fff;
      color: #176242;
      min-width: 185px;
    }

    @media (max-width: 980px) {
      .home-container {
        padding: 0 24px;
      }

      .hero-grid,
      .category-grid,
      .products,
      .philosophy-grid {
        grid-template-columns: 1fr 1fr;
      }

      .hero-grid {
        gap: 38px;
      }

      .store-row {
        overflow-x: auto;
      }

      .category-card.large {
        grid-row: span 1;
      }
    }

    @media (max-width: 640px) {
      h1 {
        font-size: 40px;
      }

      .home-hero {
        padding-top: 54px;
      }

      .hero-grid,
      .category-grid,
      .products,
      .philosophy-grid {
        grid-template-columns: 1fr;
      }

      .collage {
        grid-template-columns: 1fr;
      }

      .collage-bottom {
        grid-column: auto;
        grid-template-columns: 1fr;
      }

      .featured {
        border-radius: 0;
      }

      .section-head,
      .stores-head {
        align-items: flex-start;
        flex-direction: column;
        gap: 14px;
      }

      .cta-photo {
        border-radius: 0 0 18px 18px;
        padding: 42px 24px;
      }
    }
  `],
  template: `
    <section class="home-hero">
      <div class="home-container hero-grid">
        <div>
          <h1>Discover Cambodian Handmade &amp; Local Products</h1>
          <p class="hero-copy">
            Empowering local artisans by bringing the soul of Cambodian heritage directly to your
            home. Curated, authentic, and sustainably sourced.
          </p>
          <div class="actions">
            <a class="btn btn-primary" href="#featured">Explore Collections</a>
            <a class="btn btn-secondary" href="#stores">Meet the Artisans</a>
          </div>
        </div>

        <div class="collage">
          <img
            class="collage-main"
            src="https://images.unsplash.com/photo-1601760562234-9814eea6663a?w=700&q=85"
            alt="Green handmade textile"
          />
          <img
            class="collage-side"
            src="https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=420&q=85"
            alt="Pottery artisan"
          />
          <div class="collage-bottom">
            <img
              src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=420&q=85"
              alt="Local spices"
            />
            <img
              src="https://images.unsplash.com/photo-1595428774223-ef52624120e2?w=420&q=85"
              alt="Woven basket"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="categories">
      <div class="home-container">
        <h2 class="section-title">Shop by Category</h2>
        <div class="title-underline"></div>
        <div class="category-grid">
          @for (cat of categories; track cat.title) {
            <a href="#" class="category-card" [class.large]="cat.large">
              <img [src]="cat.image" [alt]="cat.title" />
              <span class="cat-label">
                {{ cat.title }}
                @if (cat.subtitle) {
                  <small>{{ cat.subtitle }}</small>
                }
              </span>
            </a>
          }
        </div>
      </div>
    </section>

    <section id="featured" class="featured">
      <div class="home-container">
        <div class="section-head">
          <div>
            <span class="eyebrow">Curated Selection</span>
            <h2>Featured Products</h2>
          </div>
          <a class="view-all" href="#">
            View All Products
            <kc-icon name="chevron-right" [size]="15" />
          </a>
        </div>

        <div class="products">
          @for (product of products; track product.title) {
            <article class="product">
              <img [src]="product.image" [alt]="product.title" />
              <div class="product-body">
                <h3>{{ product.title }}</h3>
                <p>{{ product.maker }}</p>
                <div class="product-meta">
                  <span>{{ product.price }}</span>
                  <span class="stars">*****</span>
                </div>
              </div>
            </article>
          }
        </div>
      </div>
    </section>

    <section id="stores" class="stores">
      <div class="home-container">
        <div class="stores-head">
          <h2>Popular Artisan Stores</h2>
          <div class="round-controls" aria-hidden="true">
            <button type="button"><kc-icon name="chevron-right" [size]="17" /></button>
            <button type="button"><kc-icon name="chevron-right" [size]="17" /></button>
          </div>
        </div>

        <div class="store-row">
          @for (store of stores; track store.name) {
            <article class="store-card">
              <div class="store-top">
                <img [src]="store.avatar" [alt]="store.name" />
                <div>
                  <h3>{{ store.name }}</h3>
                  <p>{{ store.place }}</p>
                </div>
              </div>
              <div class="store-products">
                @for (img of store.products; track img) {
                  <img [src]="img" alt="Store product preview" />
                }
              </div>
              <a class="visit" href="#">Visit Store</a>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="philosophy">
      <div class="home-container">
        <h2>The KhmerCraft Philosophy</h2>
        <div class="philosophy-grid">
          @for (item of philosophy; track item.title) {
            <article class="belief">
              <div class="icon-pill"><kc-icon [name]="item.icon" [size]="25" /></div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="home-cta">
      <div class="home-container">
        <div class="cta-photo">
          <h2>Share Your Craft with the World</h2>
          <p>
            Join our growing community of Cambodian artisans and reach global customers.
            We provide the tools and platform; you provide the soul.
          </p>
          <a class="btn" href="/seller">Start Selling Today</a>
        </div>
      </div>
    </section>
  `,
})
export class HomePage {
  protected readonly categories = [
    {
      title: 'Handmade Crafts',
      subtitle: 'Timeless heritage pieces',
      large: true,
      image: 'https://images.unsplash.com/photo-1560421683-6856ea585c78?w=900&q=85',
    },
    {
      title: 'Pottery',
      image: 'https://images.unsplash.com/photo-1610701596007-765020692ae2?w=600&q=85',
    },
    {
      title: 'Weaving',
      image: 'https://images.unsplash.com/photo-1586105251261-72a75659a425?w=600&q=85',
    },
    {
      title: 'Palm Sugar',
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=85',
    },
    {
      title: 'Rice Products',
      image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=600&q=85',
    },
    {
      title: 'Local Food',
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=85',
    },
  ];

  protected readonly products = [
    {
      title: 'Angkor Woodworks',
      maker: 'Hand-Carved Apsara',
      price: '$45.00',
      image: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=500&q=85',
    },
    {
      title: 'Mekong Weavers',
      maker: 'Indigo Cotton Krama',
      price: '$18.00',
      image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=500&q=85',
    },
    {
      title: 'Kampot Spices Co.',
      maker: 'Black Kampot Pepper',
      price: '$12.50',
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&q=85',
    },
    {
      title: 'Siem Reap Ceramics',
      maker: 'Ceramic Tea Set',
      price: '$68.00',
      image: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?w=500&q=85',
    },
  ];

  protected readonly stores = [
    {
      name: 'Lotus Artisans',
      place: 'Battambang Province',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=85',
      products: [
        'https://images.unsplash.com/photo-1517705008128-361805f42e86?w=180&q=85',
        'https://images.unsplash.com/photo-1560421683-6856ea585c78?w=180&q=85',
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=180&q=85',
      ],
    },
    {
      name: 'Stone Legacy',
      place: 'Siem Reap Province',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=85',
      products: [
        'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=180&q=85',
        'https://images.unsplash.com/photo-1601760562234-9814eea6663a?w=180&q=85',
        'https://images.unsplash.com/photo-1610701596007-765020692ae2?w=180&q=85',
      ],
    },
    {
      name: 'Palm Delights',
      place: 'Kampong Speu',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&q=85',
      products: [
        'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=180&q=85',
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=180&q=85',
        'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=180&q=85',
      ],
    },
    {
      name: 'Golden Loom',
      place: 'Phnom Penh',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=85',
      products: [
        'https://images.unsplash.com/photo-1586105251261-72a75659a425?w=180&q=85',
        'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=180&q=85',
        'https://images.unsplash.com/photo-1590874103328-eacfd0a9c3f5?w=180&q=85',
      ],
    },
  ];

  protected readonly philosophy = [
    {
      title: 'Authentically Local',
      description:
        'Every item is 100% handmade or produced in Cambodia by local communities, preserving our cultural heritage.',
      icon: 'shield',
    },
    {
      title: 'Fair Trade Support',
      description:
        'We ensure artisans receive fair compensation, empowering them to sustain their craft and support their families.',
      icon: 'heart',
    },
    {
      title: 'Sustainable Path',
      description:
        'Committed to eco-friendly practices, focusing on natural materials and minimizing environmental impact.',
      icon: 'leaf',
    },
  ];
}
