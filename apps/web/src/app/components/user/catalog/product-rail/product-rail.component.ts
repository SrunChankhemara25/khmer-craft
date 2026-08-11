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

    <div class="rail" tabindex="0" role="region" [attr.aria-label]="title()">
      @for (product of products(); track product.id) {
        <app-product-card [product]="product" />
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
        margin-bottom: 16px;
      }
      .section-head h2 {
        font-size: 19px;
      }
      .see-all {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--color-accent);
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
      }
      .see-all:hover {
        text-decoration: underline;
      }

      .rail {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-snap-type: x proximity;
        /* Room for the card's hover lift and focus ring, which the scroll
           container would otherwise clip. */
        padding: 4px 4px 12px;
        margin: -4px -4px 0;
        scrollbar-width: thin;
        scrollbar-color: var(--color-border-strong) transparent;
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

      /* Each card keeps a fixed width so the row scrolls instead of squashing. */
      .rail app-product-card {
        flex: 0 0 224px;
        scroll-snap-align: start;
      }

      @media (max-width: 700px) {
        .rail app-product-card {
          flex-basis: 200px;
        }
      }
      @media (max-width: 420px) {
        .rail app-product-card {
          flex-basis: 168px;
        }
      }
    `,
  ],
})
export class ProductRailComponent {
  readonly title = input.required<string>();
  readonly products = input.required<Product[]>();
  readonly linkLabel = input('See all');
  readonly linkRoute = input<string | null>(null);
  readonly linkParams = input<Record<string, string>>({});
}
