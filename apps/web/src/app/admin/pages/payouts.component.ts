import { Component, computed, inject, signal } from '@angular/core';
import { AdminService, Payout } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { StatComponent } from '../ui/stat.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { IconComponent } from '../ui/icon.component';
import { money, dstr } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent, StatComponent, ConfirmComponent, IconComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><span class="eyebrow">Finance · Disbursements</span><h1 class="page-title">Seller payouts</h1><p class="page-sub">Review seller disbursements and record confirmed transfers.</p></div></div>
    <div class="grid stats mb">
      <kc-stat label="Pending payouts" icon="pulse" [value]="pendingCount()" [hint]="money(pendingSum()) + ' awaiting'"></kc-stat>
      <kc-stat label="Completed" icon="check" [value]="doneCount()" [hint]="money(doneSum()) + ' paid out'"></kc-stat>
      <kc-stat label="Failed" icon="alert" [value]="failCount()"></kc-stat>
    </div>
    <div class="card"><table class="tbl">
      <thead><tr><th>Seller</th><th class="right">Amount</th><th>Requested</th><th>Status</th><th class="right">Actions</th></tr></thead>
      <tbody>
        @for (p of d.payouts(); track p.id) {
          <tr>
            <td class="cell-main">{{p.seller}}</td><td class="num">{{money(p.amount)}}</td>
            <td class="cell-sub">{{dstr(p.requestedAt)}}</td><td><kc-badge [value]="p.status"></kc-badge></td>
            <td class="right"><div class="cell-actions">
              <button class="icon-btn" aria-label="Review payout" data-tip="Review payout" (click)="selected.set(p)"><kc-icon name="eye" [size]="14"></kc-icon></button>
              @if (p.status !== 'completed') {
                <button class="btn btn-sm btn-primary" (click)="confirm.set(p)">Record completed</button>
              }
            </div></td>
          </tr>
        }
      </tbody>
    </table></div>

    @if (selected(); as p) {
      <div class="drawer-back" (click)="selected.set(null)"></div>
      <div class="drawer">
        <div class="drawer-head"><div><b>{{p.id}}</b> <kc-badge [value]="p.status"></kc-badge></div>
          <button class="icon-btn" aria-label="Close payout details" (click)="selected.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div>
        <div class="drawer-body">
          <div class="kv"><span class="k">Seller</span>{{p.seller}}</div>
          <div class="kv"><span class="k">Amount</span><b>{{money(p.amount)}}</b></div>
          <div class="kv"><span class="k">Requested</span>{{dstr(p.requestedAt)}}</div>
          <div class="sect">Finance review</div>
          <p class="muted">Only record completion after the transfer provider or finance team confirms the payout. The UI does not send money.</p>
          @if (p.status !== 'completed') {
            <button class="btn btn-primary" style="margin-top:12px" (click)="confirm.set(p)">Record completed payout</button>
          }
        </div>
      </div>
    }

    @if (confirm(); as p) {
      <kc-confirm title="Record completed payout?" [message]="'Only continue after the transfer provider confirms ' + money(p.amount) + ' was paid to ' + p.seller + '.'"
        confirmLabel="Record completion" [requireReason]="true" (confirm)="d.completePayout(p.id, $event); confirm.set(null); selected.set(null)" (cancel)="confirm.set(null)"></kc-confirm>
    }
  } @else { <div class="skel" style="height:320px"></div> }`,
})
export class PayoutsComponent {
  d = inject(AdminService);
  confirm = signal<Payout | null>(null);
  selected = signal<Payout | null>(null);
  money = money; dstr = dstr;
  pendingCount = computed(() => this.d.payouts().filter(p => p.status === 'pending').length);
  pendingSum = computed(() => this.d.payouts().filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0));
  doneCount = computed(() => this.d.payouts().filter(p => p.status === 'completed').length);
  doneSum = computed(() => this.d.payouts().filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0));
  failCount = computed(() => this.d.payouts().filter(p => p.status === 'failed').length);
}
