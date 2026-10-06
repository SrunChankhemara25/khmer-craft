import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminService } from '../admin-data.service';
import {
  AdminApiService, AdminOverview, AdminPlanPayment, AdminSellerRow, BillingStatus, Pagination,
} from '../admin-api.service';
import { apiErrorMessage } from '../../core/auth/auth.service';
import { BadgeComponent } from '../ui/badge.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { IconComponent } from '../ui/icon.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { StateComponent } from '../ui/state.component';
import { StatComponent } from '../ui/stat.component';
import { dstr, initials, money } from '../ui/format';

type Bucket = BillingStatus | 'all';
interface ConfirmRequest { title: string; msg: string; label: string; requireReason: boolean; fn: (reason: string) => void }

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'all', label: 'All sellers' },
  { key: 'paying', label: 'Paying' },
  { key: 'expiring', label: 'Expiring ≤ 7 days' },
  { key: 'lapsed', label: 'Lapsed (not renewed)' },
  { key: 'free', label: 'Free (Starter)' },
];

/**
 * Seller billing monitor: how many sellers exist, who is paying for a plan,
 * who has let it lapse, and who never paid — all from /api/admin, nothing
 * simulated. Suspending an account here is enforced server-side.
 */
@Component({
  standalone: true,
  imports: [BadgeComponent, ConfirmComponent, IconComponent, MenuComponent, StateComponent, StatComponent, RouterLink],
  template: `
  <div class="page-head">
    <div><h1 class="page-title">Seller Subscriptions</h1>
      <p class="page-sub">Who has an account, who pays for a plan, and who has stopped paying</p></div>
    <button class="btn btn-sm" (click)="refresh()"><kc-icon name="refresh" [size]="13"></kc-icon> Refresh</button>
  </div>

  @if (overviewError()) {
    <kc-state mode="error" [message]="overviewError()" (retry)="loadOverview()"></kc-state>
  } @else if (ov(); as o) {
    <div class="grid stats mb">
      <kc-stat label="Seller accounts" icon="users" [value]="o.sellers.accounts" [hint]="'+' + o.sellers.newThisMonth + ' this month · ' + o.sellers.stores + ' stores'"></kc-stat>
      <kc-stat label="Paying for a plan" icon="check" [value]="o.subscriptions.paying"
        [hint]="o.subscriptions.labels.STANDARD + ' ' + o.subscriptions.byPlan.STANDARD + ' · ' + o.subscriptions.labels.PREMIUM + ' ' + o.subscriptions.byPlan.PREMIUM"></kc-stat>
      <kc-stat label="Not paying" icon="ban" [value]="o.subscriptions.free + o.subscriptions.lapsed"
        [hint]="o.subscriptions.free + ' free · ' + o.subscriptions.lapsed + ' lapsed'"></kc-stat>
      <kc-stat label="Monthly recurring revenue" icon="wallet" [value]="money(o.subscriptions.mrr)"
        [hint]="money(o.revenue.thisMonth) + ' collected this month'"></kc-stat>
    </div>

    <div class="card card-pad mb">
      <div class="mix-head">
        <h3 class="card-title">Billing mix</h3>
        <span class="muted">{{o.sellers.stores}} stores · {{payingPct()}}% paying</span>
      </div>
      <div class="mix" role="img" [attr.aria-label]="mixLabel()">
        @for (seg of mix(); track seg.key) {
          @if (seg.value) { <button class="seg" [class]="'seg seg-' + seg.key" [style.flex-grow]="seg.value" [attr.data-tip]="seg.label + ': ' + seg.value" (click)="setBucket(seg.key)"></button> }
        }
      </div>
      <div class="legend">
        @for (seg of mix(); track seg.key) {
          <button class="legend-item" (click)="setBucket(seg.key)"><span class="sw" [class]="'sw seg-' + seg.key"></span>{{seg.label}} <b>{{seg.value}}</b></button>
        }
      </div>
      @if (o.revenue.failedThisMonth || o.revenue.pendingPayments) {
        <p class="muted" style="margin:10px 0 0;font-size:12px">
          {{o.revenue.failedThisMonth}} failed plan payment{{o.revenue.failedThisMonth === 1 ? '' : 's'}} this month ·
          {{o.revenue.pendingPayments}} checkout{{o.revenue.pendingPayments === 1 ? '' : 's'}} still awaiting payment
        </p>
      }
    </div>
  } @else { <div class="skel mb" style="height:200px"></div> }

  <div class="toolbar">
    <div class="tabs">
      <button class="tab" [class.active]="tab() === 'sellers'" (click)="tab.set('sellers')">Sellers</button>
      <button class="tab" [class.active]="tab() === 'payments'" (click)="tab.set('payments'); loadPayments()">Plan payments</button>
    </div>
    @if (tab() === 'sellers') {
      <select class="input" [value]="bucket()" (change)="setBucket($any($event.target).value)" aria-label="Billing status">
        @for (b of buckets; track b.key) { <option [value]="b.key">{{b.label}}</option> }
      </select>
      <input class="input input-search" placeholder="Store, owner name or email…" [value]="q()"
        (input)="q.set($any($event.target).value)" (keydown.enter)="search()"/>
      <button class="btn btn-sm" (click)="search()"><kc-icon name="search" [size]="13"></kc-icon> Search</button>
    } @else {
      <select class="input" [value]="payStatus()" (change)="payStatus.set($any($event.target).value); payPage.set(1); loadPayments()" aria-label="Payment status">
        <option value="ALL">All payments</option><option value="PAID">Paid</option>
        <option value="PENDING">Pending</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option>
      </select>
    }
  </div>

  @if (actionError()) {
    <div class="notice-row" role="alert"><kc-icon name="alert" [size]="14"></kc-icon> {{actionError()}}
      <button class="link" (click)="actionError.set('')">Dismiss</button></div>
  }

  @if (tab() === 'sellers') {
    <div class="card">
      @if (loading()) { <kc-state mode="loading" message="Loading seller accounts…"></kc-state> }
      @else if (error()) { <kc-state mode="error" [message]="error()" (retry)="load()"></kc-state> }
      @else if (!rows().length) { <kc-state mode="empty" message="No sellers match this filter."></kc-state> }
      @else {
        <table class="tbl">
          <thead><tr><th>Store / owner</th><th>Plan</th><th>Billing</th><th>Renews / lapsed</th><th class="right">Paid to date</th><th class="right">Listings</th><th>Account</th><th class="right">Actions</th></tr></thead>
          <tbody>
            @for (r of rows(); track r.storeId) {
              <tr>
                <td><div class="cell-flex"><span class="thumb">{{initials(r.storeName)}}</span>
                  <div><div class="cell-main">{{r.storeName}}</div>
                    <div class="cell-sub">{{r.owner?.name || 'Unknown owner'}} · {{r.owner?.email || '—'}}</div></div></div></td>
                <td><div class="cell-main">{{r.billing.planLabel}}</div>
                  <div class="cell-sub">{{r.billing.monthlyPrice ? money(r.billing.monthlyPrice) + '/mo' : 'Free'}}</div></td>
                <td><kc-badge [value]="r.billing.status"></kc-badge></td>
                <td class="cell-sub">
                  @if (r.billing.expiresAt) { {{r.billing.status === 'lapsed' ? 'Ended' : 'Renews by'}} {{dstr(r.billing.expiresAt)}} } @else { — }
                </td>
                <td class="num">{{money(r.billing.totalPaid)}}<div class="cell-sub">{{r.billing.paidCount}} payment{{r.billing.paidCount === 1 ? '' : 's'}}</div></td>
                <td class="num">{{r.productCount}}</td>
                <td><kc-badge [value]="(r.owner?.status || 'unknown').toLowerCase()"></kc-badge></td>
                <td class="right"><div class="cell-actions">
                  <button class="icon-btn" aria-label="Details" data-tip="Details" (click)="sel.set(r)"><kc-icon name="eye" [size]="14"></kc-icon></button>
                  <kc-menu [items]="menu(r)" (pick)="act($event, r)"></kc-menu>
                </div></td>
              </tr>
            }
          </tbody>
        </table>
        <div class="pager">
          <span class="muted">{{pagination().total}} seller{{pagination().total === 1 ? '' : 's'}}</span>
          <span class="grow"></span>
          <button class="btn btn-sm" [disabled]="page() === 1" (click)="go(page() - 1)">Previous</button>
          <span class="muted">Page {{page()}} of {{pagination().totalPages}}</span>
          <button class="btn btn-sm" [disabled]="page() >= pagination().totalPages" (click)="go(page() + 1)">Next</button>
        </div>
      }
    </div>
  }

  @if (tab() === 'payments') {
    <div class="card">
      @if (payLoading()) { <kc-state mode="loading" message="Loading plan payments…"></kc-state> }
      @else if (payError()) { <kc-state mode="error" [message]="payError()" (retry)="loadPayments()"></kc-state> }
      @else if (!payments().length) { <kc-state mode="empty" message="No plan payments in this filter."></kc-state> }
      @else {
        <table class="tbl">
          <thead><tr><th>Store</th><th>Paid by</th><th>Plan</th><th class="right">Amount</th><th>Status</th><th>Period</th><th>Created</th><th>Transaction</th></tr></thead>
          <tbody>
            @for (p of payments(); track p.id) {
              <tr>
                <td class="cell-main">{{p.storeName}}</td>
                <td><div>{{p.payerName || '—'}}</div><div class="cell-sub">{{p.payerEmail}}</div></td>
                <td>{{p.planLabel}}</td>
                <td class="num">{{money(p.amount)}}</td>
                <td><kc-badge [value]="p.status.toLowerCase()"></kc-badge></td>
                <td class="cell-sub">@if (p.periodStart && p.periodEnd) { {{dstr(p.periodStart)}} → {{dstr(p.periodEnd)}} } @else { — }</td>
                <td class="cell-sub">{{dstr(p.createdAt)}}</td>
                <td class="cell-sub mono">{{p.tranId}}</td>
              </tr>
            }
          </tbody>
        </table>
        <div class="pager">
          <span class="muted">{{payPagination().total}} payment{{payPagination().total === 1 ? '' : 's'}}</span>
          <span class="grow"></span>
          <button class="btn btn-sm" [disabled]="payPage() === 1" (click)="payPage.set(payPage() - 1); loadPayments()">Previous</button>
          <span class="muted">Page {{payPage()}} of {{payPagination().totalPages}}</span>
          <button class="btn btn-sm" [disabled]="payPage() >= payPagination().totalPages" (click)="payPage.set(payPage() + 1); loadPayments()">Next</button>
        </div>
      }
    </div>
  }

  @if (sel(); as r) {
    <div class="drawer-back" (click)="sel.set(null)"></div>
    <div class="drawer" role="dialog" [attr.aria-label]="r.storeName">
      <div class="drawer-head"><div><b>{{r.storeName}}</b> <kc-badge [value]="r.billing.status"></kc-badge></div>
        <button class="icon-btn" aria-label="Close" (click)="sel.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div>
      <div class="drawer-body">
        <div class="sect">Owner account</div>
        <div class="kv"><span class="k">Name</span>{{r.owner?.name || '—'}}</div>
        <div class="kv"><span class="k">Email</span>{{r.owner?.email || '—'}}</div>
        <div class="kv"><span class="k">Account</span><kc-badge [value]="(r.owner?.status || 'unknown').toLowerCase()"></kc-badge></div>
        @if (r.owner?.joinedAt) { <div class="kv"><span class="k">Joined</span>{{dstr(r.owner!.joinedAt!)}}</div> }
        <div class="sect">Subscription</div>
        <div class="kv"><span class="k">Current plan</span>{{r.billing.planLabel}}</div>
        @if (r.billing.plan !== r.billing.effectivePlan) { <div class="kv"><span class="k">Last bought</span>{{r.billing.plan}} (lapsed)</div> }
        <div class="kv"><span class="k">Price</span>{{r.billing.monthlyPrice ? money(r.billing.monthlyPrice) + ' / 30 days' : 'Free'}}</div>
        <div class="kv"><span class="k">{{r.billing.status === 'lapsed' ? 'Ended' : 'Paid through'}}</span>{{r.billing.expiresAt ? dstr(r.billing.expiresAt) : '—'}}</div>
        <div class="kv"><span class="k">Paid to date</span>{{money(r.billing.totalPaid)}} ({{r.billing.paidCount}}×)</div>
        <div class="kv"><span class="k">Last payment</span>{{r.billing.lastPaidAt ? dstr(r.billing.lastPaidAt) : 'Never'}}</div>
        @if (r.billing.lastAttemptStatus) {
          <div class="kv"><span class="k">Latest checkout</span><kc-badge [value]="r.billing.lastAttemptStatus.toLowerCase()"></kc-badge></div>
        }
        <div class="sect">Store</div>
        <div class="kv"><span class="k">Slug</span>{{r.slug}}</div>
        <div class="kv"><span class="k">Onboarding</span>{{r.onboardingStatus === 'COMPLETED' ? 'Completed' : 'In progress'}}</div>
        <div class="kv"><span class="k">Verification</span>{{r.verificationStatus.toLowerCase()}}</div>
        <div class="kv"><span class="k">Live listings</span>{{r.productCount}}</div>
        @if (r.createdAt) { <div class="kv"><span class="k">Store created</span>{{dstr(r.createdAt)}}</div> }
        <div style="display:flex;gap:8px;margin-top:16px">
          <a class="btn" [routerLink]="['/stores', r.slug]">Open storefront</a>
          @if (r.owner && r.owner.role !== 'ADMIN') {
            @if (r.owner.status === 'ACTIVE') { <button class="btn btn-danger" (click)="act('suspend', r)">Suspend account</button> }
            @else { <button class="btn" (click)="act('reactivate', r)">Reactivate account</button> }
          }
        </div>
      </div>
    </div>
  }

  @if (confirmReq(); as c) {
    <kc-confirm [title]="c.title" [message]="c.msg" [requireReason]="c.requireReason"
      [confirmLabel]="c.label" (confirm)="runConfirm($event)" (cancel)="confirmReq.set(null)"></kc-confirm>
  }`,
  styles: [`
    .pager{display:flex;align-items:center;gap:12px;padding:12px 16px;border-top:1px solid var(--line)}
    .pager .grow{flex:1}
    .mix-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .mix{display:flex;gap:2px;height:14px;border-radius:7px;overflow:hidden;background:var(--gray)}
    .seg{border:0;padding:0;cursor:pointer;min-width:6px;transition:opacity .15s}
    .seg:hover{opacity:.8}
    .seg-paying{background:var(--green)}
    .seg-expiring{background:var(--amber)}
    .seg-lapsed{background:var(--red)}
    .seg-free{background:var(--line-2)}
    .legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:10px}
    .legend-item{display:inline-flex;align-items:center;gap:7px;border:0;background:none;padding:0;font:inherit;font-size:12.5px;color:var(--ink);cursor:pointer}
    .legend-item b{font-weight:650}
    .sw{width:10px;height:10px;border-radius:3px;display:inline-block}
    .mono{font-family:ui-monospace,Consolas,monospace;font-size:11px}
    .notice-row{display:flex;align-items:center;gap:8px;margin:0 0 12px;padding:9px 14px;border-radius:10px;background:var(--red-050);color:var(--red);font-size:12px;font-weight:600}
    .notice-row .link{margin-left:auto}
  `],
})
export class SubscriptionsComponent {
  private readonly api = inject(AdminApiService);
  private readonly d = inject(AdminService);
  private readonly route = inject(ActivatedRoute);

