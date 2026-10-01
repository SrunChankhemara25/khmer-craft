import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminService, Product } from '../admin-data.service';
import { AdminApiService, LiveProduct, LiveProductPatch } from '../admin-api.service';
import { apiErrorMessage } from '../../core/auth/auth.service';
import { BadgeComponent } from '../ui/badge.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { IconComponent } from '../ui/icon.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { StateComponent } from '../ui/state.component';
import { dstr, initials, money } from '../ui/format';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

interface LiveConfirm {
  title: string;
  msg: string;
  label: string;
  requireReason: boolean;
  fn: (reason: string) => void;
}

@Component({
  standalone: true,
  imports: [BadgeComponent, ConfirmComponent, IconComponent, MenuComponent, StateComponent],
  template: `
  <div class="page-head">
    <div><span class="eyebrow">Catalogue · Moderation</span><h1 class="page-title">Products</h1>
      <p class="page-sub">Live catalogue moderation — writes go straight to the marketplace API</p></div>
  </div>

  <div class="toolbar">
    <div class="tabs">
      <button class="tab" [class.active]="tab() === 'live'" (click)="tab.set('live')">Live catalog</button>
      <button class="tab" [class.active]="tab() === 'queue'" (click)="tab.set('queue')">Moderation queue (demo data)</button>
    </div>
  </div>

  <!-- ================= LIVE CATALOG (real reads + real writes) ================= -->
  @if (tab() === 'live') {
    <div class="toolbar">
      <input class="input input-search" placeholder="Search live products…" [value]="searchInput()"
        (input)="onSearch($any($event.target).value)"/>
      <select class="input" [value]="sort()" (change)="setSort($any($event.target).value)">
        @for (s of sorts; track s.value) { <option [value]="s.value">{{s.label}}</option> }
      </select>
      <span class="grow"></span>
      @if (total() > 0) { <span class="muted">{{total()}} products on the marketplace</span> }
    </div>

    @if (liveError()) {
      <div class="notice-row" role="alert">
        <kc-icon name="alert" [size]="14"></kc-icon> {{liveError()}}
        <button class="link" (click)="liveError.set('')">Dismiss</button>
      </div>
    }

    <div class="card">
      @if (loading()) {
        <kc-state mode="loading" message="Loading live catalog from the marketplace API…"></kc-state>
      } @else if (error()) {
        <kc-state mode="error" [message]="error()" (retry)="load()"></kc-state>
      } @else if (!rows().length) {
        <kc-state mode="empty" message="No live products match this search. Clear it to see the full catalog."></kc-state>
      } @else {
        <table class="tbl">
          <thead><tr><th>Product</th><th>Seller</th><th>Category</th><th class="right">Price</th><th class="right">Stock</th><th class="right">Sold</th><th>Status</th><th class="right">Actions</th></tr></thead>
          <tbody>
            @for (p of rows(); track p.id) {
              <tr>
                <td><div class="cell-flex"><span class="thumb">{{initials(p.name)}}</span>
                  <div><div class="cell-main">{{p.name}}</div><div class="cell-sub">{{p.slug}}</div></div></div></td>
                <td>{{p.seller}}</td><td class="cell-sub">{{p.category}}</td>
                <td class="num">{{money(p.price)}}</td><td class="num">{{p.stock}}</td><td class="num">{{p.sold}}</td>
                <td><kc-badge [value]="p.status"></kc-badge></td>
                <td class="right"><div class="cell-actions">
                  <button class="icon-btn" aria-label="View product" data-tip="View product" (click)="selLive.set(p)"><kc-icon name="eye" [size]="14"></kc-icon></button>
                  @if (p.status === 'pending') {
                    <button class="btn btn-sm btn-primary" [disabled]="busyId() === p.id" (click)="askApprove(p)">
                      {{ busyId() === p.id ? '…' : 'Approve' }}</button>
                  }
                  <kc-menu [items]="liveMenu(p)" (pick)="liveAct($event, p)"></kc-menu>
                </div></td>
              </tr>
            }
          </tbody>
        </table>
        <div class="pager">
          <button class="btn btn-sm" [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
          <span class="muted">Page {{page()}} of {{totalPages()}}</span>
          <button class="btn btn-sm" [disabled]="page() >= totalPages()" (click)="page.set(page() + 1)">Next</button>
        </div>
        <p class="live-note">Hiding a listing archives it through the API — it disappears from the storefront and shows as ARCHIVED in the seller's dashboard immediately. Archiving (not deleting) keeps past orders resolvable.</p>
      }
    </div>

    @if (selLive(); as p) {
      <div class="drawer-back" (click)="selLive.set(null)"></div>
      <div class="drawer">
        <div class="drawer-head"><div><b>{{p.name}}</b> <kc-badge [value]="p.status"></kc-badge></div>
          <button class="icon-btn" aria-label="Close" (click)="selLive.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div>
        <div class="drawer-body">
          @if (p.image) { <img [src]="p.image" [alt]="p.name" style="width:100%;border-radius:10px;margin-bottom:14px"/> }
          <div class="kv"><span class="k">Seller</span>{{p.seller}}</div>
          <div class="kv"><span class="k">Category</span>{{p.category}}</div>
          <div class="kv"><span class="k">Price</span>{{money(p.price)}}</div>
          <div class="kv"><span class="k">Stock</span>{{p.stock}}</div>
          <div class="kv"><span class="k">Sold</span>{{p.sold}}</div>
          <div class="kv"><span class="k">Listed</span>{{dstr(p.createdAt)}}</div>
          <div class="kv"><span class="k">Updated</span>{{dstr(p.updatedAt)}}</div>
          <div class="sect">Description</div>
          <p class="muted" style="margin:0;line-height:1.6">{{p.description || 'No description provided.'}}</p>
        </div>
      </div>
    }

    @if (editLive(); as p) {
      <div class="modal-back"><div class="modal">
        <h3>Edit live listing</h3><p>{{p.name}} — changes are written to the marketplace immediately.</p>
        <div class="form-row"><label>Price (USD)</label><input class="input" type="number" min="0" step="0.01" [value]="ePrice()" (input)="ePrice.set(+$any($event.target).value)"/></div>
        <div class="form-row"><label>Stock</label><input class="input" type="number" min="0" [value]="eStock()" (input)="eStock.set(+$any($event.target).value)"/></div>
        <div class="form-row"><label>Status</label><select class="input" [value]="eStatus()" (change)="eStatus.set($any($event.target).value)">
          <option value="ACTIVE">Active (visible)</option><option value="DRAFT">Draft (hidden, pending)</option><option value="ARCHIVED">Archived (delisted)</option></select></div>
        <div class="modal-actions">
          <button class="btn" (click)="editLive.set(null)">Cancel</button>
          <button class="btn btn-primary" [disabled]="busyId() === p.id" (click)="saveEdit(p)">{{ busyId() === p.id ? 'Saving…' : 'Save changes' }}</button>
        </div>
      </div></div>
    }
  }

  <!-- ================= DEMO QUEUE (local sample data) ================= -->
  @if (tab() === 'queue') {
    <div class="toolbar">
      <input class="input input-search" placeholder="Search products" [value]="q()" (input)="q.set($any($event.target).value)"/>
      <select class="input" [value]="cat()" (change)="cat.set($any($event.target).value)">
        <option value="all">All categories</option>
        @for (c of d.categories(); track c.id) { <option [value]="c.name">{{c.name}}</option> }
      </select>
      <select class="input" [value]="st()" (change)="st.set($any($event.target).value)">
        <option value="all">All statuses</option><option value="pending">Pending</option>
        <option value="active">Active</option><option value="hidden">Hidden</option><option value="rejected">Rejected</option>
      </select>
    </div>
    <div class="card"><table class="tbl">
      <thead><tr><th>Product</th><th>Seller</th><th class="right">Price</th><th class="right">Stock</th><th>Status</th></tr></thead>
      <tbody>
        @for (p of queueRows(); track p.id) {
          <tr>
            <td><div class="cell-flex"><span class="thumb">{{initials(p.name)}}</span><span class="cell-main">{{p.name}}</span></div></td>
            <td>{{d.storeName(p.sellerId)}}</td>
            <td class="num">{{money(p.price)}}</td><td class="num">{{p.stock}}</td>
            <td><kc-badge [value]="p.status"></kc-badge></td>
          </tr>
        } @empty { <tr><td colspan="5"><div class="empty">No demo products match.</div></td></tr> }
      </tbody>
    </table></div>
    <p class="sim-note">This tab is local sample data for workflow practice only — it never touches the marketplace.</p>
  }

  @if (confirmLive(); as c) {
    <kc-confirm [title]="c.title" [message]="c.msg" [requireReason]="c.requireReason"
      [confirmLabel]="c.label" (confirm)="runConfirm($event)" (cancel)="confirmLive.set(null)"></kc-confirm>
  }`,
  styles: [`
    .pager{display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:12px 16px;border-top:1px solid var(--line)}
    .live-note{margin:0;padding:10px 16px;border-top:1px solid var(--line);background:var(--green-050);color:var(--green);font-size:11.5px;font-weight:600}
    .sim-note{margin:14px 0 0;padding:10px 16px;border:1px solid var(--line);border-radius:10px;background:var(--amber-050);color:var(--amber);font-size:11.5px;font-weight:600}
    .notice-row{display:flex;align-items:center;gap:8px;margin:0 0 12px;padding:9px 14px;border-radius:10px;background:var(--red-050);color:var(--red);font-size:12px;font-weight:600}
    .notice-row .link{margin-left:auto}
  `],
})
export class ProductsComponent {
  private readonly api = inject(AdminApiService);
  d = inject(AdminService);

