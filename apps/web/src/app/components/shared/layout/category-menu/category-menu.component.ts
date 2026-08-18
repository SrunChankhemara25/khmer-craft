import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../../../core/catalog/catalog.service';
import { IconComponent } from '../../ui/icon/icon.component';

/**
 * Categories nav item with a hover mega-menu.
 *
 * Opening on hover is a pointer convenience, not the only way in: the trigger
 * is a real link to /categories, so keyboard and touch users reach the same
 * place without the panel. The panel opens on focus too, and Escape closes it.
 *
 * Both timings exist to stop the menu fighting the pointer. A short open delay
 * means brushing past the item on the way to Stores does not flash the panel;
 * a longer close delay means moving diagonally down into the panel does not
 * dismiss it the moment the pointer leaves the trigger.
 */
const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 220;

@Component({
  selector: 'app-category-menu',
  imports: [RouterLink, IconComponent],
  template: `
    <div
      class="menu-root"
      (mouseenter)="scheduleOpen()"
      (mouseleave)="scheduleClose()"
      (focusin)="open()"
      (focusout)="scheduleClose()"
    >
      <a
        routerLink="/categories"
        class="trigger"
        [class.active]="active()"
        [class.open]="isOpen()"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="true"
      >
        Categories
        <ui-icon name="chevron-down" [size]="13" />
      </a>

      @if (isOpen()) {
        <!-- Dims the page beneath so the panel reads as a layer over the
             storefront rather than part of it. -->
        <div class="scrim" aria-hidden="true"></div>

        <div class="panel" role="menu" [style.top.px]="panelTop()">
          <div class="panel-inner container">
            <div class="columns">
              @for (category of categories; track category.slug) {
                <div class="column">
                  <a
                    class="column-head"
                    [routerLink]="['/categories', category.slug]"
                    (click)="close()"
                  >
                    <span class="icon">
                      <ui-icon [name]="category.icon" [size]="15" />
                    </span>
                    <span class="head-text">
                      <strong>{{ category.name }}</strong>
                      <small>{{ catalog.countByCategory(category.slug) }} products</small>
                    </span>
                  </a>

                  <ul>
                    @for (sub of category.subcategories; track sub.slug) {
                      @let count = catalog.countBySubcategory(category.slug, sub.slug);
                      <li>
                        <a
                          [routerLink]="['/categories', category.slug]"
                          [queryParams]="{ sub: sub.slug }"
                          (click)="close()"
                          [class.empty]="count === 0"
                        >
                          <span>{{ sub.name }}</span>
                          <!-- Zero is shown rather than hidden: an empty
                               sub-category is a real gap a seller can fill,
                               and it lands on a proper empty state. -->
                          <em>{{ count }}</em>
                        </a>
                      </li>
                    }
                  </ul>
                </div>
              }
            </div>

            <div class="panel-foot">
              <a routerLink="/categories" (click)="close()">
                Browse all categories <ui-icon name="arrow-right" [size]="13" />
              </a>
              <a routerLink="/products" (click)="close()">
                See every product <ui-icon name="arrow-right" [size]="13" />
              </a>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .menu-root {
        position: relative;
      }
      .trigger {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 0;
        border-bottom: 2px solid transparent;
        white-space: nowrap;
        cursor: pointer;
      }
      .trigger:hover,
      .trigger.open {
        color: var(--color-text);
      }
      .trigger.active {
        color: var(--color-text);
        font-weight: 600;
        border-bottom-color: var(--color-accent);
      }
      .trigger ui-icon {
        transition: transform var(--dur-fast) var(--ease-standard);
      }
      .trigger.open ui-icon {
        transform: rotate(180deg);
      }

      /* Full-bleed bar under the whole header, rather than a card floating
         over the content. Fixed rather than absolute because the header is
         sticky and contains the announcement bar, so the panel has to start
         below whatever the header currently measures. */
      .panel {
        position: fixed;
        left: 0;
        right: 0;
        z-index: 60;
        width: 100%;
        border-top: 1px solid var(--color-border);
        border-bottom: 1px solid var(--color-border);
        background: var(--color-surface);
        box-shadow: var(--shadow-md);
        animation: drop 150ms var(--ease-out);
      }
      /* Bridges the gap between the trigger and the panel so the pointer can
         travel down without crossing dead space and firing mouseleave. */
      .panel::before {
        content: '';
        position: absolute;
        top: -18px;
        left: 0;
        right: 0;
        height: 18px;
      }
      .scrim {
        position: fixed;
        inset: 0;
        z-index: 55;
        background: rgba(24, 20, 18, 0.28);
        animation: fade 150ms var(--ease-out);
      }
      @keyframes fade {
        from {
          opacity: 0;
        }
      }
      @keyframes drop {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
      }
      /* Content sits in the same container as the rest of the page, so the
         columns line up with the header and the grid below it. */
      .panel-inner {
        overflow: hidden;
      }
      .columns {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px 28px;
        padding: 24px 0 18px;
      }
      .column-head {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 6px 8px;
        border-radius: var(--radius-sm);
        color: var(--color-text);
      }
      .column-head:hover {
        background: var(--color-accent-soft);
      }
      .icon {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        flex-shrink: 0;
        border-radius: var(--radius-xs);
        background: var(--color-bg-alt);
        color: var(--color-accent);
      }
      .head-text {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
      }
      .head-text strong {
        font-size: 13.5px;
      }
      .head-text small {
        color: var(--color-muted);
        font-size: 11px;
      }
      ul {
        list-style: none;
        margin: 4px 0 14px;
        padding: 0 0 0 37px;
      }
      li a {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 4px 8px 4px 0;
        color: var(--color-text-secondary);
        font-size: 12.5px;
      }
      li a:hover {
        color: var(--color-accent);
      }
      li a em {
        color: var(--color-muted-2);
        font-style: normal;
        font-size: 11px;
      }
      li a.empty {
        color: var(--color-muted-2);
      }
      .panel-foot {
        display: flex;
        gap: 24px;
        padding: 13px 0;
        border-top: 1px solid var(--color-border);
      }
      .panel-foot a {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--color-accent);
        font-size: 12.5px;
        font-weight: 600;
      }
      .panel-foot a:hover {
        text-decoration: underline;
      }

      @media (max-width: 1100px) {
        .columns {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      /* The nav links are hidden below this width anyway, and a hover menu is
         meaningless on touch — the trigger stays a plain link. */
      @media (max-width: 980px) {
        .panel {
          display: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .panel {
          animation: none;
        }
        .trigger ui-icon {
          transition: none;
        }
      }
    `,
  ],
  host: {
    '(document:keydown.escape)': 'close()',
    // The header shrinks as the announcement bar scrolls away, so the panel
    // has to follow it rather than sit at a stale offset.
    '(window:scroll)': 'onViewportChange()',
    '(window:resize)': 'onViewportChange()',
  },
})
export class CategoryMenuComponent {
  protected readonly catalog = inject(CatalogService);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly categories = this.catalog.categories;

