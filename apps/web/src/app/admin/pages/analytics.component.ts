import { Component, computed, inject } from '@angular/core';
import { AdminService } from '../admin-data.service';
import { StatComponent } from '../ui/stat.component';
import { BadgeComponent } from '../ui/badge.component';
import { LineChartComponent, BarChartComponent } from '../ui/charts.component';
import { money } from '../ui/format';

@Component({
  standalone: true,
  imports: [StatComponent, BadgeComponent, LineChartComponent, BarChartComponent],
  template: `
  <div class="page-head"><div><span class="eyebrow">Intelligence · Performance</span><h1 class="page-title">Analytics</h1><p class="page-sub">Operational metrics from the currently available admin dataset.</p></div><span class="muted">Formula and source shown below</span></div>
  <div class="card card-pad ops-note mb"><b>Data boundary</b><p class="muted">These metrics use records currently exposed to the admin frontend. Channel attribution, ad impressions, POS shifts, and subscription events remain unavailable until their APIs exist.</p></div>
  <div class="grid stats mb">
    <kc-stat label="Active sellers" icon="store" [value]="activeSellers()" hint="source: seller records"></kc-stat>
    <kc-stat label="Published products" icon="box" [value]="publishedProducts()" hint="source: product records"></kc-stat>
    <kc-stat label="Completed orders" icon="cart" [value]="completedOrders()" hint="source: order records"></kc-stat>
    <kc-stat label="Collected payment events" icon="card" [value]="money(collected())" hint="not platform revenue"></kc-stat>
  </div>
  <div class="grid half mb">
    <div class="card"><div class="card-head"><h3 class="card-title">Order volume</h3><span class="muted">last 6 months</span></div><kc-bars [data]="d.ordersSeries()"></kc-bars></div>
    <div class="card"><div class="card-head"><h3 class="card-title">Recorded payment inflow</h3><span class="muted">last 6 months</span></div><kc-line [values]="revenueValues()" [labels]="revenueLabels()"></kc-line></div>
  </div>
  <div class="card"><div class="card-head"><h3 class="card-title">Metric definitions</h3><span class="muted">audit before using for decisions</span></div>
    <table class="tbl"><tbody>
      <tr><td class="cell-main">Collected payment events</td><td>Sum of payments with status completed</td><td><kc-badge value="available"></kc-badge></td></tr>
      <tr><td class="cell-main">Completed orders</td><td>Count of orders with status completed</td><td><kc-badge value="available"></kc-badge></td></tr>
      <tr><td class="cell-main">POS transactions</td><td>Requires register and channel metadata</td><td><kc-badge value="unavailable"></kc-badge></td></tr>
      <tr><td class="cell-main">Advertising performance</td><td>Requires booking, impression, and click events</td><td><kc-badge value="unavailable"></kc-badge></td></tr>
    </tbody></table>
  </div>`,
})
export class AnalyticsComponent {
  d = inject(AdminService); money = money;
  activeSellers = computed(() => this.d.sellers().filter(s => s.status === 'active').length);
  publishedProducts = computed(() => this.d.products().filter(p => p.status === 'active').length);
  completedOrders = computed(() => this.d.orders().filter(o => o.status === 'completed').length);
  collected = computed(() => this.d.payments().filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0));
  revenueValues = computed(() => this.d.revenueSeries().map(x => x.value));
  revenueLabels = computed(() => this.d.revenueSeries().map(x => x.label));
}
