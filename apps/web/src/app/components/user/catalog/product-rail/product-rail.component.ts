import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../../../core/catalog/catalog.models';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ProductCardComponent } from '../product-card/product-card.component';

/**
 * A horizontally scrollable row of product cards.
 *
 * Used for the homepage discovery sections and related products, where the
 * point is to browse sideways through a curated set rather than scan a full
 * grid. Scrolls by touch, trackpad, scrollbar and keyboard — the rail itself
 * is focusable so arrow keys work without a mouse.
 */
@Component({
  selector: 'app-product-rail',
  imports: [RouterLink, IconComponent, ProductCardComponent],
  template: `
    <div class="section-head">
      <h2>{{ title() }}</h2>

      @if (linkRoute()) {
        <a class="see-all" [routerLink]="linkRoute()" [queryParams]="linkParams()">
          {{ linkLabel() }} <ui-icon name="arrow-right" [size]="14" />
        </a>
      }
    </div>

    <div class="rail" [class.editorial-rail]="variant() === 'editorial'" tabindex="0" role="region" [attr.aria-label]="title()">
      @for (product of products(); track product.id) {
        <app-product-card [product]="product" [variant]="variant()" />
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 9px;
      }
      .section-head h2 {
        font-size: clamp(22px, 1.6vw, 28px);
      }
      .see-all {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--color-accent);
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
      }
      .see-all:hover {
        text-decoration: underline;
      }

      .rail {
        display: flex;
        gap: clamp(11px, 1vw, 16px);
        overflow-x: auto;
        overflow-y: hidden;
        scroll-snap-type: x proximity;
        /* Room for the card's hover lift and focus ring, which the scroll
           container would otherwise clip. */
        padding: 4px 5px 8px;
        margin: -4px -4px 0;
        scrollbar-width: none;
      }
      .rail::-webkit-scrollbar {
        display: none;
      }
      .rail:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
        border-radius: var(--radius-md);
      }
      /* Keep the scrollbar visible rather than overlay-only: with no arrow
         buttons it is the only cue that the row scrolls. */
      .rail::-webkit-scrollbar {
        height: 7px;
      }
      .rail::-webkit-scrollbar-track {
        background: transparent;
      }
      .rail::-webkit-scrollbar-thumb {
        background: var(--color-border-strong);
        border-radius: var(--radius-full);
      }
      .rail::-webkit-scrollbar-thumb:hover {
        background: var(--color-muted-2);
      }

      /* Dense discovery rails expose more choices before the shopper needs to
         scroll, while each card still has enough room for two-line names. */
      .rail app-product-card {
        flex: 0 0 clamp(190px, 13vw, 224px);
        scroll-snap-align: start;
      }
      .rail.editorial-rail app-product-card {
        flex-basis: clamp(260px, 20vw, 320px);
      }

      @media (max-width: 700px) {
        .rail app-product-card {
          flex-basis: min(62vw, 240px);
        }
        .rail.editorial-rail app-product-card {
          flex-basis: min(76vw, 300px);
        }
      }
      @media (max-width: 420px) {
        .rail app-product-card {
          flex-basis: min(72vw, 232px);
        }
        .rail.editorial-rail app-product-card {
          flex-basis: min(82vw, 292px);
        }
      }
    `,
  ],
})
export class ProductRailComponent {
  readonly title = input.required<string>();
  readonly products = input.required<Product[]>();
  readonly variant = input<'default' | 'editorial'>('default');
  readonly linkLabel = input('See all');
  readonly linkRoute = input<string | null>(null);
  readonly linkParams = input<Record<string, string>>({});
}
