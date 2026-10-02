import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AdminService } from '../admin-data.service';
import { AdminApiService, LiveProduct, SellerApplication } from '../admin-api.service';
import { ApiStore } from '../../core/api/api.models';
import { apiErrorMessage } from '../../core/auth/auth.service';
import { BadgeComponent } from '../ui/badge.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { IconComponent } from '../ui/icon.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { StateComponent } from '../ui/state.component';
import { StatComponent } from '../ui/stat.component';
import { dstr, initials, money } from '../ui/format';

type AccountStatus = 'active' | 'suspended' | 'deactivated';
interface ConfirmRequest { title: string; msg: string; label: string; requireReason: boolean; fn: (reason: string) => void }
type StoreExt = ApiStore & {
  isVerified?: boolean;
  verifiedAt?: string | null;
  verificationExplanation?: string | null;
  description?: string | null;
};

const STATUS_KEY = 'khmercraft.admin.store-status';

/**
 * Sellers = seller accounts and their stores (one and the same here).
 * Signup is open — no approval gate; the request queue only grants the
 * verified badge (real API writes).
 *
 * Account status (active / suspended / deactivated) is an audited admin
 * decision stored in this workspace until the backend gains
 * PATCH /api/admin/users/:id/status — see the note under the table.
 */
@Component({
  standalone: true,
  imports: [BadgeComponent, ConfirmComponent, IconComponent, MenuComponent, StateComponent, StatComponent, RouterLink],
  template: `
  <!-- ============ FULL-SCREEN STORE PROFILE ============ -->
  @if (profile(); as s) {
    <div class="page-head">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="icon-btn" aria-label="Back to sellers" data-tip="Back to sellers" (click)="closeProfile()"><kc-icon name="back" [size]="15"></kc-icon></button>
        <span class="thumb" style="width:44px;height:44px;font-size:14px">{{initials(s.name)}}</span>
        <div>
          <h1 class="page-title" style="margin:0">{{s.name}}</h1>
          <p class="page-sub">
            @if (ext(s).isVerified) { <kc-badge value="verified"></kc-badge> } @else { <kc-badge value="pending"></kc-badge> }
            <kc-badge [value]="acct(s)"></kc-badge>
            {{s.location || 'Location not set'}} · {{s.categoryName || 'No category'}}
          </p>
        </div>
      </div>
      <div class="cell-actions">
        <a class="btn btn-sm" [routerLink]="['/stores', s.id]">Open storefront</a>
        <button class="btn btn-sm" (click)="loadProfileProducts(s.id)">Refresh</button>
      </div>
    </div>

    @if (acct(s) !== 'active') {
      <div class="notice-row" role="status">
        <kc-icon name="alert" [size]="14"></kc-icon>
        This account is {{acct(s)}} in the admin workspace. Public enforcement (hiding the storefront) activates when the admin user-status API is connected.
      </div>
    }

    <div class="grid g3 mb">
      <kc-stat label="Listings published" icon="box" [value]="profileProducts().length"></kc-stat>
      <kc-stat label="Store rating" icon="star" [value]="s.reviewCount ? s.rating + ' / 5' : 'New store'"></kc-stat>
      <kc-stat label="Customer reviews" icon="message" [value]="s.reviewCount"></kc-stat>
    </div>

    <div class="grid duo mb">
      <div class="card card-pad">
        <h3 class="card-title" style="margin-bottom:10px">Account & store details</h3>
        <div class="kv"><span class="k">Store slug</span>{{s.slug}}</div>
        <div class="kv"><span class="k">Account status</span><kc-badge [value]="acct(s)"></kc-badge></div>
        <div class="kv"><span class="k">Theme</span><kc-badge [value]="s.theme.toLowerCase()"></kc-badge></div>
        @if (s.showContact && s.phoneNumber) { <div class="kv"><span class="k">Public phone</span>{{s.phoneNumber}}</div> }
        @if (s.tagline) { <div class="kv"><span class="k">Tagline</span>{{s.tagline}}</div> }
        @if (ext(s).verifiedAt) { <div class="kv"><span class="k">Verified since</span>{{dstr(ext(s).verifiedAt!)}}</div> }
        @if (ext(s).verificationExplanation) { <p class="muted" style="margin-top:10px;font-size:12px;line-height:1.5">{{ext(s).verificationExplanation}}</p> }
      </div>
      <div class="card card-pad">
        <h3 class="card-title" style="margin-bottom:10px">About this seller</h3>
        <p class="muted" style="font-size:12.5px;line-height:1.6">{{ext(s).description || 'The seller has not written a store story yet.'}}</p>
        @if (s.announcement) { <p class="muted" style="font-size:12px;margin-top:10px"><b>Announcement:</b> {{s.announcement}}</p> }
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3 class="card-title">Listing history — every post this store has published</h3>
        <span class="muted">{{profileProducts().length}} shown</span></div>
      @if (profileLoading()) { <kc-state mode="loading" compact message="Loading this store's listings…"></kc-state> }
      @else if (profileError()) { <kc-state mode="error" compact [message]="profileError()" (retry)="loadProfileProducts(s.id)"></kc-state> }
      @else if (!profileProducts().length) { <kc-state mode="empty" compact message="This store has not published any listings yet."></kc-state> }
      @else {
        <table class="tbl">
          <thead><tr><th>Product</th><th>Category</th><th class="right">Price</th><th class="right">Stock</th><th class="right">Sold</th><th>Status</th><th>Listed</th><th class="right">View</th></tr></thead>
          <tbody>
            @for (p of profileProducts(); track p.id) {
              <tr>
                <td><div class="cell-flex"><span class="thumb">{{initials(p.name)}}</span>
                  <div><div class="cell-main">{{p.name}}</div><div class="cell-sub">{{p.slug}}</div></div></div></td>
                <td class="cell-sub">{{p.category}}</td>
                <td class="num">{{money(p.price)}}</td><td class="num">{{p.stock}}</td><td class="num">{{p.sold}}</td>
                <td><kc-badge [value]="p.status"></kc-badge></td>
                <td class="cell-sub">{{dstr(p.createdAt)}}</td>
                <td class="right"><div class="cell-actions">
                  <button class="icon-btn" aria-label="Inspect listing" data-tip="Inspect listing" (click)="selProduct.set(p)"><kc-icon name="eye" [size]="14"></kc-icon></button>
                </div></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  } @else {

  <!-- ============ LIST / REQUESTS ============ -->
  <div class="page-head">
    <div><h1 class="page-title">Sellers</h1>
      <p class="page-sub">Seller accounts and their stores — signup is open; verification is reviewed here and account status is managed here</p></div>
  </div>

  <div class="toolbar">
    <div class="tabs">
      <button class="tab" [class.active]="tab() === 'stores'" (click)="tab.set('stores')">Seller accounts</button>
      <button class="tab" [class.active]="tab() === 'requests'" (click)="tab.set('requests')">Verification requests</button>
    </div>
    @if (tab() === 'stores') {
      <input class="input input-search" placeholder="Filter loaded stores…" [value]="q()" (input)="q.set($any($event.target).value)"/>
      <select class="input" [value]="acctFilter()" (change)="acctFilter.set($any($event.target).value)">
        <option value="all">All account statuses</option><option value="active">Active</option>
        <option value="suspended">Suspended</option><option value="deactivated">Deactivated</option>
      </select>
      <span class="grow"></span>
      <button class="btn btn-sm" (click)="loadStores()">Refresh</button>
    } @else {
      <span class="grow"></span>
      <button class="btn btn-sm" (click)="loadApps()">Refresh</button>
    }
  </div>

  @if (tab() === 'stores') {
    <div class="card">
      @if (storesLoading()) { <kc-state mode="loading" message="Loading seller accounts…"></kc-state> }
      @else if (storesError()) { <kc-state mode="error" [message]="storesError()" (retry)="loadStores()"></kc-state> }
      @else if (!storeRows().length) { <kc-state mode="empty" message="No seller accounts match these filters."></kc-state> }
      @else {
        <table class="tbl">
          <thead><tr><th>Store / seller account</th><th>Location</th><th>Category</th><th>Rating</th><th>Verification</th><th>Account</th><th class="right">Actions</th></tr></thead>
          <tbody>
            @for (s of storeRows(); track s.id) {
              <tr>
                <td><div class="cell-flex"><span class="thumb">{{initials(s.name)}}</span>
                  <div><div class="cell-main">{{s.name}}</div><div class="cell-sub">{{s.slug}}</div></div></div></td>
                <td>{{s.location || '—'}}</td>
                <td class="cell-sub">{{s.categoryName || '—'}}</td>
                <td>@if (s.reviewCount > 0) { ★ {{s.rating}} <span class="cell-sub">({{s.reviewCount}})</span> } @else { <span class="cell-sub">New</span> }</td>
                <td>@if (ext(s).isVerified) { <kc-badge value="verified"></kc-badge> } @else { <kc-badge value="pending"></kc-badge> }</td>
                <td><kc-badge [value]="acct(s)"></kc-badge></td>
                <td class="right"><div class="cell-actions">
                  <button class="btn btn-sm" (click)="openProfile(s)">View profile</button>
                  <kc-menu [items]="menuForStore(s)" (pick)="storeAct($event, s)"></kc-menu>
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
        <p class="sim-note">Account status decisions are recorded in the audit log with actor, reason and timestamp, and persist in this admin workspace. Storefront enforcement (hiding suspended stores from buyers) switches on automatically once PATCH /api/admin/users/:id/status exists in the backend.</p>
      }
    </div>
  }

  @if (tab() === 'requests') {
    <p class="sim-note live-note" style="margin:0 0 12px">Sellers sign up freely — these requests only grant the <b>verified badge</b>. Verifying stamps the store immediately; rejecting requires a written reason.</p>
    @if (actionError()) {
      <div class="notice-row" role="alert"><kc-icon name="alert" [size]="14"></kc-icon> {{actionError()}}
        <button class="link" (click)="actionError.set('')">Dismiss</button></div>
    }
    <div class="card">
      @if (appsLoading()) { <kc-state mode="loading" message="Loading verification requests…"></kc-state> }
      @else if (appsError()) { <kc-state mode="error" [message]="appsError()" (retry)="loadApps()"></kc-state> }
      @else if (!apps().length) { <kc-state mode="empty" message="No verification requests in the queue."></kc-state> }
      @else {
        <table class="tbl">
          <thead><tr><th>Applicant</th><th>Province</th><th>Category</th><th>Phone</th><th>Submitted</th><th>Status</th><th class="right">Actions</th></tr></thead>
          <tbody>
            @for (a of apps(); track a.id) {
              <tr>
                <td><div class="cell-flex"><span class="thumb">{{initials(a.firstName + ' ' + a.lastName)}}</span>
                  <div><div class="cell-main">{{a.firstName}} {{a.lastName}}</div>
                    @if (a.rejectionReason) { <div class="cell-sub" style="color:var(--red)">Reason: {{a.rejectionReason}}</div> }</div></div></td>
                <td>{{a.province}}</td><td class="cell-sub">{{a.primaryCategory}}</td><td class="cell-sub">{{a.phoneNumber}}</td>
                <td class="cell-sub">{{dstr(a.submittedAt)}}</td>
                <td><kc-badge [value]="label(a.status)"></kc-badge></td>
                <td class="right"><div class="cell-actions">
                  @if (a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW') {
                    <button class="btn btn-sm btn-primary" [disabled]="busyId() === a.id" (click)="askVerify(a)">
                      {{ busyId() === a.id ? '…' : 'Verify' }}</button>
                    <kc-menu [items]="menuForApp(a)" (pick)="appAct($event, a)"></kc-menu>
                  } @else if (a.status === 'APPROVED') {
                    <kc-menu [items]="menuForApp(a)" (pick)="appAct($event, a)"></kc-menu>
                  } @else { <span class="muted">—</span> }
                </div></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  }
  }

  <!-- listing inspector drawer -->
  @if (selProduct(); as p) {
    <div class="drawer-back" (click)="selProduct.set(null)"></div>
    <div class="drawer">
      <div class="drawer-head"><div><b>{{p.name}}</b> <kc-badge [value]="p.status"></kc-badge></div>
        <button class="icon-btn" aria-label="Close" (click)="selProduct.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div>
      <div class="drawer-body">
        @if (p.image) { <img [src]="p.image" [alt]="p.name" style="width:100%;border-radius:10px;margin-bottom:14px"/> }
        <div class="kv"><span class="k">Seller</span>{{p.seller}}</div>
        <div class="kv"><span class="k">Category</span>{{p.category}}</div>
        <div class="kv"><span class="k">Price</span>{{money(p.price)}}</div>
        <div class="kv"><span class="k">Stock</span>{{p.stock}}</div>
        <div class="kv"><span class="k">Sold</span>{{p.sold}}</div>
        <div class="kv"><span class="k">Listed</span>{{dstr(p.createdAt)}}</div>
        <div class="sect">Description</div>
        <p class="muted" style="margin:0;line-height:1.6">{{p.description || 'No description provided.'}}</p>
        <div class="sect">Storefront</div>
        <a class="btn btn-primary" [routerLink]="['/product', p.id]">Open product page</a>
      </div>
    </div>
  }

  @if (confirmReq(); as c) {
    <kc-confirm [title]="c.title" [message]="c.msg" [requireReason]="c.requireReason"
      [confirmLabel]="c.label" (confirm)="runConfirm($event)" (cancel)="confirmReq.set(null)"></kc-confirm>
  }`,
  styles: [`
    .pager{display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:12px 16px;border-top:1px solid var(--line)}
    .sim-note{padding:10px 16px;border:1px solid var(--line);border-radius:10px;font-size:11.5px;font-weight:600;background:var(--amber-050);color:var(--amber)}
    .live-note{background:var(--green-050);color:var(--green);border-color:transparent}
    .notice-row{display:flex;align-items:center;gap:8px;margin:0 0 12px;padding:9px 14px;border-radius:10px;background:var(--amber-050);color:var(--amber);font-size:12px;font-weight:600}
    .notice-row .link{margin-left:auto}
  `],
})
export class SellersComponent {
  d = inject(AdminService);
  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);

  tab = signal<'stores' | 'requests'>('stores');
  q = signal('');
  page = signal(1);
  stores = signal<StoreExt[]>([]);
  storesLoading = signal(true);
  storesError = signal('');
  totalPages = signal(1);
  acctFilter = signal<'all' | AccountStatus>('all');
  override = signal<Record<string, AccountStatus>>({});

  profile = signal<StoreExt | null>(null);
  profileProducts = signal<LiveProduct[]>([]);
  profileLoading = signal(false);
  profileError = signal('');
  selProduct = signal<LiveProduct | null>(null);

  apps = signal<SellerApplication[]>([]);
  appsLoading = signal(true);
  appsError = signal('');
  actionError = signal('');
  busyId = signal('');
  confirmReq = signal<ConfirmRequest | null>(null);

  dstr = dstr; money = money; initials = initials;
  ext = (s: ApiStore): StoreExt => s as StoreExt;
  acct = (s: ApiStore): AccountStatus => this.override()[s.id] ?? 'active';
  label = (status: string) => ({ DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under review', APPROVED: 'Verified', REJECTED: 'Rejected', SUSPENDED: 'Suspended' } as Record<string, string>)[status] ?? status;

  constructor() {
    try {
      const raw = localStorage.getItem(STATUS_KEY);
      if (raw) this.override.set(JSON.parse(raw));
    } catch { localStorage.removeItem(STATUS_KEY); }
    this.loadStores();
    this.loadApps();
  }

  storeRows = computed(() => {
    const needle = this.q().trim().toLowerCase();
    return this.stores().filter(s =>
      (this.acctFilter() === 'all' || this.acct(s) === this.acctFilter()) &&
      (!needle || [s.name, s.location ?? '', s.categoryName ?? ''].join(' ').toLowerCase().includes(needle)));
  });

  go(p: number) { this.page.set(p); this.loadStores(); }
  loadStores() {
    this.storesLoading.set(true); this.storesError.set('');
    this.api.stores(this.page(), 10).subscribe({
      next: (res) => {
        this.stores.set(res.stores as StoreExt[]);
        this.totalPages.set(Math.max(1, res.pagination.totalPages));
        this.storesLoading.set(false);
      },
      error: () => { this.stores.set([]); this.storesError.set('Could not reach the marketplace API. Is the backend running?'); this.storesLoading.set(false); },
    });
  }

  openProfile(s: StoreExt) { this.profile.set(s); this.loadProfileProducts(s.id); }
  closeProfile() { this.profile.set(null); this.selProduct.set(null); }
  loadProfileProducts(storeId: string) {
    this.profileLoading.set(true); this.profileError.set('');
    this.api.products({ storeId, limit: 60 }).subscribe({
      next: (res) => { this.profileProducts.set(res.products.map(p => this.api.toLive(p))); this.profileLoading.set(false); },
      error: () => { this.profileProducts.set([]); this.profileError.set('Could not load this store’s listings.'); this.profileLoading.set(false); },
    });
  }

  // ---------------------------------------------------- account status control
  menuForStore(s: StoreExt): MenuItem[] {
    const m: MenuItem[] = [{ label: 'Open storefront', icon: 'store', action: 'storefront' }];
    const status = this.acct(s);
    if (status === 'active') {
      m.push({ label: 'Suspend account', icon: 'ban', danger: true, action: 'suspended' });
      m.push({ label: 'Deactivate account', icon: 'x', danger: true, action: 'deactivated' });
    } else {
      m.push({ label: 'Reactivate account', icon: 'refresh', action: 'active' });
    }
    return m;
  }

  storeAct(action: string, s: StoreExt) {
    if (action === 'storefront') { void this.router.navigate(['/stores', s.id]); return; }
    if (action === 'active') {
      this.confirmReq.set({
        title: `Reactivate ${s.name}?`, label: 'Reactivate', requireReason: false,
        msg: 'The account returns to good standing in the admin workspace.',
        fn: () => this.applyStatus(s, 'active'),
      });
      return;
    }
    const verb = action === 'suspended' ? 'Suspend' : 'Deactivate';
    this.confirmReq.set({
      title: `${verb} ${s.name}?`, label: verb, requireReason: true,
      msg: `${verb === 'Suspend' ? 'Suspending blocks the account pending investigation' : 'Deactivating closes the account'} in the admin workspace. A written reason is required and stored in the audit log.`,
      fn: (reason) => this.applyStatus(s, action as AccountStatus, reason),
    });
  }

  private applyStatus(s: StoreExt, status: AccountStatus, reason?: string) {
    this.override.update(o => ({ ...o, [s.id]: status }));
    try { localStorage.setItem(STATUS_KEY, JSON.stringify(this.override())); } catch {}
    this.d.log(
      `${status === 'active' ? 'Reactivated' : status === 'suspended' ? 'Suspended' : 'Deactivated'} seller account ${s.name}`,
      status === 'active' ? 'approved' : 'suspended',
      { target: s.id, reason },
    );
    this.d.toast(`Account ${status}`);
  }

  // -------------------------------------------------- verification requests
  loadApps() {
    this.appsLoading.set(true); this.appsError.set('');
    this.api.applications().subscribe({
      next: (list) => { this.apps.set(list); this.appsLoading.set(false); },
      error: () => { this.apps.set([]); this.appsError.set('Could not load the request queue. Are you signed in as ADMIN?'); this.appsLoading.set(false); },
    });
  }
  menuForApp(a: SellerApplication): MenuItem[] {
    const m: MenuItem[] = [];
    if (a.status === 'SUBMITTED') m.push({ label: 'Start review', icon: 'search', action: 'review' });
    if (a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW') m.push({ label: 'Reject request', icon: 'x', danger: true, action: 'reject' });
    if (a.status === 'APPROVED') m.push({ label: 'Suspend verification', icon: 'ban', danger: true, action: 'suspend' });
    return m;
  }
  appAct(action: string, a: SellerApplication) {
    const name = `${a.firstName} ${a.lastName}`;
    if (action === 'review') { this.decide(a, 'UNDER_REVIEW', 'Request moved to review'); return; }
    if (action === 'reject') {
      this.confirmReq.set({ title: `Reject ${name}'s verification request?`, label: 'Reject', requireReason: true,
        msg: 'The seller keeps their account and store — only the verified badge is refused. The reason is stored on the request and shown to the seller.',
        fn: (reason) => this.decide(a, 'REJECTED', 'Request rejected', reason) });
      return;
    }
    if (action === 'suspend') {
      this.confirmReq.set({ title: `Suspend ${name}'s verification?`, label: 'Suspend', requireReason: true,
        msg: 'The verified badge is removed from their store. The reason is stored in the audit log.',
        fn: (reason) => this.decide(a, 'SUSPENDED', 'Verification suspended', reason) });
    }
  }
  askVerify(a: SellerApplication) {
    this.confirmReq.set({ title: `Verify ${a.firstName} ${a.lastName}'s store?`, label: 'Verify', requireReason: false,
      msg: 'The store gets the verified badge immediately (or as soon as the seller finishes creating it).',
      fn: () => this.decide(a, 'APPROVED', 'Store verified') });
  }
  private decide(a: SellerApplication, decision: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED', msg: string, reason?: string) {
    if (this.busyId()) return;
    this.busyId.set(a.id); this.actionError.set('');
    this.api.reviewApplication(a.id, decision, reason || undefined).subscribe({
      next: () => {
        this.busyId.set('');
        this.d.log(`Verification ${decision.toLowerCase()}: ${a.firstName} ${a.lastName}`,
          decision === 'APPROVED' ? 'approved' : decision === 'REJECTED' ? 'rejected' : decision === 'SUSPENDED' ? 'suspended' : 'pending',
          { target: a.id, reason });
        this.d.toast(msg);
        this.api.refreshBadges();
        this.loadApps();
      },
      error: (e) => { this.busyId.set(''); this.actionError.set(apiErrorMessage(e, 'The server refused that decision.')); },
    });
  }
  runConfirm(reason: string) { const c = this.confirmReq(); if (c) c.fn(reason); this.confirmReq.set(null); }
}