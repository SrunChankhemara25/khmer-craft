import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../core/catalog/catalog.service';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-stores',
  imports: [
    FormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
  ],
  template: `
    <app-navbar />

    <section class="container head">
      <nav class="crumbs">
        <a routerLink="/">Home</a> <span>›</span> <span>Stores</span>
      </nav>
      <div class="head-row">
        <div>
          <h1>Artisan stores</h1>
          <p class="sub">
            {{ filtered().length }} sellers across Cambodia, each running their
            own workshop.
          </p>
        </div>
        <label class="store-search">
          <ui-icon name="search" [size]="15" />
          <input
            type="search"
            [(ngModel)]="term"
            name="storeSearch"
            placeholder="Search stores or provinces"
            aria-label="Search stores"
          />
        </label>
      </div>
    </section>

    <section class="container grid-section">
      @if (filtered().length) {
        <div class="store-grid">
          @for (store of filtered(); track store.id) {
            <article class="store-card card card-hover">
              <div class="store-logo img-placeholder">{{ store.name }}</div>
              <div class="store-body">
                <span class="badge badge-soft">{{ store.categoryName }}</span>
                <h2>{{ store.name }}</h2>
                <div class="meta">
                  <span
                    ><ui-icon name="map-pin" [size]="13" />
                    {{ store.location }}</span
                  >
                  <span
                    ><ui-icon name="star" [size]="13" [filled]="true" />
                    {{ store.rating }}</span
                  >
                  <span
                    ><ui-icon name="package" [size]="13" />
                    {{ catalog.countByStore(store.id) }} products</span
                  >
                </div>
                <p class="desc">{{ store.description }}</p>
                <button
                  class="btn btn-outline btn-sm"
                  [routerLink]="['/stores', store.id]"
                >
                  View Store <ui-icon name="arrow-right" [size]="13" />
                </button>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="no-results">
          <div class="empty-image img-placeholder">
            <ui-icon name="store" [size]="34" />
          </div>
          <h2>No stores match “{{ term() }}”</h2>
          <p>Try a province name, or clear the search to see every seller.</p>
          <button class="btn btn-primary" (click)="term.set('')">
            Clear search
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
        font-size: 27px;
      }
      .sub {
        margin-top: 6px;
        color: var(--color-muted);
        font-size: 14px;
      }
      .store-search {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 9px 14px;
        min-width: 260px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-md);
        background: #fff;
        color: var(--color-muted);
      }
      .store-search input {
        border: 0;
        outline: none;
        background: transparent;
        width: 100%;
        font-size: 13.5px;
        color: var(--color-text);
      }
      .store-search input:focus {
        box-shadow: none !important;
        border-color: transparent !important;
      }
      .grid-section {
        padding: 26px 32px 60px;
      }
      .store-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 18px;
      }
      .store-card {
        display: flex;
        flex-direction: column;
      }
      .store-logo {
        height: 150px;
        font-size: 11.5px;
        text-align: center;
      }
      .store-body {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px 18px 18px;
        flex: 1;
      }
      .store-body h2 {
        font-size: 16.5px;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        font-size: 12.5px;
        color: var(--color-muted);
      }
      .meta span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .desc {
        color: var(--color-text-secondary);
        font-size: 13px;
        line-height: 1.55;
        flex: 1;
      }
      .store-body .btn {
        align-self: flex-start;
        margin-top: 4px;
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
        margin-bottom: 8px;
      }
      @media (max-width: 1000px) {
        .store-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 620px) {
        .store-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class StoresComponent {
  protected readonly catalog = inject(CatalogService);
  protected readonly term = signal('');

  protected readonly filtered = computed(() => {
    const needle = this.term().trim().toLowerCase();
    if (!needle) {
      return this.catalog.stores;
    }
    return this.catalog.stores.filter((store) =>
      [store.name, store.location, store.categoryName]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  });
}
