import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../admin-data.service';
import { AdminApiService, AdminOverview, AdminSellerRow, PayoutBalances } from '../admin-api.service';
import { apiErrorMessage } from '../../core/auth/auth.service';
import { IconComponent } from '../ui/icon.component';
import { StateComponent } from '../ui/state.component';
import { StatComponent } from '../ui/stat.component';
import { BadgeComponent } from '../ui/badge.component';
import { BarChartComponent, LineChartComponent } from '../ui/charts.component';
import { dstr, initials, money } from '../ui/format';
import { LiveStripComponent } from '../ui/live-strip.component';

@Component({
  standalone: true,
  imports: [StatComponent, BadgeComponent, BarChartComponent, LineChartComponent, RouterLink, LiveStripComponent, IconComponent, StateComponent],
  template: `
  @if (d.ready()) {
        <div class="page-head"><div><h1 class="page-title">Dashboard</h1><p class="page-sub">Marketplace health at a glance</p></div></div>
    <kc-live-strip></kc-live-strip>

    <!-- ============ LIVE: sellers, subscriptions, requests ============ -->
    @if (ovError()) {
      <div class="card mb"><kc-state mode="error" compact [message]="ovError()" (retry)="loadOverview()"></kc-state></div>
    } @else if (ov(); as o) {
      <div class="grid stats mb">
        <kc-stat label="Seller accounts" icon="store" [value]="o.sellers.accounts"
          [hint]="'+' + o.sellers.newThisMonth + ' this month · ' + o.sellers.stores + ' stores'"></kc-stat>
        <kc-stat label="Paying for a plan" icon="check" [value]="o.subscriptions.paying"
          [hint]="o.subscriptions.labels.STANDARD + ' ' + o.subscriptions.byPlan.STANDARD + ' · ' + o.subscriptions.labels.PREMIUM + ' ' + o.subscriptions.byPlan.PREMIUM"></kc-stat>
        <kc-stat label="Not paying" icon="ban" [value]="o.subscriptions.free + o.subscriptions.lapsed"
          [hint]="o.subscriptions.free + ' free · ' + o.subscriptions.lapsed + ' lapsed'"></kc-stat>
        <kc-stat label="Monthly recurring revenue" icon="wallet" [value]="money(o.subscriptions.mrr)"
          [hint]="money(o.revenue.thisMonth) + ' collected this month'"></kc-stat>
      </div>

      <div class="grid g3 mb">
        <div class="card">
          <div class="card-head"><h3 class="card-title">Needs your attention</h3>
            <span class="muted">{{o.requests.total}} request{{o.requests.total === 1 ? '' : 's'}}</span></div>
          <div class="card-pad todo">
            <a class="todo-row" routerLink="/admin/sellers" [queryParams]="{ tab: 'requests' }">
              <kc-icon name="shield" [size]="14"></kc-icon><span>Seller verification requests</span><b [class.hot]="o.requests.verification">{{o.requests.verification}}</b></a>
            <a class="todo-row" routerLink="/admin/slides">
              <kc-icon name="image" [size]="14"></kc-icon><span>Homepage slide requests</span><b [class.hot]="o.requests.slides">{{o.requests.slides}}</b></a>
            <a class="todo-row" routerLink="/admin/subscriptions" [queryParams]="{ billing: 'expiring' }">
              <kc-icon name="clock" [size]="14"></kc-icon><span>Plans expiring within 7 days</span><b [class.warn]="o.subscriptions.expiring">{{o.subscriptions.expiring}}</b></a>
            <a class="todo-row" routerLink="/admin/subscriptions" [queryParams]="{ billing: 'lapsed' }">
              <kc-icon name="alert" [size]="14"></kc-icon><span>Lapsed plans (not renewed)</span><b>{{o.subscriptions.lapsed}}</b></a>
            <a class="todo-row" routerLink="/admin/subscriptions">
              <kc-icon name="card" [size]="14"></kc-icon><span>Failed plan payments this month</span><b [class.warn]="o.revenue.failedThisMonth">{{o.revenue.failedThisMonth}}</b></a>
            @if (payouts(); as p) {
              <a class="todo-row" routerLink="/admin/payouts">
                <kc-icon name="wallet" [size]="14"></kc-icon><span>Sellers due a payout ({{money(p.totals.dueNow)}})</span><b [class.hot]="p.totals.dueStores">{{p.totals.dueStores}}</b></a>
              <a class="todo-row" routerLink="/admin/payouts">
                <kc-icon name="shield" [size]="14"></kc-icon><span>Payout accounts to verify</span><b [class.hot]="p.totals.accountsToVerify">{{p.totals.accountsToVerify}}</b></a>
            }
          </div>
        </div>
        <div class="card"><div class="card-head"><h3 class="card-title">New stores</h3><span class="muted">last 6 months</span></div>
          <kc-bars [data]="storeSeries()"></kc-bars></div>
        <div class="card"><div class="card-head"><h3 class="card-title">Plan revenue</h3><span class="muted">{{money(o.revenue.allTime)}} all time</span></div>
          <kc-line [values]="planRevVals()" [labels]="planRevLabels()"></kc-line></div>
      </div>

      <div class="grid half mb">
        <div class="card">
          <div class="card-head"><h3 class="card-title">Plans about to lapse</h3>
            <a class="link" routerLink="/admin/subscriptions" [queryParams]="{ billing: 'expiring' }">See all</a></div>
          @if (!o.subscriptions.expiringSoon.length) {
            <kc-state mode="empty" compact message="No paid plan ends in the next 7 days."></kc-state>
          } @else {
            <table class="tbl"><tbody>
              @for (s of o.subscriptions.expiringSoon; track s.storeId) {
                <tr><td><div class="cell-flex"><span class="thumb">{{initials(s.storeName)}}</span>
                  <div><div class="cell-main">{{s.storeName}}</div><div class="cell-sub">{{s.plan === 'PREMIUM' ? o.subscriptions.labels.PREMIUM : o.subscriptions.labels.STANDARD}} plan</div></div></div></td>
                  <td class="right cell-sub">ends {{s.expiresAt ? dstr(s.expiresAt) : '—'}}</td></tr>
              }
            </tbody></table>
          }
        </div>
        <div class="card card-pad">
          <h3 class="card-title" style="margin-bottom:8px">Marketplace accounts</h3>
          <div class="kv"><span class="k">Buyer accounts</span>{{o.buyers.accounts}} <span class="cell-sub">(+{{o.buyers.newThisMonth}} this month)</span></div>
          <div class="kv"><span class="k">Stores finished onboarding</span>{{o.sellers.onboarded}} of {{o.sellers.stores}}</div>
          <div class="kv"><span class="k">Verified stores</span>{{o.sellers.verified}}</div>
          <div class="kv"><span class="k">Suspended seller accounts</span>{{o.sellers.suspended}}</div>
          <div class="kv"><span class="k">Slides live on homepage</span>{{o.slides.live}}</div>
        </div>
      </div>
    } @else { <div class="skel mb" style="height:260px"></div> }

    <div class="sect" style="margin-top:22px">Sample data — orders, reports and complaints are not connected to the API yet</div>

    <div class="grid duo mb">
      <div class="card">
        <div class="card-head"><h3 class="card-title">Recent orders</h3><a class="link" routerLink="/admin/payments">Review payments</a></div>
        <table class="tbl"><thead><tr><th>Order</th><th>Buyer</th><th class="right">Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>
            @for (o of d.orders().slice(0, 6); track o.id) {
              <tr><td class="cell-main">{{o.id}}</td><td>{{o.buyer}}</td><td class="num">{{money(o.total)}}</td>
                <td><kc-badge [value]="o.payment"></kc-badge></td><td><kc-badge [value]="o.status"></kc-badge></td></tr>
            }
          </tbody></table>
      </div>
      <div class="card card-pad">
        <h3 class="card-title" style="margin-bottom:8px">Recent platform activity</h3>
        @for (l of d.logs().slice(0, 8); track l.id) {
          <div class="list-item"><span class="pulse-dot"></span>
            <div><div>{{l.action}}</div><div class="cell-sub">{{l.actor}} · {{dstr(l.date)}}</div></div>
          </div>
        }
      </div>
    </div>

    <div class="grid g3">
      <div class="card">
        <div class="card-head"><h3 class="card-title">Best-selling products</h3></div>
        <table class="tbl"><thead><tr><th>Product</th><th class="right">Sold</th><th class="right">Revenue</th></tr></thead>
          <tbody>
            @for (p of best; track p.id) {
              <tr><td><div class="cell-flex"><span class="thumb">{{initials(p.name)}}</span>{{p.name}}</div></td>
                <td class="num">{{p.sold}}</td><td class="num">{{money(p.sold * p.price)}}</td></tr>
            }
          </tbody></table>
      </div>
      <div class="card">
        <div class="card-head"><h3 class="card-title">Low-stock products</h3><span class="muted">≤ 5 units</span></div>
        <table class="tbl"><tbody>
          @for (p of low; track p.id) {
            <tr><td><div class="cell-flex"><span class="thumb">{{initials(p.name)}}</span>
              <div><div class="cell-main">{{p.name}}</div><div class="cell-sub">{{d.storeName(p.sellerId)}}</div></div></div></td>
              <td class="right"><kc-badge [value]="p.stock === 0 ? 'hidden' : 'pending'"></kc-badge><span class="cell-sub"> {{p.stock}} left</span></td></tr>
          }
        </tbody></table>
      </div>
      <div class="card">
        <div class="card-head"><h3 class="card-title">Recent seller registrations</h3><a class="link" routerLink="/admin/sellers">Review</a></div>
        <div class="card-pad">
          @for (s of recentSellers(); track s.storeId) {
            <div class="list-item"><span class="thumb">{{initials(s.storeName)}}</span>
              <div style="flex:1;min-width:0"><div class="cell-main">{{s.storeName}}</div>
                <div class="cell-sub">{{s.owner?.name || 'Unknown owner'}} · {{s.createdAt ? dstr(s.createdAt) : '—'}}</div></div>
              <kc-badge [value]="s.billing.status"></kc-badge>
            </div>
          } @empty { <p class="muted" style="margin:0">No stores yet.</p> }
          @if (ov(); as o) {
            <div class="sect">New this month</div>
            <p class="muted" style="margin:0">{{o.buyers.newThisMonth}} new buyers · {{o.sellers.newThisMonth}} new sellers</p>
          }
        </div>
      </div>
    </div>
  } @else { <div class="skel" style="height:420px"></div> }`,
  styles: [`
    .todo{padding-top:6px;padding-bottom:6px}
    .todo-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);color:var(--ink);text-decoration:none;font-size:13px}
    .todo-row:last-child{border-bottom:0}
    .todo-row:hover span{color:var(--accent)}
    .todo-row kc-icon{color:var(--muted)}
    .todo-row span{flex:1}
    .todo-row b{min-width:26px;text-align:center;padding:1px 8px;border-radius:99px;background:var(--gray);color:var(--muted);font-size:12px;font-weight:650}
    .todo-row b.hot{background:var(--accent);color:#fff}
    .todo-row b.warn{background:var(--amber-050);color:var(--amber)}
  `],
})
export class DashboardComponent {
  d = inject(AdminService);
  private readonly api = inject(AdminApiService);
  money = money; dstr = dstr; initials = initials;
  ov = signal<AdminOverview | null>(null);
  payouts = signal<PayoutBalances | null>(null);
  ovError = signal('');
  storeSeries = computed(() => (this.ov()?.series ?? []).map(s => ({ label: s.label, value: s.newStores })));
  planRevVals = computed(() => (this.ov()?.series ?? []).map(s => s.revenue));
  planRevLabels = computed(() => (this.ov()?.series ?? []).map(s => s.label));

  constructor() {
    this.loadOverview();
    this.api.payoutBalances().subscribe({ next: (b) => this.payouts.set(b), error: () => this.payouts.set(null) });
    this.api.sellerAccounts({ limit: 4 }).subscribe({ next: (r) => this.recentSellers.set(r.sellers), error: () => this.recentSellers.set([]) });
  }

  loadOverview() {
    this.ovError.set('');
    this.api.overview().subscribe({
      next: (o) => this.ov.set(o),
      error: (e) => this.ovError.set(e?.status === 401 || e?.status === 403
        ? 'Live seller and subscription numbers need an ADMIN session. Sign in at /admin/login.'
        : apiErrorMessage(e, 'Could not load live seller numbers.')),
    });
  }
  best = [...this.d.products()].sort((a, b) => b.sold - a.sold).slice(0, 5);
  low = this.d.products().filter(p => p.status === 'active' && p.stock <= 5);
  recentSellers = signal<AdminSellerRow[]>([]);
}