  /** Set by the navbar so the trigger underlines on the categories routes. */
  readonly active = input(false);

  private readonly openState = signal(false);
  protected readonly isOpen = computed(() => this.openState());

  /**
   * Where the header currently ends.
   *
   * Measured on open rather than hardcoded: the header is sticky and carries
   * an announcement bar that scrolls away, so its height is not a constant.
   */
  protected readonly panelTop = signal(0);

  private measureHeader(): void {
    const header = (this.host.nativeElement as HTMLElement).closest('header');
    this.panelTop.set(header ? Math.round(header.getBoundingClientRect().bottom) : 0);
  }

  private openTimer?: ReturnType<typeof setTimeout>;
  private closeTimer?: ReturnType<typeof setTimeout>;

  protected scheduleOpen(): void {
    clearTimeout(this.closeTimer);
    this.openTimer = setTimeout(() => {
      this.measureHeader();
      this.openState.set(true);
    }, OPEN_DELAY_MS);
  }

  protected open(): void {
    clearTimeout(this.closeTimer);
    this.measureHeader();
    this.openState.set(true);
  }

  protected scheduleClose(): void {
    clearTimeout(this.openTimer);
    this.closeTimer = setTimeout(
      () => this.openState.set(false),
      CLOSE_DELAY_MS,
    );
  }

  protected onViewportChange(): void {
    if (this.openState()) {
      this.measureHeader();
    }
  }

  protected close(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    this.openState.set(false);
  }
}