  // ---------------------------------------------------------- live catalog
  tab = signal<'live' | 'queue'>('live');
  sorts = SORTS;
  searchInput = signal('');
  search = signal('');
  sort = signal('featured');
  page = signal(1);
  private readonly limit = 10;
  loading = signal(true);
  error = signal('');
  liveError = signal('');
  rows = signal<LiveProduct[]>([]);
  total = signal(0);
  totalPages = signal(1);
  selLive = signal<LiveProduct | null>(null);
  busyId = signal('');
  confirmLive = signal<LiveConfirm | null>(null);
  editLive = signal<LiveProduct | null>(null);
  ePrice = signal(0);
  eStock = signal(0);
  eStatus = signal<'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('ACTIVE');
  private timer: any;

  constructor() {
    effect(() => {
      this.search(); this.page(); this.sort();
      this.load();
    });
  }

  onSearch(v: string) {
    this.searchInput.set(v);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.page.set(1); this.search.set(v.trim()); }, 300);
  }
  setSort(v: string) { this.page.set(1); this.sort.set(v); }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.products({
      search: this.search() || undefined,
      sort: this.sort(),
      page: this.page(),
      limit: this.limit,
    }).subscribe({
      next: (res) => {
        this.rows.set(res.products.map((p) => this.api.toLive(p)));
        this.total.set(res.total);
        this.totalPages.set(Math.max(1, res.totalPages));
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.error.set('Could not reach the marketplace API. Make sure the backend is running (port 3001), then retry.');
        this.loading.set(false);
      },
    });
  }

  liveMenu(p: LiveProduct): MenuItem[] {
    const m: MenuItem[] = [{ label: 'Edit price / stock / status', icon: 'edit', action: 'edit' }];
    if (p.status === 'active') m.push({ label: 'Hide from marketplace', icon: 'eye-off', danger: true, action: 'hide' });
    if (p.status === 'hidden') m.push({ label: 'Restore to marketplace', icon: 'eye', action: 'restore' });
    return m;
  }

  liveAct(a: string, p: LiveProduct) {
    if (a === 'edit') {
      this.ePrice.set(p.price);
      this.eStock.set(p.stock);
      this.eStatus.set(p.status === 'active' ? 'ACTIVE' : p.status === 'pending' ? 'DRAFT' : 'ARCHIVED');
      this.editLive.set(p);
      return;
    }
    if (a === 'hide') {
      this.confirmLive.set({
        title: `Hide “${p.name}”?`,
        msg: 'The listing is archived through the API: it disappears from the storefront and the seller sees it as ARCHIVED. A reason is required and recorded in the admin audit log.',
        label: 'Hide listing',
        requireReason: true,
        fn: (reason) => this.patch(p, { status: 'ARCHIVED' }, 'Listing hidden from the marketplace', reason),
      });
      return;
    }
    if (a === 'restore') {
      this.confirmLive.set({
        title: `Restore “${p.name}”?`,
        msg: 'The listing becomes ACTIVE and visible to buyers again.',
        label: 'Restore',
        requireReason: false,
        fn: () => this.patch(p, { status: 'ACTIVE' }, 'Listing restored to the marketplace'),
      });
    }
  }

  askApprove(p: LiveProduct) {
    this.confirmLive.set({
      title: `Publish “${p.name}”?`,
      msg: 'The draft listing becomes ACTIVE and appears on the storefront immediately.',
      label: 'Publish',
      requireReason: false,
      fn: () => this.patch(p, { status: 'ACTIVE' }, 'Listing approved and live'),
    });
  }

  saveEdit(p: LiveProduct) {
    this.editLive.set(null);
    this.patch(p, { price: this.ePrice(), stock: this.eStock(), status: this.eStatus() }, 'Listing saved');
  }

  /** The one real write path for moderation — PATCH /api/products/:id as ADMIN. */
  private patch(p: LiveProduct, patch: LiveProductPatch, msg: string, reason?: string) {
    if (this.busyId()) return;
    this.busyId.set(p.id);
    this.liveError.set('');
    this.api.updateProduct(p.id, patch).subscribe({
      next: (updated) => {
        this.busyId.set('');
        this.d.log(
          `Moderated live product ${updated.name} → ${patch.status ?? 'edited'}`,
          patch.status === 'ARCHIVED' ? 'hidden' : 'approved',
          { target: updated.id, reason },
        );
        this.d.toast(msg);
        this.api.refreshBadges();
        this.load();
      },
      error: (e) => {
        this.busyId.set('');
        this.liveError.set(apiErrorMessage(e, 'The API refused that change. Are you signed in with an ADMIN account?'));
      },
    });
  }

  runConfirm(reason: string) { const c = this.confirmLive(); if (c) c.fn(reason); this.confirmLive.set(null); }

  // ------------------------------------------------- demo queue (local only)
  q = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('q') ?? '');
  cat = signal('all'); st = signal('all');
  money = money; initials = initials; dstr = dstr;

  queueRows = computed(() => this.d.products().filter(p =>
    (this.cat() === 'all' || p.category === this.cat()) &&
    (this.st() === 'all' || p.status === this.st()) &&
    (!this.q() || p.name.toLowerCase().includes(this.q().toLowerCase()))));
}
