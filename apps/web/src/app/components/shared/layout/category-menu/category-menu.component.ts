import { Component, computed, inject, input, signal } from '@angular/core';
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
        <div class="panel" role="menu">
          <div class="panel-inner">
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

      .panel {
        position: absolute;
        top: calc(100% + 14px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 60;
        width: min(94vw, 1080px);
        animation: drop 140ms var(--ease-out);
      }
      /* Bridges the gap between trigger and panel so the pointer can travel
         down without crossing dead space and triggering mouseleave. */
      .panel::before {
        content: '';
        position: absolute;
        top: -14px;
        left: 0;
        right: 0;
        height: 14px;
      }
      @keyframes drop {
        from {
          opacity: 0;
          transform: translate(-50%, -6px);
        }
      }
      .panel-inner {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        background: var(--color-surface);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
      }
      .columns {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px 22px;
        padding: 22px 24px 18px;
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
        padding: 12px 24px;
        border-top: 1px solid var(--color-border);
        background: var(--color-bg-alt);
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
  },
})
export class CategoryMenuComponent {
  protected readonly catalog = inject(CatalogService);
  protected readonly categories = this.catalog.categories;

  /** Set by the navbar so the trigger underlines on the categories routes. */
  readonly active = input(false);

  private readonly openState = signal(false);
  protected readonly isOpen = computed(() => this.openState());

  private openTimer?: ReturnType<typeof setTimeout>;
  private closeTimer?: ReturnType<typeof setTimeout>;

  protected scheduleOpen(): void {
    clearTimeout(this.closeTimer);
    this.openTimer = setTimeout(() => this.openState.set(true), OPEN_DELAY_MS);
  }

  protected open(): void {
    clearTimeout(this.closeTimer);
    this.openState.set(true);
  }

  protected scheduleClose(): void {
    clearTimeout(this.openTimer);
    this.closeTimer = setTimeout(
      () => this.openState.set(false),
      CLOSE_DELAY_MS,
    );
  }

  protected close(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    this.openState.set(false);
  }
}
