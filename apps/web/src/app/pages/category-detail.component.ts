import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogService } from '../core/catalog/catalog.service';
import { ProductQuery, ProductSort } from '../core/catalog/catalog.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { ProductCardComponent } from '../components/user/catalog/product-card/product-card.component';
import { ProductRailComponent } from '../components/user/catalog/product-rail/product-rail.component';

interface PriceBand {
  label: string;
  min?: number;
  max?: number;
}

/** Fixed bands rather than a slider: easier to hit, and shareable in a URL. */
const PRICE_BANDS: PriceBand[] = [
  { label: 'Under $5', max: 5 },
  { label: '$5 - $10', min: 5, max: 10 },
  { label: '$10 - $20', min: 10, max: 20 },
  { label: 'Over $20', min: 20 },
];

const RATING_BANDS = [4.5, 4, 3.5];

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

/**
 * Category landing page.
 *
 * The step between "browse by category" on the homepage and the flat products
 * grid: a banner for the category, its sub-categories as chips, a filter rail
 * and a sortable grid.
 *
 * Sub-category and sort live in the URL, so a filtered view is shareable and
 * the back button steps through choices rather than leaving the page.
 */
@Component({
  selector: 'app-category-detail',
  imports: [
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    ProductCardComponent,
    ProductRailComponent,
  ],
  template: `
    <app-navbar />

    @if (category(); as cat) {
      <!-- Banner -->
      <section class="banner">
        <div class="container banner-inner">
          <div class="banner-copy">
            <nav class="crumbs">
              <a routerLink="/">Home</a> <span>›</span>
              <a routerLink="/categories">Categories</a> <span>›</span>
              <span>{{ cat.name }}</span>
            </nav>

            <h1>{{ cat.name }}</h1>
            <p class="tagline">{{ cat.tagline }}</p>
            <p class="count">
              {{ totalInCategory() }}
              {{ totalInCategory() === 1 ? 'product' : 'products' }}
            </p>

            <!-- Sub-category chips -->
            <div class="subs">
              <button
                class="sub"
                [class.active]="!activeSub()"
                (click)="setSub(null)"
              >
                All {{ cat.name }}
              </button>
              @for (sub of cat.subcategories; track sub.slug) {
                <button
                  class="sub"
                  [class.active]="activeSub() === sub.slug"
                  (click)="setSub(sub.slug)"
                >
                  {{ sub.name }}
                  <span class="sub-count">{{
                    catalog.countBySubcategory(cat.slug, sub.slug)
                  }}</span>
                </button>
              }
            </div>
          </div>

          <div class="banner-art img-placeholder dark">{{ cat.banner }}</div>
        </div>
      </section>

      <!-- Toolbar -->
      <section class="container toolbar">
        <div class="left">
          <span class="showing">
            Showing {{ results().length }} of {{ totalInCategory() }}
          </span>
          @if (activeSub()) {
            <button class="clear" (click)="setSub(null)">
              <ui-icon name="x" [size]="12" /> {{ activeSubName() }}
            </button>
          }
        </div>

        <div class="right">
          <label class="sort">
            <span>Sort by</span>
            <select [value]="sort()" (change)="setSort($event)">
              @for (option of sorts; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <div class="view" role="group" aria-label="View">
            <button
              [class.active]="view() === 'grid'"
              (click)="view.set('grid')"
              aria-label="Grid view"
            >
              <ui-icon name="grid" [size]="15" />
            </button>
            <button
              [class.active]="view() === 'list'"
              (click)="view.set('list')"
              aria-label="List view"
            >
              <ui-icon name="list" [size]="15" />
            </button>
          </div>
        </div>
      </section>

      <!-- Body -->
      <section class="container body">
        <aside class="filters">
          <div class="filters-head">
            <strong><ui-icon name="filter" [size]="14" /> Filters</strong>
            @if (activeCount()) {
              <button class="link" (click)="clearAll()">
                Clear all ({{ activeCount() }})
              </button>
            }
          </div>

          <div class="filter-group">
            <h4>Sub-category</h4>
            <button
              class="filter-row"
              [class.active]="!activeSub()"
              (click)="setSub(null)"
            >
              <span>All</span>
              <span class="n">{{ countIf({ subcategory: undefined }) }}</span>
            </button>
            @for (sub of cat.subcategories; track sub.slug) {
              <button
                class="filter-row"
                [class.active]="activeSub() === sub.slug"
                (click)="setSub(sub.slug)"
              >
                <span>{{ sub.name }}</span>
                <span class="n">{{ countIf({ subcategory: sub.slug }) }}</span>
              </button>
            }
          </div>

          <div class="filter-group">
            <h4>Price</h4>
            @for (band of priceBands; track band.label) {
              <button
                class="filter-row"
                [class.active]="isPriceBand(band)"
                (click)="setPrice(band)"
              >
                <span class="check" [class.on]="isPriceBand(band)">
                  @if (isPriceBand(band)) {
                    <ui-icon name="check" [size]="11" color="#fff" />
                  }
                </span>
                <span class="grow">{{ band.label }}</span>
                <span class="n">{{
                  countIf({ priceMin: band.min, priceMax: band.max })
                }}</span>
              </button>
            }
          </div>

          <div class="filter-group">
            <h4>Rating</h4>
            @for (threshold of ratingBands; track threshold) {
              <button
                class="filter-row"
                [class.active]="minRating() === threshold"
                (click)="setRating(threshold)"
              >
                <span class="check" [class.on]="minRating() === threshold">
                  @if (minRating() === threshold) {
                    <ui-icon name="check" [size]="11" color="#fff" />
                  }
                </span>
                <span class="grow stars-row">
                  <ui-icon name="star" [size]="12" [filled]="true" />
                  {{ threshold }} &amp; up
                </span>
                <span class="n">{{ countIf({ minRating: threshold }) }}</span>
              </button>
            }
          </div>

          <div class="filter-group">
            <h4>Availability</h4>
            <button
              class="filter-row"
              [class.active]="inStockOnly()"
              (click)="toggleInStock()"
            >
              <span class="check" [class.on]="inStockOnly()">
                @if (inStockOnly()) {
                  <ui-icon name="check" [size]="11" color="#fff" />
                }
              </span>
              <span class="grow">In stock only</span>
              <span class="n">{{ countIf({ inStockOnly: true }) }}</span>
            </button>
            <button
              class="filter-row"
              [class.active]="onSaleOnly()"
              (click)="toggleOnSale()"
            >
              <span class="check" [class.on]="onSaleOnly()">
                @if (onSaleOnly()) {
                  <ui-icon name="check" [size]="11" color="#fff" />
                }
              </span>
              <span class="grow">On sale</span>
              <span class="n">{{ countIf({ onSaleOnly: true }) }}</span>
            </button>
          </div>

          <div class="filter-group">
            <h4>Seller</h4>
            @for (store of storesInCategory(); track store.id) {
              <button
                class="filter-row"
                [class.active]="storeId() === store.id"
                (click)="setStore(store.id)"
              >
                <span class="check" [class.on]="storeId() === store.id">
                  @if (storeId() === store.id) {
                    <ui-icon name="check" [size]="11" color="#fff" />
                  }
                </span>
                <span class="grow">{{ store.name }}</span>
                <span class="n">{{ countIf({ storeId: store.id }) }}</span>
              </button>
            }
          </div>

          <div class="filter-group">
            <h4>Other categories</h4>
            @for (other of otherCategories(); track other.slug) {
              <a class="filter-row" [routerLink]="['/categories', other.slug]">
                <span class="grow">{{ other.name }}</span>
                <span class="n">{{ catalog.countByCategory(other.slug) }}</span>
              </a>
            }
          </div>
        </aside>

        <div class="results">
          @if (results().length) {
            <div [class]="view() === 'grid' ? 'product-grid' : 'product-list'">
              @for (product of results(); track product.id) {
                <app-product-card [product]="product" />
              }
            </div>
          } @else {
            <div class="empty">
              <div class="empty-image img-placeholder">
                <ui-icon name="package" [size]="32" />
              </div>
              <h2>Nothing here yet</h2>
              <p>
                @if (activeSub()) {
                  No products in {{ activeSubName() }} at the moment — sellers
                  are still listing in this part of the catalogue.
                } @else {
                  No products in {{ cat.name }} yet.
                }
              </p>
              <div class="empty-actions">
                @if (activeSub()) {
                  <button class="btn btn-primary" (click)="setSub(null)">
                    See all {{ cat.name }}
                  </button>
                }
                <button class="btn btn-outline" routerLink="/products">
                  Browse everything
                </button>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- A category with only a handful of products leaves a lot of empty
           canvas on a wide screen. Rather than stretch the cards to fill it,
           offer somewhere else to go — which is what the space is actually
           good for. -->
      @if (results().length > 0 && results().length < 4 && suggestions().length) {
        <section class="container suggestions">
          <app-product-rail
            title="More from KhmerCraft"
            [products]="suggestions()"
            linkRoute="/products"
          />
        </section>
      }
    } @else {
      <section class="container missing">
        <h1>Category not found</h1>
        <p>That category may have been renamed.</p>
        <button class="btn btn-primary" routerLink="/categories">
          All categories
        </button>
      </section>
    }

    <app-footer />
  `,
  styles: [
    `
      /* ---- banner ---- */
      .banner {
        background: var(--color-bg-alt);
        border-bottom: 1px solid var(--color-border);
      }
      .banner-inner {
        display: grid;
        grid-template-columns: 1fr 400px;
        gap: 36px;
        align-items: center;
        padding-top: 26px;
        padding-bottom: 26px;
      }
      .crumbs {
        display: flex;
        gap: 8px;
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 14px;
      }
      .crumbs a:hover {
        color: var(--color-accent);
      }
      h1 {
        font-size: 34px;
        letter-spacing: -0.03em;
      }
      .tagline {
        margin-top: 8px;
        color: var(--color-text-secondary);
        font-size: 14.5px;
        line-height: 1.6;
        max-width: 46em;
      }
      .count {
        margin-top: 6px;
        color: var(--color-muted);
        font-size: 13px;
      }
      .banner-art {
        height: 190px;
        border-radius: var(--radius-lg);
        font-size: 12px;
      }

      /* ---- sub-category chips ---- */
      .subs {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        margin-top: 20px;
      }
      .sub {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 9px 16px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-full);
        background: #fff;
        font-size: 13.5px;
        font-weight: 550;
        color: var(--color-text-secondary);
      }
      .sub:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }
      .sub.active {
        background: var(--color-accent);
        border-color: var(--color-accent);
        color: #fff;
      }
      .sub-count {
        color: var(--color-muted);
        font-size: 11.5px;
        font-weight: 600;
      }
      .sub.active .sub-count {
        color: rgba(255, 255, 255, 0.75);
      }

      /* ---- toolbar ---- */
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-top: 18px;
        padding-bottom: 14px;
        flex-wrap: wrap;
      }
      .left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .showing {
        color: var(--color-muted);
        font-size: 13px;
      }
      .clear {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-full);
        background: #fff;
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .clear:hover {
        border-color: var(--color-danger);
        color: var(--color-danger);
      }
      .right {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .sort {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--color-muted);
      }
      .sort select {
        padding: 7px 10px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: #fff;
        font-size: 13px;
      }
      .view {
        display: flex;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        overflow: hidden;
      }
      .view button {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        border: 0;
        background: #fff;
        color: var(--color-muted);
      }
      .view button.active {
        background: var(--color-accent-soft);
        color: var(--color-accent);
      }

      /* ---- body ---- */
      .body {
        display: grid;
        grid-template-columns: 232px 1fr;
        gap: 26px;
        align-items: start;
        padding-bottom: 60px;
      }
      .filters {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 18px;
        background: #fff;
        position: sticky;
        top: 100px;
      }
      .filters-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
        font-size: 14px;
      }
      .link {
        border: 0;
        background: none;
        color: var(--color-accent);
        font-size: 12px;
        font-weight: 600;
      }
      .link:hover {
        text-decoration: underline;
      }
      .filter-group + .filter-group {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--color-border);
      }
      .filter-group h4 {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-muted);
        margin-bottom: 9px;
      }
      .filter-row {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 9px;
        padding: 7px 9px;
        border: 0;
        border-radius: var(--radius-xs);
        background: none;
        font-size: 13px;
        color: var(--color-text-secondary);
        text-align: left;
      }
      .filter-row:hover {
        background: var(--color-bg-alt);
        color: var(--color-text);
      }
      .filter-row.active {
        background: var(--color-accent-soft);
        color: var(--color-accent);
        font-weight: 650;
      }
      .filter-row .n {
        color: var(--color-muted);
        font-size: 12px;
        flex-shrink: 0;
      }
      .filter-row .grow {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .filter-row .check {
        display: grid;
        place-items: center;
        width: 15px;
        height: 15px;
        flex-shrink: 0;
        border: 1px solid var(--color-border-strong);
        border-radius: 3px;
        background: #fff;
      }
      .filter-row .check.on {
        background: var(--color-accent);
        border-color: var(--color-accent);
      }
      .filter-row .stars-row {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--color-gold);
      }
      .filters-head strong {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }
      .filters {
        max-height: calc(100vh - 130px);
        overflow-y: auto;
      }

      .product-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 18px;
      }
      /* List view: the card keeps its markup, the row just goes full width. */
      .product-list {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .product-list app-product-card {
        max-width: 100%;
      }

      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 50px 24px 70px;
        gap: 12px;
      }
      .empty-image {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        color: var(--color-muted-2);
      }
      .empty h2 {
        font-size: 18px;
      }
      .empty p {
        color: var(--color-muted);
        font-size: 14px;
        max-width: 400px;
      }
      .empty-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 6px;
      }
      .suggestions {
        padding-top: 8px;
        padding-bottom: 56px;
        border-top: 1px solid var(--color-border);
        margin-top: 12px;
      }
      .missing {
        padding: 70px 32px 90px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }

      @media (max-width: 1050px) {
        .banner-inner {
          grid-template-columns: 1fr;
        }
        .banner-art {
          display: none;
        }
        .body {
          grid-template-columns: 1fr;
        }
        .filters {
          position: static;
        }
        .product-grid {
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
      }
      @media (max-width: 560px) {
        .product-grid {
          grid-template-columns: 1fr;
        }
        h1 {
          font-size: 27px;
        }
      }
    `,
  ],
})
export class CategoryDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly catalog = inject(CatalogService);

  protected readonly sorts = SORTS;
  protected readonly view = signal<'grid' | 'list'>('grid');

  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly category = computed(() =>
    this.catalog.category(this.params().get('slug') ?? ''),
  );

  protected readonly activeSub = computed(() => this.query().get('sub'));
  protected readonly storeId = computed(() => this.query().get('store'));
  protected readonly inStockOnly = computed(() => this.query().get('stock') === '1');
  protected readonly onSaleOnly = computed(() => this.query().get('sale') === '1');
  protected readonly minRating = computed(() => {
    const raw = this.query().get('rating');
    return raw ? Number(raw) : null;
  });
  protected readonly priceMin = computed(() => {
    const raw = this.query().get('min');
    return raw ? Number(raw) : undefined;
  });
  protected readonly priceMax = computed(() => {
    const raw = this.query().get('max');
    return raw ? Number(raw) : undefined;
  });

  protected readonly priceBands = PRICE_BANDS;
  protected readonly ratingBands = RATING_BANDS;

  /** Everything currently applied — the single source for results and counts. */
  private readonly activeQuery = computed<ProductQuery>(() => ({
    category: this.category()?.slug,
    subcategory: this.activeSub() ?? undefined,
    storeId: this.storeId() ?? undefined,
    priceMin: this.priceMin(),
    priceMax: this.priceMax(),
    minRating: this.minRating() ?? undefined,
    inStockOnly: this.inStockOnly() || undefined,
    onSaleOnly: this.onSaleOnly() || undefined,
    sort: this.sort(),
  }));

  protected readonly activeCount = computed(() => {
    const q = this.activeQuery();
    return [
      q.subcategory,
      q.storeId,
      q.priceMin ?? q.priceMax,
      q.minRating,
      q.inStockOnly,
      q.onSaleOnly,
    ].filter(Boolean).length;
  });

  /** Sellers who actually have stock in this category. */
  protected readonly storesInCategory = computed(() => {
    const cat = this.category();
    if (!cat) {
      return [];
    }
    const ids = new Set(
      this.catalog
        .search({ category: cat.slug })
        .map((product) => product.storeId)
        .filter(Boolean),
    );
    return this.catalog.stores.filter((store) => ids.has(store.id));
  });
  protected readonly sort = computed(
    () => (this.query().get('sort') as ProductSort | null) ?? 'featured',
  );

  protected readonly totalInCategory = computed(() => {
    const cat = this.category();
    return cat ? this.catalog.countByCategory(cat.slug) : 0;
  });

  protected readonly activeSubName = computed(() => {
    const slug = this.activeSub();
    return (
      this.category()?.subcategories.find((sub) => sub.slug === slug)?.name ?? ''
    );
  });

  /** The rest of the tree, so a dead end still offers somewhere to go. */
  protected readonly otherCategories = computed(() =>
    this.catalog.categories.filter(
      (candidate) => candidate.slug !== this.category()?.slug,
    ),
  );

  protected readonly results = computed(() =>
    this.category() ? this.catalog.search(this.activeQuery()) : [],
  );

  /**
   * Count for one filter option, with every *other* active filter applied.
   *
   * Counting against the whole category would advertise numbers the user
   * cannot reach — clicking a "12" and landing on 3 results reads as a bug.
   */
  protected countIf(override: Partial<ProductQuery>): number {
    return this.catalog.countWith(this.activeQuery(), override);
  }

  protected isPriceBand(band: PriceBand): boolean {
    return this.priceMin() === band.min && this.priceMax() === band.max;
  }

  protected setPrice(band: PriceBand): void {
    // Clicking the active band clears it, so a band doubles as its own toggle.
    const clearing = this.isPriceBand(band);
    this.merge({
      min: clearing || band.min === undefined ? null : String(band.min),
      max: clearing || band.max === undefined ? null : String(band.max),
    });
  }

  protected setRating(threshold: number): void {
    this.merge({
      rating: this.minRating() === threshold ? null : String(threshold),
    });
  }

  protected toggleInStock(): void {
    this.merge({ stock: this.inStockOnly() ? null : '1' });
  }

  protected toggleOnSale(): void {
    this.merge({ sale: this.onSaleOnly() ? null : '1' });
  }

  protected setStore(id: string): void {
    this.merge({ store: this.storeId() === id ? null : id });
  }

  protected clearAll(): void {
    this.merge({
      sub: null,
      store: null,
      min: null,
      max: null,
      rating: null,
      stock: null,
      sale: null,
    });
  }

  /** Popular items from other categories, to fill out a sparse page. */
  protected readonly suggestions = computed(() => {
    const slug = this.category()?.slug;
    return this.catalog
      .search({ sort: 'rating' })
      .filter((product) => product.categorySlug !== slug)
      .slice(0, 10);
  });

  protected setSub(slug: string | null): void {
    this.merge({ sub: slug });
  }

  protected setSort(event: Event): void {
    this.merge({ sort: (event.target as HTMLSelectElement).value });
  }

  private merge(params: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
