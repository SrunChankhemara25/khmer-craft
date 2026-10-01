import { Component, computed, inject, signal } from '@angular/core';
import { AdminApiService, LiveProduct } from '../admin-api.service';
import { ApiStore } from '../../core/api/api.models';
import { BadgeComponent } from '../ui/badge.component';
import { IconComponent } from '../ui/icon.component';
import { StateComponent } from '../ui/state.component';
import { initials, money } from '../ui/format';

/**
 * Live store directory — read straight from the marketplace API.
 * Investigation only: no write actions here because admin store-moderation
 * endpoints do not exist on the backend yet.
 */
@Component({
  standalone: true,
  imports: [BadgeComponent, IconComponent, StateComponent],
  template: `
  <div class="page-head">
    <div><span class="eyebrow">Channels · Marketplace</span><h1 class="page-title">Stores</h1>
      <p class="page-sub">Live marketplace stores — inspect a store and its real catalogue</p></div>
    @if (total() > 0) { <span class="muted">{{total()}} stores on the marketplace</span> }
  </div>

  <div class="toolbar">
    <input class="input input-search" placeholder="Filter loaded stores…" [value]="q()" (input)="q.set($any($event.target).value)"/>
    <span class="grow"></span>
    <button class="btn btn-sm" (click)="load()">Refresh</button>
  </div>

  <div class="card">
    @if (loading()) {
      <kc-state mode="loading" message="Loading live stores from the marketplace API…"></kc-state>
    } @else if (error()) {
      <kc-state mode="error" [message]="error()" (retry)="load()"></kc-state>
    } @else if (!rows().length) {
      <kc-state mode="empty" message="No stores match this filter on the loaded page."></kc-state>
    } @else {
      <table class="tbl">
        <thead><tr><th>Store</th><th>Location</th><th>Category</th><th>Rating</th><th>Theme</th><th class="right">Actions</th></tr></thead>
        <tbody>
          @for (s of rows(); track s.id) {
            <tr>
              <td><div class="cell-flex"><span class="thumb">{{initials(s.name)}}</span>
                <div><div class="cell-main">{{s.name}}</div><div class="cell-sub">{{s.slug}}</div></div></div></td>
              <td>{{s.location || '—'}}</td>
              <td class="cell-sub">{{s.categoryName || '—'}}</td>
              <td>@if (s.reviewCount > 0) { <span class="stars">★</span> {{s.rating}} <span class="cell-sub">({{s.reviewCount}})</span> } @else { <span class="cell-sub">New store</span> }</td>
              <td><kc-badge [value]="s.theme.toLowerCase()"></kc-badge></td>
              <td class="right"><div class="cell-actions">
                <button class="icon-btn" aria-label="Inspect store" data-tip="Inspect store" (click)="openStore(s)"><kc-icon name="eye" [size]="14"></kc-icon></button>
              </div></td>
            </tr>
          }
        </tbody>
      </table>
      <div class="pager">
        <button class="btn btn-sm" [disabled]="page() === 1" (click)="go(page() - 1)">Previous</button>
        <span class="muted">Page {{page()}} of {{totalPages()}}</span>
        <button class="btn btn-sm" [disabled]="page() >= totalPages()" (click)="go(page() + 1)">Next</button>
      </div>
    }
  </div>

  @if (sel(); as s) {
    <div class="drawer-back" (click)="sel.set(null)"></div>
    <div class="drawer">
      <div class="drawer-head"><div><b>{{s.name}}</b> <kc-badge [value]="s.theme.toLowerCase()"></kc-badge></div>
        <button class="icon-btn" aria-label="Close" (click)="sel.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div>
      <div class="drawer-body">
        @if (s.bannerUrl) { <img [src]="s.bannerUrl" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:14px"/> }
        <div class="kv"><span class="k">Location</span>{{s.location || '—'}}</div>
        <div class="kv"><span class="k">Category</span>{{s.categoryName || '—'}}</div>
        <div class="kv"><span class="k">Rating</span>{{s.reviewCount > 0 ? s.rating + ' / 5 (' + s.reviewCount + ' reviews)' : 'No reviews yet'}}</div>
        @if (s.showContact && s.phoneNumber) { <div class="kv"><span class="k">Public phone</span>{{s.phoneNumber}}</div> }
        @if (s.tagline) { <div class="kv"><span class="k">Tagline</span>{{s.tagline}}</div> }
        @if (s.announcement) { <div class="kv"><span class="k">Announcement</span>{{s.announcement}}</div> }

        <div class="sect">Live catalogue ({{storeProducts().length}})</div>
        @if (productsLoading()) {
          <kc-state mode="loading" compact message="Loading this store's products…"></kc-state>
        } @else if (productsError()) {
          <kc-state mode="error" compact [message]="productsError()" (retry)="loadStoreProducts(s.id)"></kc-state>
        } @else if (!storeProducts().length) {
          <kc-state mode="empty" compact message="This store has no live products yet."></kc-state>
        } @else {
          @for (p of storeProducts(); track p.id) {
            <div class="list-item">
              <span class="thumb">{{initials(p.name)}}</span>
              <div style="flex:1"><div class="cell-main">{{p.name}}</div>
                <div class="cell-sub">{{money(p.price)}} · {{p.stock}} in stock · {{p.sold}} sold</div></div>
              <kc-badge [value]="p.status"></kc-badge>
            </div>
          }
        }

      </div>
    </div>
  }`,
  styles: [`
    .pager{display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:12px 16px;border-top:1px solid var(--line)}
    .stars{color:var(--amber);font-weight:700}
  `],
})
export class StoresComponent {
  private readonly api = inject(AdminApiService);
  page = signal(1);
  loading = signal(true);
  error = signal('');
  stores = signal<ApiStore[]>([]);
  total = signal(0);
  totalPages = signal(1);
  q = signal('');
  sel = signal<ApiStore | null>(null);
  storeProducts = signal<LiveProduct[]>([]);
  productsLoading = signal(false);
    productsError = signal('');
  initials = initials;
  money = money;
  rows = computed(() => {
    const needle = this.q().trim().toLowerCase();
    if (!needle) return this.stores();
    return this.stores().filter(s =>
      [s.name, s.location ?? '', s.categoryName ?? ''].join(' ').toLowerCase().includes(needle));
  });

  constructor() { this.load(); }

  go(p: number) { this.page.set(p); this.load(); }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.stores(this.page(), 10).subscribe({
      next: (res) => {
        this.stores.set(res.stores);
        this.total.set(res.pagination.total);
        this.totalPages.set(Math.max(1, res.pagination.totalPages));
        this.loading.set(false);
      },
      error: () => {
        this.stores.set([]);
        this.error.set('Could not reach the marketplace API. Make sure the backend is running (port 3001), then retry.');
        this.loading.set(false);
      },
    });
  }

  openStore(s: ApiStore) { this.sel.set(s); this.loadStoreProducts(s.id); }

  loadStoreProducts(storeId: string) {
    this.productsLoading.set(true);
    this.productsError.set('');
    this.api.products({ storeId, limit: 50 }).subscribe({
      next: (res) => {
        this.storeProducts.set(res.products.map(p => this.api.toLive(p)));
        this.productsLoading.set(false);
      },
      error: () => {
        this.storeProducts.set([]);
        this.productsError.set('Could not load this store’s products.');
        this.productsLoading.set(false);
      },
    });
  }
}
