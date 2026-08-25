import {
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../../../core/catalog/catalog.service';
import { Category } from '../../../../core/catalog/catalog.models';
import { IconComponent } from '../../ui/icon/icon.component';

/**
 * The category navigation row.
 *
 * Every top-level category is its own nav item, and hovering one opens a panel
 * showing that category's second level. This is the standard storefront
 * pattern: the categories are the navigation, rather than being hidden behind
 * a single "Categories" entry that costs an extra hop to reach.
 *
 * Hover is a pointer convenience, not the only route in — each item is a real
 * link to its category page, the panel also opens on keyboard focus, and
 * Escape closes it. Below 980px the row scrolls horizontally and the panels
 * are suppressed, since hover means nothing on touch.
 */

/** Cross-cutting views offered alongside the sub-categories. */
const SHOP_BY: { label: string; params: Record<string, string> }[] = [
  { label: 'Best sellers', params: { sort: 'featured' } },
  { label: 'New arrivals', params: { sort: 'newest' } },
  { label: 'Top rated', params: { sort: 'rating' } },
  { label: 'Under $5', params: { collection: 'under-5' } },
];

const OPEN_DELAY_MS = 110;
const CLOSE_DELAY_MS = 220;

@Component({
  selector: 'app-category-menu',
  imports: [RouterLink, IconComponent],
  template: `
    <div class="cat-bar" (mouseleave)="scheduleClose()">
      <nav class="cat-row container" aria-label="Product categories">
        <span class="edge" aria-hidden="true"></span>

        <div class="cat-items">
          @for (category of categories; track category.slug) {
          <a
            class="cat-item"
            [class.open]="openSlug() === category.slug"
            [routerLink]="['/categories', category.slug]"
            (mouseenter)="scheduleOpen(category.slug)"
            (focus)="open(category.slug)"
            [attr.aria-expanded]="openSlug() === category.slug"
            (click)="close()"
          >
              {{ category.name }}
            </a>
          }
        </div>
      </nav>

      @if (activeCategory(); as cat) {
        <div class="panel" role="menu">
          <div class="panel-inner container">
            <div class="col by-type">
              <h4>Subcategories</h4>
              @for (sub of cat.subcategories; track sub.slug) {
                @let count = catalog.countBySubcategory(cat.slug, sub.slug);
                <a
                  class="type-link"
                  [routerLink]="['/categories', cat.slug]"
                  [queryParams]="{ sub: sub.slug }"
                  (click)="close()"
                  [class.empty]="count === 0"
                >
                  {{ sub.name }}
                  <em>{{ count }}</em>
                  <ui-icon name="chevron-right" [size]="14" />
                </a>
              }
            </div>

            <div class="col shop-by">
              <h4>Shop by</h4>
              @for (entry of shopBy; track entry.label) {
                <a
                  class="type-link"
                  routerLink="/products"
                  [queryParams]="withCategory(cat, entry.params)"
                  (click)="close()"
                >
                  {{ entry.label }}
                </a>
              }
            </div>

            <aside class="promo">
              <h3>{{ cat.name }}</h3>
              <p>{{ cat.tagline }}</p>
              <a
                class="promo-cta"
                [routerLink]="['/categories', cat.slug]"
                (click)="close()"
              >
                Shop {{ cat.name }} <ui-icon name="arrow-right" [size]="14" />
              </a>
            </aside>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .cat-bar {
        position: relative;
        border-top: 1px solid var(--color-border);
      }
      /* Three tracks, matching the row above: the categories stay centred no
         matter how wide "All products" or the left edge happen to be. A flex
         row with margin-left:auto pushed them off-centre. */
      .cat-row {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        height: 40px;
        font-size: 13.5px;
        font-weight: 500;
        color: var(--color-text-secondary);
      }
      .cat-items {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: clamp(14px, 1.6vw, 30px);
        height: 100%;
      }
      .edge {
        display: block;
      }
      .cat-item {
        position: relative;
        display: inline-flex;
        align-items: center;
        height: 100%;
        border-bottom: 2px solid transparent;
        white-space: nowrap;
      }
      .cat-item:hover,
      .cat-item.open {
        color: var(--color-text);
        border-bottom-color: var(--color-accent);
      }
      /* Attach directly to the category row. Keeping this absolute inside the
         row avoids a viewport measurement gap when the sticky header moves. */
      .panel {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 60;
        width: 100%;
        border-top: 1px solid var(--color-border);
        border-bottom: 1px solid var(--color-border);
        background: var(--color-surface);
        box-shadow: var(--shadow-md);
        animation: drop 140ms var(--ease-out);
      }
      @keyframes drop {
        from {
          opacity: 0;
          transform: translateY(-6px);
        }
      }
      .panel-inner {
        display: grid;
        grid-template-columns: minmax(420px, 1.55fr) minmax(150px, .55fr) 340px;
        align-items: start;
        gap: 32px;
        /* padding-block, not the shorthand: this element is also .container,
           and a padding shorthand would reset the horizontal padding that
           keeps the columns aligned with the logo above. */
        padding-block: 13px 10px;
      }
      h4 {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--color-muted);
        margin-bottom: 7px;
      }
      .type-link {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 27px;
        padding: 3px 6px 3px 0;
        color: var(--color-text);
        font-size: 13px;
      }
      .type-link:hover {
        color: var(--color-accent);
      }
      .type-link em {
        margin-left: auto;
        color: var(--color-muted-2);
        font-style: normal;
        font-size: 10.5px;
      }
      .type-link ui-icon {
        color: var(--color-muted-2);
      }
      .type-link.empty {
        color: var(--color-muted-2);
      }
      .by-type,
      .shop-by {
        display: flex;
        flex-direction: column;
      }
      .by-type {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        column-gap: 18px;
      }
      .by-type h4 {
        grid-column: 1 / -1;
      }

      .promo {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        min-height: 0;
        padding: 18px 20px;
        border-radius: var(--radius-md);
        background: var(--color-accent-soft);
      }
      .promo h3 {
        font-family: var(--font-heading);
        font-size: 19px;
      }
      .promo p {
        margin: 6px 0 12px;
        color: var(--color-text-secondary);
        font-size: 12.5px;
        line-height: 1.45;
      }
      .promo-cta {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin-top: auto;
        padding: 8px 14px;
        border-radius: var(--radius-full);
        background: var(--color-accent);
        color: #fff;
        font-size: 12px;
        font-weight: 600;
      }
      .promo-cta:hover {
        background: var(--color-accent-hover);
      }

      @media (max-width: 1100px) {
        .panel-inner {
          grid-template-columns: minmax(0, 1.5fr) minmax(150px, .6fr);
          gap: 28px;
        }
        .promo {
          display: none;
        }
      }
      /* Touch: the row scrolls sideways and the panels never open — each item
         is still a link to its category page. */
      @media (max-width: 980px) {
        /* One scrolling strip rather than three tracks — centring is
           meaningless once the row is wider than the screen. */
        .cat-row {
          display: flex;
          overflow-x: auto;
          gap: clamp(14px, 1.6vw, 30px);
          scrollbar-width: none;
        }
        .cat-row::-webkit-scrollbar {
          display: none;
        }
        .edge {
          display: none;
        }
        .cat-items {
          justify-content: flex-start;
        }
        .panel {
          display: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .panel {
          animation: none;
        }
      }
    `,
  ],
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class CategoryMenuComponent {
  protected readonly catalog = inject(CatalogService);

  protected readonly categories = this.catalog.categories;
  protected readonly shopBy = SHOP_BY;

  /** Slug of the category whose panel is open, or null. */
  protected readonly openSlug = signal<string | null>(null);

  private openTimer?: ReturnType<typeof setTimeout>;
  private closeTimer?: ReturnType<typeof setTimeout>;

  protected activeCategory(): Category | undefined {
    const slug = this.openSlug();
    return slug ? this.catalog.category(slug) : undefined;
  }

  /** A "Shop by" view stays inside the category being browsed. */
  protected withCategory(
    category: Category,
    params: Record<string, string>,
  ): Record<string, string> {
    return { category: category.slug, ...params };
  }

  protected scheduleOpen(slug: string): void {
    clearTimeout(this.closeTimer);
    clearTimeout(this.openTimer);
    // Moving along the row swaps panels immediately; only the first open waits.
    const delay = this.openSlug() ? 0 : OPEN_DELAY_MS;
    this.openTimer = setTimeout(() => this.open(slug), delay);
  }

  protected open(slug: string): void {
    clearTimeout(this.closeTimer);
    this.openSlug.set(slug);
  }

  protected scheduleClose(): void {
    clearTimeout(this.openTimer);
    this.closeTimer = setTimeout(() => this.openSlug.set(null), CLOSE_DELAY_MS);
  }

  protected close(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    this.openSlug.set(null);
  }
}