  buckets = BUCKETS;
  money = money; dstr = dstr; initials = initials;

  ov = signal<AdminOverview | null>(null);
  overviewError = signal('');

  tab = signal<'sellers' | 'payments'>('sellers');
  bucket = signal<Bucket>('all');
  q = signal('');
  page = signal(1);
  rows = signal<AdminSellerRow[]>([]);
  pagination = signal<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  loading = signal(true);
  error = signal('');

  payStatus = signal('ALL');
  payPage = signal(1);
  payments = signal<AdminPlanPayment[]>([]);
  payPagination = signal<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  payLoading = signal(false);
  payError = signal('');

  sel = signal<AdminSellerRow | null>(null);
  confirmReq = signal<ConfirmRequest | null>(null);
  actionError = signal('');

  mix = computed(() => {
    const s = this.ov()?.subscriptions;
    if (!s) return [];
    return [
      { key: 'paying' as Bucket, label: 'Paying', value: s.paying - s.expiring },
      { key: 'expiring' as Bucket, label: 'Expiring soon', value: s.expiring },
      { key: 'lapsed' as Bucket, label: 'Lapsed', value: s.lapsed },
      { key: 'free' as Bucket, label: 'Free', value: s.free },
    ];
  });
  payingPct = computed(() => {
    const o = this.ov();
    return o && o.sellers.stores ? Math.round((o.subscriptions.paying / o.sellers.stores) * 100) : 0;
  });
  mixLabel = computed(() => this.mix().map((m) => `${m.label} ${m.value}`).join(', '));

