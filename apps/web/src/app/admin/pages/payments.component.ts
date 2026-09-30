import { Component, computed, inject, signal } from '@angular/core';
import { AdminService, Payment } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { StatComponent } from '../ui/stat.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { IconComponent } from '../ui/icon.component';
import { dstr, money } from '../ui/format';

@Component({
  standalone: true,
  imports: [BadgeComponent, StatComponent, ConfirmComponent, IconComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head">
      <div><h1 class="page-title">Payments</h1><p class="page-sub">Review payment events, exceptions, and refund decisions</p></div>
      <span class="muted">Admin review only · no provider action is simulated</span>
    </div>

    <div class="card card-pad ops-note mb">
      <kc-icon name="shield" [size]="17"></kc-icon>
      <div><b>Payment control policy</b><p class="muted">A refund request is not a completed refund. Record confirmation only after the payment provider or finance team confirms the money was returned.</p></div>
    </div>

    <div class="grid stats mb">
      <kc-stat label="Collected" icon="card" [value]="money(collected())" hint="completed payment events"></kc-stat>
      <kc-stat label="Awaiting payment" icon="clock" [value]="money(pending())"></kc-stat>
      <kc-stat label="Failed payments" icon="alert" [value]="failed()" hint="requires investigation"></kc-stat>
      <kc-stat label="Refunded" icon="swap" [value]="money(refunded())"></kc-stat>
    </div>

    <div class="toolbar">
      <div class="tabs">
        @for (t of ['all', 'pending', 'failed', 'completed', 'refunded']; track t) {
          <button class="tab" [class.active]="tab() === t" (click)="tab.set(t)">{{t[0].toUpperCase() + t.slice(1)}}</button>
        }
      </div>
      <input class="input input-search" placeholder="Search payment, order, or buyer" [value]="q()" (input)="q.set($any($event.target).value)" />
    </div>

    <div class="card">
      <table class="tbl">
        <thead><tr><th>Payment</th><th>Order</th><th>Buyer</th><th>Method</th><th class="right">Amount</th><th>Status</th><th>Date</th><th class="right">Actions</th></tr></thead>
        <tbody>
          @for (p of rows(); track p.id) {
            <tr>
              <td class="cell-main">{{p.id}}</td><td class="cell-sub">{{p.order}}</td><td>{{p.buyer}}</td>
              <td class="cell-sub">{{p.method}}</td><td class="num">{{money(p.amount)}}</td>
              <td><kc-badge [value]="statusLabel(p)"></kc-badge></td><td class="cell-sub">{{dstr(p.date)}}</td>
              <td class="right"><div class="cell-actions">
                <button class="icon-btn" aria-label="Review payment" data-tip="Review payment" (click)="selected.set(p)"><kc-icon name="eye" [size]="14"></kc-icon></button>
                @if (p.status === 'completed' && !d.refundRequests()[p.id]) {
                  <button class="btn btn-sm" (click)="startRefund(p)">Request refund</button>
                }
                @if (d.refundRequests()[p.id]) {
                  <button class="btn btn-sm btn-primary" (click)="confirmRefund.set(p)">Confirm refund</button>
                }
              </div></td>
            </tr>
          } @empty {
            <tr><td colspan="8"><div class="empty">No payments match this view.</div></td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (selected(); as p) {
      <div class="drawer-back" (click)="selected.set(null)"></div>
      <div class="drawer">
        <div class="drawer-head"><div><b>{{p.id}}</b> <kc-badge [value]="statusLabel(p)"></kc-badge></div>
          <button class="icon-btn" aria-label="Close payment details" (click)="selected.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div>
        <div class="drawer-body">
          <div class="kv"><span class="k">Order reference</span>{{p.order}}</div>
          <div class="kv"><span class="k">Buyer</span>{{p.buyer}}</div>
          <div class="kv"><span class="k">Method</span>{{p.method}}</div>
          <div class="kv"><span class="k">Amount</span><b>{{money(p.amount)}}</b></div>
          <div class="kv"><span class="k">Recorded</span>{{dstr(p.date)}}</div>

          @if (d.refundRequests()[p.id]; as req) {
            <div class="sect">Refund request</div>
            <div class="ops-callout"><b>Awaiting confirmation · {{money(req.amount)}}</b><span>{{req.reason}}</span><small>{{dstr(req.requestedAt)}}</small></div>
            <div class="cell-actions" style="justify-content:flex-start;margin-top:12px">
              <button class="btn btn-primary" (click)="confirmRefund.set(p)">Record confirmed refund</button>
              <button class="btn" (click)="cancelRequest.set(p)">Cancel request</button>
            </div>
          } @else if (p.status === 'completed') {
            <div class="sect">Refund workflow</div>
            <p class="muted">Start a review when the buyer has a valid return or complaint. The payment remains completed until confirmation is recorded.</p>
            <button class="btn btn-danger" style="margin-top:12px" (click)="startRefund(p)">Request refund review</button>
          } @else if (p.status === 'failed' || p.status === 'pending') {
            <div class="sect">Investigation</div>
            <p class="muted">Review the related order and payment method before taking action. No refund action is available until a completed payment exists.</p>
          }
        </div>
      </div>
    }

    @if (request(); as p) {
      <div class="modal-back" (click)="request.set(null)"><div class="modal" (click)="$event.stopPropagation()">
        <h3>Request refund review</h3><p>Choose the amount the admin is proposing for {{p.buyer}}. This records a decision request only and does not move money.</p>
        <div class="form-row"><label>Refund amount <span class="req">*</span></label><input class="input" type="number" min="0.01" [max]="p.amount" step="0.01" [value]="refundAmount()" (input)="refundAmount.set(+$any($event.target).value)"/><small class="muted">Original payment: {{money(p.amount)}} · maximum refund: {{money(p.amount)}}</small></div>
        <div class="form-row"><label>Decision reason <span class="req">*</span></label><textarea class="input reason" rows="3" placeholder="Explain the return, complaint, or adjustment." [value]="refundReason()" (input)="refundReason.set($any($event.target).value)"></textarea></div>
        @if (!refundValid()) { <small class="reason-error">Enter an amount between $0.01 and the original payment, plus at least 5 characters.</small> }
        <div class="modal-actions"><button class="btn" (click)="request.set(null)">Cancel</button><button class="btn btn-primary" [disabled]="!refundValid()" (click)="submitRefund(p)">Request {{money(refundAmount())}}</button></div>
      </div></div>
    }
    @if (confirmRefund(); as p) {
      @if (d.refundRequests()[p.id]; as req) {
        <kc-confirm title="Record confirmed refund?" [message]="'Only continue after the provider or finance team confirms ' + money(req.amount) + ' was returned to ' + p.buyer + '.'"
          confirmLabel="Record refund" [requireReason]="true" (confirm)="d.refundPayment(p.id, req.amount, $event); confirmRefund.set(null); selected.set(null)" (cancel)="confirmRefund.set(null)"></kc-confirm>
      }
    }
    @if (cancelRequest(); as p) {
      <kc-confirm title="Cancel refund request?" [message]="'The refund review for ' + p.id + ' will be cleared. The payment will remain completed.'"
        confirmLabel="Cancel request" (confirm)="d.cancelRefundRequest(p.id); cancelRequest.set(null)" (cancel)="cancelRequest.set(null)"></kc-confirm>
    }
  } @else { <div class="skel" style="height:420px"></div> }`,
})
export class PaymentsComponent {
  d = inject(AdminService);
  tab = signal('all');
  q = signal('');
  selected = signal<Payment | null>(null);
  request = signal<Payment | null>(null);
  confirmRefund = signal<Payment | null>(null);
  cancelRequest = signal<Payment | null>(null);
  refundAmount = signal(0);
  refundReason = signal('');
  money = money; dstr = dstr;
  collected = computed(() => this.d.payments().filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0));
  pending = computed(() => this.d.payments().filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0));
  refunded = computed(() => this.d.payments().filter(p => p.status === 'refunded').reduce((s, p) => s + p.amount, 0));
  failed = computed(() => this.d.payments().filter(p => p.status === 'failed').length);
  rows = computed(() => {
    const query = this.q().trim().toLowerCase();
    return this.d.payments().filter(p =>
      (this.tab() === 'all' || p.status === this.tab()) &&
      (!query || [p.id, p.order, p.buyer, p.method].some(v => v.toLowerCase().includes(query)))
    );
  });
  statusLabel(p: Payment): string { return this.d.refundRequests()[p.id] ? 'refund requested' : p.status; }
  startRefund(p: Payment) { this.refundAmount.set(p.amount); this.refundReason.set(''); this.request.set(p); }
  refundValid = computed(() => {
    const p = this.request(); const amount = this.refundAmount();
    return !!p && amount > 0 && amount <= p.amount && this.refundReason().trim().length >= 5;
  });
  submitRefund(p: Payment) {
    if (!this.refundValid()) return;
    this.d.requestRefund(p.id, this.refundAmount(), this.refundReason().trim());
    this.request.set(null);
  }
}
