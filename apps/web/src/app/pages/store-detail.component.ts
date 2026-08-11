import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CatalogService } from '../core/catalog/catalog.service';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { ProductCardComponent } from '../components/user/catalog/product-card/product-card.component';

@Component({
  selector: 'app-store-detail',
  imports: [
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    ProductCardComponent,
  ],
  template: `
    <app-navbar />

    @if (store(); as s) {
      <section class="container store-head">
        <nav class="crumbs">
          <a routerLink="/">Home</a> <span>›</span>
          <a routerLink="/stores">Stores</a> <span>›</span>
          <span>{{ s.name }}</span>
        </nav>

        <div class="head-card card">
          <div class="store-logo img-placeholder">{{ s.name }}</div>
          <div class="head-body">
            <span class="badge badge-soft">{{ s.categoryName }}</span>
            <h1>{{ s.name }}</h1>
            <p class="desc">{{ s.description }}</p>
            <div class="meta">
              <span><ui-icon name="map-pin" [size]="14" /> {{ s.location }}</span>
              <span
                ><ui-icon name="star" [size]="14" [filled]="true" />
                {{ s.rating }} ({{ s.reviewCount }} reviews)</span
              >
              <span
                ><ui-icon name="package" [size]="14" />
                {{ products().length }} products</span
              >
            </div>
          </div>
        </div>
      </section>

      <section class="container products-section">
        <h2>Products from this store</h2>
        @if (products().length) {
          <div class="product-grid">
            @for (product of products(); track product.id) {
              <app-product-card [product]="product" />
            }
          </div>
        } @else {
          <p class="empty">This store has no listed products yet.</p>
        }
      </section>
    } @else {
      <section class="container missing">
        <h1>Store not found</h1>
        <p>That store may have closed or the link may be out of date.</p>
        <button class="btn btn-primary" routerLink="/stores">
          Browse all stores
        </button>
      </section>
    }

    <app-footer />
  `,
  styles: [
    `
      .store-head {
        padding: 26px 32px 0;
      }
      .crumbs {
        display: flex;
        gap: 8px;
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 18px;
      }
      .crumbs a:hover {
        color: var(--color-accent);
      }
      .head-card {
        display: flex;
        gap: 24px;
        padding: 24px;
        align-items: center;
      }
      .store-logo {
        width: 132px;
        height: 132px;
        border-radius: var(--radius-md);
        flex-shrink: 0;
        font-size: 11px;
        text-align: center;
      }
      .head-body {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      h1 {
        font-size: 26px;
      }
      .desc {
        color: var(--color-text-secondary);
        font-size: 14px;
        line-height: 1.6;
        max-width: 640px;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 18px;
        margin-top: 4px;
        font-size: 13px;
        color: var(--color-muted);
      }
      .meta span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .products-section {
        padding: 34px 32px 60px;
      }
      .products-section h2 {
        font-size: 19px;
        margin-bottom: 16px;
      }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 18px;
      }
      .empty,
      .missing {
        color: var(--color-muted);
        font-size: 14px;
      }
      .missing {
        padding: 70px 32px 90px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }
      @media (max-width: 1000px) {
        .product-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .head-card {
          flex-direction: column;
          align-items: flex-start;
        }
      }
      @media (max-width: 560px) {
        .product-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class StoreDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);

  private readonly storeId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  protected readonly store = computed(() => this.catalog.store(this.storeId()));

  protected readonly products = computed(() =>
    this.catalog.search({ storeId: this.storeId() }),
  );
}