  constructor() {
    const b = this.route.snapshot.queryParamMap.get('billing') as Bucket | null;
    if (b && BUCKETS.some((x) => x.key === b)) this.bucket.set(b);
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) this.q.set(q);
    this.refresh();
  }

  refresh() { this.loadOverview(); this.load(); if (this.tab() === 'payments') this.loadPayments(); }

  loadOverview() {
    this.overviewError.set('');
    this.api.overview().subscribe({
      next: (o) => this.ov.set(o),
      error: (e) => this.overviewError.set(e?.status === 401 || e?.status === 403
        ? 'Live seller and subscription numbers need an ADMIN session. Sign in at /admin/login.'
        : apiErrorMessage(e, 'Could not load live seller numbers.')),
    });
  }

  load() {
    this.loading.set(true); this.error.set('');
    this.api.sellerAccounts({ billing: this.bucket(), q: this.q(), page: this.page() }).subscribe({
      next: (res) => { this.rows.set(res.sellers); this.pagination.set(res.pagination); this.loading.set(false); },
      error: (e) => { this.rows.set([]); this.error.set(apiErrorMessage(e, 'Could not load seller accounts.')); this.loading.set(false); },
    });
  }

  loadPayments() {
    this.payLoading.set(true); this.payError.set('');
    this.api.planPayments({ status: this.payStatus(), page: this.payPage() }).subscribe({
      next: (res) => { this.payments.set(res.payments); this.payPagination.set(res.pagination); this.payLoading.set(false); },
      error: (e) => { this.payments.set([]); this.payError.set(apiErrorMessage(e, 'Could not load plan payments.')); this.payLoading.set(false); },
    });
  }

  setBucket(b: Bucket) { this.tab.set('sellers'); this.bucket.set(b); this.page.set(1); this.load(); }
  search() { this.page.set(1); this.load(); }
  go(p: number) { this.page.set(p); this.load(); }

  menu(r: AdminSellerRow): MenuItem[] {
    const m: MenuItem[] = [{ label: 'View details', icon: 'eye', action: 'details' }];
    if (r.owner && r.owner.role !== 'ADMIN') {
      m.push(r.owner.status === 'ACTIVE'
        ? { label: 'Suspend account', icon: 'ban', danger: true, action: 'suspend' }
        : { label: 'Reactivate account', icon: 'refresh', action: 'reactivate' });
    }
    return m;
  }

  act(action: string, r: AdminSellerRow) {
    if (action === 'details') { this.sel.set(r); return; }
    const owner = r.owner;
    if (!owner) return;
    if (action === 'suspend') {
      this.confirmReq.set({
        title: `Suspend ${owner.name}?`, label: 'Suspend', requireReason: true,
        msg: `${owner.email} is signed out everywhere and cannot sign in or manage ${r.storeName} until reactivated. The reason is kept in the activity log.`,
        fn: (reason) => this.setStatus(r, 'SUSPENDED', reason),
      });
    } else if (action === 'reactivate') {
      this.confirmReq.set({
        title: `Reactivate ${owner.name}?`, label: 'Reactivate', requireReason: false,
        msg: 'The seller can sign in and manage their store again.',
        fn: () => this.setStatus(r, 'ACTIVE'),
      });
    }
  }

  private setStatus(r: AdminSellerRow, status: 'ACTIVE' | 'SUSPENDED', reason?: string) {
    this.actionError.set('');
    this.api.setUserStatus(r.owner!.id, status, reason || undefined).subscribe({
      next: (res) => {
        const patch = (row: AdminSellerRow): AdminSellerRow =>
          row.owner?.id === res.id ? { ...row, owner: { ...row.owner, status: res.status } } : row;
        this.rows.update((list) => list.map(patch));
        const open = this.sel();
        if (open) this.sel.set(patch(open));
        this.d.log(`${status === 'SUSPENDED' ? 'Suspended' : 'Reactivated'} seller account ${r.owner!.email} (${r.storeName})`,
          status === 'SUSPENDED' ? 'suspended' : 'approved', { target: r.owner!.id, reason });
        this.d.toast(status === 'SUSPENDED' ? 'Account suspended' : 'Account reactivated');
        this.loadOverview();
      },
      error: (e) => this.actionError.set(apiErrorMessage(e, 'The server refused that change.')),
    });
  }

  runConfirm(reason: string) { const c = this.confirmReq(); if (c) c.fn(reason); this.confirmReq.set(null); }
}
