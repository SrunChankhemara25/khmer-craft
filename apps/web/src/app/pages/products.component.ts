import { Component, computed, inject, signal } from '@angular/core';
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

const PRICE_OPTIONS = [
  { value: '', label: 'Any price' },
  { value: 'under-5', label: 'Under $5' },
  { value: '5-10', label: '$5–$10' },
  { value: '10-20', label: '$10–$20' },
  { value: 'over-20', label: 'Over $20' },
];

const RATING_OPTIONS = [
  { value: null, label: 'Any rating' },
  { value: 4.5, label: '4.5 & up' },
  { value: 4.0, label: '4.0 & up' },
  { value: 3.5, label: '3.5 & up' },
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

    <header class="products-intro">
      <div class="container products-intro-inner">
        <nav class="crumbs">
          <a routerLink="/">Home</a> <span>›</span> <span>Products</span>
        </nav>

        <div class="intro-row">
          <div>
            <span class="products-label">Shop products</span>
            <h1>{{ heading() }}</h1>
          </div>
          <span class="products-total">
            @if (catalog.loaded()) {
              {{ results().length }}
              {{ results().length === 1 ? 'product' : 'products' }}
              @if (search()) {
                <span>for “{{ search() }}”</span>
              }
            } @else {
              <ui-icon class="total-spinner" name="loader" [size]="13" />
              Loading catalogue
            }
          </span>
        </div>
      </div>
    </header>

    <section class="container filters-bar">
      <!-- Category chips: the spec's primary filter affordance. The fade
           wrapper hints there's more to scroll on narrow screens, where the
           scrollbar itself is hidden. -->
      <div class="scroll-fade">
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
      </div>

      <!-- Click backdrop for open dropdown popovers -->
      @if (openDropdown()) {
        <div class="dropdown-backdrop" (click)="closeDropdowns()"></div>
      }

      <div class="filters-row">
        <div class="quick-filters" aria-label="Product filters">
          <!-- All Filters button -->
          <button
            type="button"
            class="filter-trigger-btn"
            [class.active]="drawerOpen()"
            (click)="drawerOpen.set(true)"
          >
            <ui-icon name="filter" [size]="14" />
            <span>Filters</span>
            @if (activeFilterCount(); as cnt) {
              <span class="filter-count-badge">{{ cnt }}</span>
            }
          </button>

          <!-- Price dropdown button with checkboxes -->
          <div class="filter-dropdown-wrapper">
            <button
              type="button"
              class="filter-btn"
              [class.active]="!!priceBand()"
              (click)="toggleDropdown('price', $event)"
              aria-haspopup="true"
              [attr.aria-expanded]="openDropdown() === 'price'"
            >
              <span>{{ priceLabel() }}</span>
              <ui-icon name="chevron-down" [size]="13" />
            </button>

            @if (openDropdown() === 'price') {
              <div class="dropdown-popover" (click)="$event.stopPropagation()">
                <div class="popover-header">
                  <span>Price Range</span>
                </div>
                <div class="popover-list">
                  @for (band of priceOptions; track band.value) {
                    <button
                      type="button"
                      class="filter-option-row"
                      [class.active]="priceBand() === band.value"
                      (click)="selectPrice(band.value)"
                    >
                      <span class="check" [class.on]="priceBand() === band.value">
                        @if (priceBand() === band.value) {
                          <ui-icon name="check" [size]="11" color="#fff" />
                        }
                      </span>
                      <span class="grow">{{ band.label }}</span>
                      <span class="n">({{ countForPrice(band.value) }})</span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Rating dropdown button with checkboxes -->
          <div class="filter-dropdown-wrapper">
            <button
              type="button"
              class="filter-btn"
              [class.active]="!!minRating()"
              (click)="toggleDropdown('rating', $event)"
              aria-haspopup="true"
              [attr.aria-expanded]="openDropdown() === 'rating'"
            >
              <span>{{ ratingLabel() }}</span>
              <ui-icon name="chevron-down" [size]="13" />
            </button>

            @if (openDropdown() === 'rating') {
              <div class="dropdown-popover" (click)="$event.stopPropagation()">
                <div class="popover-header">
                  <span>Customer Rating</span>
                </div>
                <div class="popover-list">
                  @for (r of ratingOptions; track r.label) {
                    <button
                      type="button"
                      class="filter-option-row"
                      [class.active]="(r.value === null && !minRating()) || (r.value !== null && minRating() === r.value)"
                      (click)="selectRating(r.value)"
                    >
                      <span class="check" [class.on]="(r.value === null && !minRating()) || (r.value !== null && minRating() === r.value)">
                        @if ((r.value === null && !minRating()) || (r.value !== null && minRating() === r.value)) {
                          <ui-icon name="check" [size]="11" color="#fff" />
                        }
                      </span>
                      <span class="grow stars-row">
                        @if (r.value !== null) {
                          <ui-icon name="star" [size]="12" [filled]="true" />
                        }
                        {{ r.label }}
                      </span>
                      <span class="n">({{ countForRating(r.value) }})</span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <!-- In stock toggle button with checkbox inside -->
          <button
            type="button"
            class="filter-btn toggle-filter"
            [class.active]="inStockOnly()"
            (click)="toggleInStock()"
          >
            <span class="check" [class.on]="inStockOnly()">
              @if (inStockOnly()) {
                <ui-icon name="check" [size]="11" color="#fff" />
              }
            </span>
            <span>In stock</span>
          </button>

          <!-- On sale toggle button with checkbox inside -->
          <button
            type="button"
            class="filter-btn toggle-filter"
            [class.active]="onSaleOnly()"
            (click)="toggleSale()"
          >
            <span class="check" [class.on]="onSaleOnly()">
              @if (onSaleOnly()) {
                <ui-icon name="check" [size]="11" color="#fff" />
              }
            </span>
            <span>On sale</span>
          </button>

          @if (hasFilters()) {
            <button class="clear" (click)="clearAll()">
              <ui-icon name="x" [size]="13" /> Clear filters
            </button>
          }
        </div>

        <!-- Sort dropdown with checkboxes -->
        <div class="filter-dropdown-wrapper sort-wrapper">
          <button
            type="button"
            class="filter-btn sort-btn"
            (click)="toggleDropdown('sort', $event)"
            aria-haspopup="true"
            [attr.aria-expanded]="openDropdown() === 'sort'"
          >
            <span class="sort-prefix">Sort:</span>
            <strong>{{ currentSortLabel() }}</strong>
            <ui-icon name="chevron-down" [size]="13" />
          </button>

          @if (openDropdown() === 'sort') {
            <div class="dropdown-popover dropdown-popover-right" (click)="$event.stopPropagation()">
              <div class="popover-header">
                <span>Sort by</span>
              </div>
              <div class="popover-list">
                @for (option of sorts; track option.value) {
                  <button
                    type="button"
                    class="filter-option-row"
                    [class.active]="sort() === option.value"
                    (click)="selectSort(option.value)"
                  >
                    <span class="check" [class.on]="sort() === option.value">
                      @if (sort() === option.value) {
                        <ui-icon name="check" [size]="11" color="#fff" />
                      }
                    </span>
                    <span class="grow">{{ option.label }}</span>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- All Filters Drawer matching category-detail structure -->
    @if (drawerOpen()) {
      <div class="drawer-backdrop" (click)="drawerOpen.set(false)"></div>
      <aside class="filters-drawer">
        <div class="drawer-head">
          <div class="drawer-title">
            <ui-icon name="filter" [size]="17" />
            <strong>Filters</strong>
            @if (activeFilterCount(); as cnt) {
              <span class="filter-count-badge">{{ cnt }}</span>
            }
          </div>
          <button type="button" class="drawer-close-btn" (click)="drawerOpen.set(false)" aria-label="Close filters">
            <ui-icon name="x" [size]="18" />
          </button>
        </div>

        <div class="drawer-body">
          <!-- Categories with checkboxes -->
          <div class="drawer-group">
            <h4>Category</h4>
            <button
              type="button"
              class="filter-row"
              [class.active]="!category()"
              (click)="setCategory(null)"
            >
              <span class="check" [class.on]="!category()">
                @if (!category()) {
                  <ui-icon name="check" [size]="11" color="#fff" />
                }
              </span>
              <span class="grow">All Categories</span>
            </button>
            @for (cat of categories; track cat.slug) {
              <button
                type="button"
                class="filter-row"
                [class.active]="category() === cat.slug"
                (click)="setCategory(cat.slug)"
              >
                <span class="check" [class.on]="category() === cat.slug">
                  @if (category() === cat.slug) {
                    <ui-icon name="check" [size]="11" color="#fff" />
                  }
                </span>
                <span class="grow">{{ cat.name }}</span>
              </button>
            }
          </div>

          <!-- Price with checkboxes -->
          <div class="drawer-group">
            <h4>Price</h4>
            @for (band of priceOptions; track band.value) {
              <button
                type="button"
                class="filter-row"
                [class.active]="priceBand() === band.value"
                (click)="selectPrice(band.value)"
              >
                <span class="check" [class.on]="priceBand() === band.value">
                  @if (priceBand() === band.value) {
                    <ui-icon name="check" [size]="11" color="#fff" />
                  }
                </span>
                <span class="grow">{{ band.label }}</span>
                <span class="n">({{ countForPrice(band.value) }})</span>
              </button>
            }
          </div>

          <!-- Rating with checkboxes -->
          <div class="drawer-group">
            <h4>Rating</h4>
            @for (r of ratingOptions; track r.label) {
              <button
                type="button"
                class="filter-row"
                [class.active]="(r.value === null && !minRating()) || (r.value !== null && minRating() === r.value)"
                (click)="selectRating(r.value)"
              >
                <span class="check" [class.on]="(r.value === null && !minRating()) || (r.value !== null && minRating() === r.value)">
                  @if ((r.value === null && !minRating()) || (r.value !== null && minRating() === r.value)) {
                    <ui-icon name="check" [size]="11" color="#fff" />
                  }
                </span>
                <span class="grow stars-row">
                  @if (r.value !== null) {
                    <ui-icon name="star" [size]="12" [filled]="true" />
                  }
                  {{ r.label }}
                </span>
                <span class="n">({{ countForRating(r.value) }})</span>
              </button>
            }
          </div>

          <!-- Availability with checkboxes -->
          <div class="drawer-group">
            <h4>Availability</h4>
            <button
              type="button"
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
            </button>
            <button
              type="button"
              class="filter-row"
              [class.active]="onSaleOnly()"
              (click)="toggleSale()"
            >
              <span class="check" [class.on]="onSaleOnly()">
                @if (onSaleOnly()) {
                  <ui-icon name="check" [size]="11" color="#fff" />
                }
              </span>
              <span class="grow">On sale</span>
            </button>
          </div>
        </div>

        <div class="drawer-footer">
          @if (hasFilters()) {
            <button type="button" class="btn btn-ghost btn-sm" (click)="clearAll()">Clear filters</button>
          }
          <button type="button" class="btn btn-primary btn-sm btn-apply" (click)="drawerOpen.set(false)">
            View {{ results().length }} Products
          </button>
        </div>
      </aside>
    }

    <section class="container grid-section" [attr.aria-busy]="!catalog.loaded()">
      @if (!catalog.loaded()) {
        <div class="catalog-state catalog-loading" aria-live="polite">
          <span class="loading-mark"><ui-icon class="spin" name="loader" [size]="22" /></span>
          <div>
            <span class="state-eyebrow">KhmerCraft marketplace</span>
            <h2>Loading products</h2>
            <p>Finding the latest pieces from local sellers.</p>
          </div>
        </div>
      } @else if (catalog.productError()) {
        <div class="catalog-state error-state" role="alert">
          <div class="state-icon"><ui-icon name="alert-circle" [size]="30" /></div>
          <h2>We couldn’t load the marketplace</h2>
          <p>{{ catalog.productError() }}</p>
          <button class="btn btn-primary" type="button" (click)="catalog.load()">
            Try again
          </button>
        </div>
      } @else if (results().length) {
        <div class="product-grid">
          @for (product of results(); track product.id) {
            <app-product-card [product]="product" />
          }
        </div>
      } @else {
        <div class="no-results">
          <span class="empty-mark"><ui-icon name="search" [size]="22" /></span>
          <h2>No matching products</h2>
          <p>
            Try another search or clear the filters to browse the full
            marketplace.
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
      /* Same tinted banner treatment as the category page — a plain white
         heading here was the odd one out next to every other listing page. */
      .products-intro {
        background: var(--color-bg-alt);
        border-bottom: 1px solid var(--color-border);
      }
      .products-intro-inner {
        padding: 18px 32px 20px;
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
      .intro-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
      }
      .products-label {
        display: block;
        margin-bottom: 3px;
        color: var(--color-accent);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .1em;
        text-transform: uppercase;
      }
      h1 {
        font-size: clamp(22px, 2vw, 28px);
        letter-spacing: -.02em;
      }
      .products-total {
        align-items: center;
        display: inline-flex;
        gap: 6px;
        padding: 7px 12px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-full);
        background: var(--color-surface);
        color: var(--color-muted);
        font-size: 11.5px;
        white-space: nowrap;
      }
      .total-spinner { animation: spin 900ms linear infinite; color: var(--color-accent); }
      .filters-bar {
        padding: 18px 32px 0;
      }
      .filters-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        margin-top: 14px;
        position: relative;
      }
      .quick-filters {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }
      .filter-dropdown-wrapper {
        position: relative;
      }
      .filter-btn {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 36px;
        padding: 0 14px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-full);
        background: #fff;
        color: var(--color-text-secondary);
        font: inherit;
        font-size: 12px;
        font-weight: 550;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .filter-btn:hover {
        border-color: var(--color-muted);
        background: var(--color-bg-alt);
        color: var(--color-text);
      }
      .filter-btn.active {
        background: var(--color-accent-soft);
        border-color: var(--color-accent);
        color: var(--color-accent);
        font-weight: 650;
      }
      .filter-trigger-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 36px;
        padding: 0 13px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-full);
        background: #fff;
        color: var(--color-text);
        font: inherit;
        font-size: 12px;
        font-weight: 650;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .filter-trigger-btn:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }
      .filter-trigger-btn.active {
        background: var(--color-accent);
        border-color: var(--color-accent);
        color: #fff;
      }
      .filter-count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 17px;
        height: 17px;
        border-radius: 50%;
        background: var(--color-accent);
        color: #fff;
        font-size: 10px;
        font-weight: 800;
        line-height: 1;
      }
      .filter-trigger-btn.active .filter-count-badge {
        background: #fff;
        color: var(--color-accent);
      }
      .sort-wrapper {
        margin-left: auto;
      }
      .sort-btn {
        gap: 6px;
      }
      .sort-prefix {
        color: var(--color-muted);
        font-size: 11.5px;
      }

      /* Checkbox component matching category-detail */
      .check {
        display: grid;
        place-items: center;
        width: 15px;
        height: 15px;
        flex-shrink: 0;
        border: 1.5px solid var(--color-border-strong);
        border-radius: 3px;
        background: #fff;
        transition: all 0.15s ease;
      }
      .check.on {
        background: var(--color-accent);
        border-color: var(--color-accent);
      }
      .stars-row {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--color-gold);
      }

      /* Dropdown popover */
      .dropdown-backdrop {
        position: fixed;
        inset: 0;
        z-index: 40;
        background: transparent;
      }
      .dropdown-popover {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        z-index: 50;
        min-width: 210px;
        background: var(--color-surface, #fff);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md, 10px);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        animation: dropdownIn 0.15s ease-out;
      }
      .dropdown-popover-right {
        left: auto;
        right: 0;
      }
      @keyframes dropdownIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .popover-header {
        padding: 6px 10px 4px;
        border-bottom: 1px solid var(--color-border);
        margin-bottom: 4px;
      }
      .popover-header span {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-muted);
      }
      .popover-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .filter-option-row {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 7px 10px;
        border: 0;
        border-radius: var(--radius-xs, 4px);
        background: none;
        font: inherit;
        font-size: 12.5px;
        color: var(--color-text-secondary);
        text-align: left;
        cursor: pointer;
        transition: background 0.12s ease;
      }
      .filter-option-row:hover {
        background: var(--color-bg-alt);
        color: var(--color-text);
      }
      .filter-option-row.active {
        background: var(--color-accent-soft);
        color: var(--color-accent);
        font-weight: 650;
      }
      .filter-option-row .grow {
        flex: 1;
      }
      .filter-option-row .n {
        color: var(--color-muted);
        font-size: 11px;
      }

      /* Full Filter Drawer (Side panel) */
      .drawer-backdrop {
        position: fixed;
        inset: 0;
        z-index: 998;
        background: rgba(15, 23, 42, 0.45);
        backdrop-filter: blur(2px);
      }
      .filters-drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(380px, 90vw);
        z-index: 999;
        background: var(--color-surface, #fff);
        box-shadow: -10px 0 25px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: drawerSlideIn 0.22s ease-out;
      }
      @keyframes drawerSlideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
      .drawer-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 22px;
        border-bottom: 1px solid var(--color-border);
      }
      .drawer-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
      }
      .drawer-close-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--color-muted);
        padding: 4px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
      }
      .drawer-close-btn:hover {
        color: var(--color-text);
        background: var(--color-bg-alt);
      }
      .drawer-body {
        flex: 1;
        overflow-y: auto;
        padding: 18px 22px;
        display: flex;
        flex-direction: column;
        gap: 22px;
      }
      .drawer-group h4 {
        font-size: 11.5px;
        font-weight: 750;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--color-muted);
        margin: 0 0 8px;
      }
      .filter-row {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 7px 8px;
        border: 0;
        border-radius: var(--radius-sm);
        background: none;
        font: inherit;
        font-size: 13px;
        color: var(--color-text-secondary);
        text-align: left;
        cursor: pointer;
        transition: background 0.12s ease;
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
      .filter-row .grow {
        flex: 1;
      }
      .filter-row .n {
        color: var(--color-muted);
        font-size: 11px;
      }
      .drawer-footer {
        padding: 16px 22px;
        border-top: 1px solid var(--color-border);
        background: var(--color-bg-alt);
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .btn-apply {
        flex: 1;
      }
      .grid-section {
        padding: 26px 32px 60px;
      }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 18px;
      }
      .no-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        min-height: 300px;
        justify-content: center;
        padding: 50px 32px 70px;
        gap: 12px;
      }
      .catalog-state {
        align-items: center;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 320px;
        justify-content: center;
        padding: 42px 24px;
        text-align: center;
      }
      .catalog-loading { gap: 16px; }
      .loading-mark, .empty-mark {
        align-items: center;
        background: var(--color-accent-soft);
        border-radius: 50%;
        color: var(--color-accent);
        display: inline-flex;
        height: 48px;
        justify-content: center;
        width: 48px;
      }
      .state-eyebrow {
        color: var(--color-accent);
        display: block;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .1em;
        margin-bottom: 7px;
        text-transform: uppercase;
      }
      .catalog-state h2 { font-size: 19px; }
      .catalog-state p { color: var(--color-muted); font-size: 13.5px; margin-bottom: 5px; }
      .state-icon { color: #9b6517; }
      .spin { animation: spin 900ms linear infinite; color: var(--color-accent); }
      @keyframes spin { to { transform: rotate(360deg); } }
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
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
      }
      @media (max-width: 820px) {
        .product-grid {
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
      }
      @media (max-width: 520px) {
        .products-intro-inner { padding-inline: 16px; }
        .filters-bar { padding-inline: 16px; }
        .chips { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
        .chips::-webkit-scrollbar { display: none; }
        .chip { flex: 0 0 auto; }
        .quick-filters { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; }
        .quick-filters::-webkit-scrollbar { display: none; }
        .quick-filters label, .toggle-filter { flex: 0 0 auto; }
        .scroll-fade::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 4px;
          width: 28px;
          background: linear-gradient(to right, rgba(255, 253, 248, 0), var(--color-bg));
          pointer-events: none;
        }
        /* filters-row already wraps the "Clear filters" button onto its own
           line when the scrollable row above leaves no horizontal room. */
        .filters-row { row-gap: 10px; }
        .grid-section { padding-inline: 16px; }
        .product-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 370px) {
        .product-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class ProductsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly catalog = inject(CatalogService);

  protected readonly categories = this.catalog.categories;
  protected readonly sorts = SORTS;
  protected readonly priceOptions = PRICE_OPTIONS;
  protected readonly ratingOptions = RATING_OPTIONS;

  protected readonly openDropdown = signal<'price' | 'rating' | 'sort' | null>(null);
  protected readonly drawerOpen = signal(false);

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
  protected readonly onSaleOnly = computed(() => this.params().get('sale') === '1');
  protected readonly inStockOnly = computed(() => this.params().get('stock') === '1');
  protected readonly minRating = computed(() => {
    const value = Number(this.params().get('rating'));
    return Number.isFinite(value) && value > 0 ? value : null;
  });
  protected readonly priceBand = computed(() => this.params().get('price') ?? '');
  protected readonly priceRange = computed(() => {
    switch (this.priceBand()) {
      case 'under-5': return { priceMax: 5 };
      case '5-10': return { priceMin: 5, priceMax: 10 };
      case '10-20': return { priceMin: 10, priceMax: 20 };
      case 'over-20': return { priceMin: 20 };
      default: return {};
    }
  });

  protected readonly priceLabel = computed(() => {
    const band = this.priceBand();
    switch (band) {
      case 'under-5': return 'Price: Under $5';
      case '5-10': return 'Price: $5–$10';
      case '10-20': return 'Price: $10–$20';
      case 'over-20': return 'Price: Over $20';
      default: return 'Price';
    }
  });

  protected readonly ratingLabel = computed(() => {
    const r = this.minRating();
    return r ? `Rating: ${r}★ & up` : 'Rating';
  });

  protected readonly currentSortLabel = computed(() => {
    const s = this.sort();
    return SORTS.find((opt) => opt.value === s)?.label ?? 'Featured';
  });

  protected readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.priceBand()) count++;
    if (this.minRating()) count++;
    if (this.inStockOnly()) count++;
    if (this.onSaleOnly()) count++;
    if (this.category()) count++;
    return count;
  });

  protected readonly hasFilters = computed(() => Boolean(
    this.search() || this.category() || this.collection() || this.onSaleOnly() ||
    this.inStockOnly() || this.minRating() || this.priceBand(),
  ));

  protected readonly results = computed(() =>
    this.catalog.search({
      search: this.search(),
      category: this.category() ?? undefined,
      collection: this.collection() ?? undefined,
      sort: this.sort(),
      onSaleOnly: this.onSaleOnly() || undefined,
      inStockOnly: this.inStockOnly() || undefined,
      minRating: this.minRating() ?? undefined,
      ...this.priceRange(),
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
    if (this.onSaleOnly()) {
      return 'On Sale';
    }
    return this.search() ? 'Search results' : 'All products';
  });

  protected toggleDropdown(type: 'price' | 'rating' | 'sort', event?: Event): void {
    if (event) event.stopPropagation();
    this.openDropdown.update((current) => (current === type ? null : type));
  }

  protected closeDropdowns(): void {
    this.openDropdown.set(null);
  }

  protected selectPrice(val: string): void {
    this.merge({ price: val || null });
    this.openDropdown.set(null);
  }

  protected selectRating(val: number | null): void {
    this.merge({ rating: val ? String(val) : null });
    this.openDropdown.set(null);
  }

  protected selectSort(val: ProductSort): void {
    this.merge({ sort: val });
    this.openDropdown.set(null);
  }

  protected countForPrice(bandValue: string): number {
    let range = {};
    switch (bandValue) {
      case 'under-5': range = { priceMax: 5 }; break;
      case '5-10': range = { priceMin: 5, priceMax: 10 }; break;
      case '10-20': range = { priceMin: 10, priceMax: 20 }; break;
      case 'over-20': range = { priceMin: 20 }; break;
    }
    return this.catalog.search({
      category: this.category() ?? undefined,
      collection: this.collection() ?? undefined,
      onSaleOnly: this.onSaleOnly() || undefined,
      inStockOnly: this.inStockOnly() || undefined,
      minRating: this.minRating() ?? undefined,
      ...range,
    }).length;
  }

  protected countForRating(r: number | null): number {
    return this.catalog.search({
      category: this.category() ?? undefined,
      collection: this.collection() ?? undefined,
      onSaleOnly: this.onSaleOnly() || undefined,
      inStockOnly: this.inStockOnly() || undefined,
      minRating: r ?? undefined,
      ...this.priceRange(),
    }).length;
  }

  protected setCategory(slug: string | null): void {
    this.merge({ category: slug });
  }

  protected setSort(event: Event): void {
    this.merge({ sort: (event.target as HTMLSelectElement).value });
  }

  protected setPriceBand(event: Event): void {
    this.merge({ price: (event.target as HTMLSelectElement).value || null });
  }

  protected setRating(event: Event): void {
    this.merge({ rating: (event.target as HTMLSelectElement).value || null });
  }

  protected toggleInStock(): void {
    this.merge({ stock: this.inStockOnly() ? null : '1' });
  }

  protected toggleSale(): void {
    this.merge({ sale: this.onSaleOnly() ? null : '1' });
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
