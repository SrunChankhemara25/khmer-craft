import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogService } from '../core/catalog/catalog.service';
import { ProductSort } from '../core/catalog/catalog.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { ProductCardComponent } from '../components/user/catalog/product-card/product-card.component';

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest' },
];

@Component({
  selector: 'app-products',
  imports: [
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    ProductCardComponent,
  ],
  template: `
    <app-navbar />

    <section class="container head">
      <nav class="crumbs">
        <a routerLink="/">Home</a> <span>›</span> <span>Products</span>
      </nav>

      <div class="head-row">
        <div>
          <h1>{{ heading() }}</h1>
          <p class="count">
            {{ results().length }}
            {{ results().length === 1 ? 'product' : 'products' }}
            @if (search()) {
              <span>for “{{ search() }}”</span>
            }
          </p>
        </div>

        <label class="sort">
          <span>Sort</span>
          <select [value]="sort()" (change)="setSort($event)">
            @for (option of sorts; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
      </div>

      <!-- Category chips: the spec's primary filter affordance. -->
      <div class="chips">
        <button
          class="chip"
          [class.active]="!category()"
          (click)="setCategory(null)"
        >
          All
        </button>
        @for (cat of categories; track cat.slug) {
          <button
            class="chip"
            [class.active]="category() === cat.slug"
            (click)="setCategory(cat.slug)"
          >
            {{ cat.name }}
          </button>
        }
      </div>

      @if (search() || category() || collection()) {
        <button class="clear" (click)="clearAll()">
          <ui-icon name="x" [size]="13" /> Clear filters
        </button>
      }
    </section>

    <section class="container grid-section">
      @if (results().length) {
        <div class="product-grid">
          @for (product of results(); track product.id) {
            <app-product-card [product]="product" />
          }
        </div>
      } @else {
        <div class="no-results">
          <div class="empty-image img-placeholder">
            <ui-icon name="search" [size]="34" />
          </div>
          <h2>No products match that search</h2>
          <p>
            Try a different keyword, or clear the filters to see everything we
            have.
          </p>
          <button class="btn btn-primary" (click)="clearAll()">
            Clear filters
          </button>
        </div>
      }
    </section>

    <app-footer />
  `,
  styles: [
    `
      .head {
        padding: 26px 32px 0;
      }
      .crumbs {
        display: flex;
        gap: 8px;
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 16px;
      }
      .crumbs a:hover {
        color: var(--color-accent);
      }
      .head-row {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
      }
      h1 {
        font-size: 26px;
      }
      .count {
        margin-top: 5px;
        color: var(--color-muted);
        font-size: 13.5px;
      }
      .sort {
        display: flex;
        align-items: center;
        gap: 9px;
        font-size: 13px;
        color: var(--color-muted);
      }
      .sort select {
        padding: 8px 11px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: #fff;
        font-size: 13px;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 20px;
      }
      .chip {
        padding: 7px 14px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-full);
        background: #fff;
        font-size: 12.5px;
        font-weight: 550;
        color: var(--color-text-secondary);
      }
      .chip:hover {
        border-color: var(--color-muted);
        background: var(--color-bg-alt);
      }
      .chip.active {
        background: var(--color-accent);
        border-color: var(--color-accent);
        color: #fff;
      }
      .clear {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 14px;
        padding: 0;
        border: 0;
        background: none;
        color: var(--color-accent);
        font-size: 12.5px;
        font-weight: 600;
      }
      .clear:hover {
        text-decoration: underline;
      }
      .grid-section {
        padding: 26px 32px 60px;
      }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 18px;
      }
      .no-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 50px 32px 70px;
        gap: 12px;
      }
      .empty-image {
        width: 140px;
        height: 140px;
        border-radius: 50%;
        color: var(--color-muted-2);
        margin-bottom: 8px;
      }
      .no-results h2 {
        font-size: 19px;
      }
      .no-results p {
        color: var(--color-muted);
        font-size: 14px;
        max-width: 400px;
        margin-bottom: 8px;
      }
      @media (max-width: 1100px) {
        .product-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }
      @media (max-width: 820px) {
        .product-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 520px) {
        .product-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ProductsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);

  protected readonly categories = this.catalog.categories;
  protected readonly sorts = SORTS;

  // The URL is the single source of truth for filter state, so a filtered view
  // is shareable and the back button steps back through filters.
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly search = computed(() => this.params().get('search') ?? '');
  protected readonly category = computed(() => this.params().get('category'));
  protected readonly collection = computed(() =>
    this.params().get('collection'),
  );
  protected readonly sort = computed(
    () => (this.params().get('sort') as ProductSort | null) ?? 'featured',
  );

  protected readonly results = computed(() =>
    this.catalog.search({
      search: this.search(),
      category: this.category() ?? undefined,
      collection: this.collection() ?? undefined,
      sort: this.sort(),
    }),
  );

  protected readonly heading = computed(() => {
    const categorySlug = this.category();
    if (categorySlug) {
      return this.catalog.category(categorySlug)?.name ?? 'Products';
    }
    const collection = this.collection();
    if (collection) {
      return collection
        .split('-')
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ');
    }
    return this.search() ? 'Search results' : 'All products';
  });

  protected setCategory(slug: string | null): void {
    this.merge({ category: slug });
  }

  protected setSort(event: Event): void {
    this.merge({ sort: (event.target as HTMLSelectElement).value });
  }

  protected clearAll(): void {
    this.router.navigate(['/products'], { queryParams: {} });
  }

  private merge(params: Record<string, string | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
