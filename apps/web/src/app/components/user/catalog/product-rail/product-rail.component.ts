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
        margin-bottom: 22px;
      }
      .section-head h2 {
        font-size: clamp(25px, 2vw, 34px);
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
        gap: clamp(16px, 1.6vw, 26px);
        overflow-x: auto;
        overflow-y: hidden;
        scroll-snap-type: x proximity;
        /* Room for the card's hover lift and focus ring, which the scroll
           container would otherwise clip. */
        padding: 5px 5px 18px;
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

      /* Fluid cards remain comfortably readable at every zoom level. */
      .rail app-product-card {
        flex: 0 0 clamp(270px, 19vw, 370px);
        scroll-snap-align: start;
      }

      @media (max-width: 700px) {
        .rail app-product-card {
          flex-basis: min(76vw, 300px);
        }
      }
      @media (max-width: 420px) {
        .rail app-product-card {
          flex-basis: min(82vw, 288px);
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
