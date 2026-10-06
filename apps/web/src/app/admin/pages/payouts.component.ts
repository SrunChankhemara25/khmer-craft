import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../admin-data.service';
import {
  AdminApiService, PayoutAccountRow, PayoutBalances, PayoutBalanceRow, PayoutDetail, PayoutRecord, PayoutRules,
} from '../admin-api.service';
import { apiErrorMessage } from '../../core/auth/auth.service';
import { BadgeComponent } from '../ui/badge.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { IconComponent } from '../ui/icon.component';
import { StateComponent } from '../ui/state.component';
import { StatComponent } from '../ui/stat.component';
import { dstr, initials, money } from '../ui/format';

type Tab = 'due' | 'history' | 'accounts';
interface ConfirmRequest { title: string; msg: string; label: string; requireReason: boolean; fn: (reason: string) => void }
/** The pay drawer: either a store being paid now, or a pending payout being settled. */
interface PayTarget { storeId: string; storeName: string; amount: number; orders: number; payoutId?: string; payoutNumber?: string }

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const METHOD_LABEL: Record<string, string> = { ABA: 'ABA Bank', ACLEDA: 'ACLEDA Bank', WING: 'Wing Bank', OTHER_BANK: 'Bank' };
const MAX_RECEIPT_BYTES = 3.5 * 1024 * 1024;

/**
 * Seller payouts: who KhmerCraft owes, verifying where to send it, paying
 * with a receipt, and the commission / schedule rules — all live API.
 */
@Component({
  standalone: true,
  imports: [FormsModule, BadgeComponent, ConfirmComponent, IconComponent, StateComponent, StatComponent],
  template: `
  <div class="page-head">
    <div><h1 class="page-title">Seller Payouts</h1>
      <p class="page-sub">
        @if (data(); as b) {
          {{b.settings.commissionRate}}% commission · paid {{scheduleLabel(b.settings)}} · {{b.settings.holdDays}}-day hold after delivery · next run {{dstr(b.settings.nextPayoutDate)}}
        } @else { What KhmerCraft owes each seller, and paying it }
      </p></div>
    <div class="cell-actions">
      <button class="btn btn-sm" (click)="openRules()"><kc-icon name="sliders" [size]="13"></kc-icon> Payout rules</button>
      <button class="btn btn-sm" (click)="refresh()"><kc-icon name="refresh" [size]="13"></kc-icon> Refresh</button>
      @if (data(); as b) {
        <button class="btn btn-primary" [disabled]="!b.totals.dueStores || busy()" (click)="askRunDue()">
          Queue all due ({{b.totals.dueStores}})</button>
      }
    </div>
  </div>

  @if (loadError()) { <kc-state mode="error" [message]="loadError()" (retry)="refresh()"></kc-state> }
  @else if (data(); as b) {
    <div class="grid stats mb">
      <kc-stat label="Due to sellers now" icon="wallet" [value]="money(b.totals.dueNow)" [hint]="b.totals.dueStores + ' store' + (b.totals.dueStores === 1 ? '' : 's') + ' ready to pay'"></kc-stat>
      <kc-stat label="On hold" icon="clock" [value]="money(b.totals.onHold)" [hint]="'Inside the ' + b.settings.holdDays + '-day returns window'"></kc-stat>
      <kc-stat label="Accounts to verify" icon="shield" [value]="b.totals.accountsToVerify" [hint]="b.totals.pendingPayouts + ' payout' + (b.totals.pendingPayouts === 1 ? '' : 's') + ' waiting for a receipt'"></kc-stat>
      <kc-stat label="Paid to sellers" icon="check" [value]="money(paidAllTime())" [hint]="money(b.totals.owedBySellers) + ' COD commission owed to you'"></kc-stat>
    </div>
  } @else { <div class="skel mb" style="height:96px"></div> }

  <div class="toolbar">
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" [class.active]="tab() === 'due'" (click)="tab.set('due')">To pay</button>
      <button class="tab" role="tab" [class.active]="tab() === 'history'" (click)="tab.set('history'); loadHistory()">Payout history</button>
      <button class="tab" role="tab" [class.active]="tab() === 'accounts'" (click)="tab.set('accounts')">
        Payout accounts @if (data()?.totals?.accountsToVerify) { <span class="pill">{{data()!.totals.accountsToVerify}}</span> }</button>
    </div>
    @if (tab() === 'due') {
      <label class="check"><input type="checkbox" [checked]="onlyMoney()" (change)="onlyMoney.set(!onlyMoney())"/> Only stores with money to pay</label>
    } @else if (tab() === 'history') {
      <select class="input" [value]="historyStatus()" (change)="historyStatus.set($any($event.target).value); historyPage.set(1); loadHistory()" aria-label="Payout status">
        <option value="ALL">All payouts</option><option value="PENDING">Waiting for receipt</option>
        <option value="PAID">Paid</option><option value="CANCELLED">Cancelled</option>
      </select>
    } @else {
      <select class="input" [value]="accountFilter()" (change)="accountFilter.set($any($event.target).value)" aria-label="Account status">
        <option value="ALL">All accounts</option><option value="PENDING_VERIFICATION">Waiting for verification</option>
        <option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option>
      </select>
    }
  </div>

  @if (actionError()) {
    <div class="notice-row" role="alert"><kc-icon name="alert" [size]="14"></kc-icon> {{actionError()}}
      <button class="link" (click)="actionError.set('')">Dismiss</button></div>
  }

  <!-- ============ TO PAY ============ -->
  @if (tab() === 'due') {
    <div class="card">
      @if (loadError()) { <kc-state mode="error" compact message="Balances could not be loaded." (retry)="refresh()"></kc-state> }
      @else if (!data()) { <kc-state mode="loading" message="Working out seller balances…"></kc-state> }
      @else if (!dueRows().length) { <kc-state mode="empty" message="No seller has money waiting. Balances appear here once paid orders are delivered."></kc-state> }
      @else {
        <table class="tbl">
          <thead><tr><th>Store</th><th class="right">Ready to pay</th><th class="right">On hold</th><th>Payout account</th><th>Last paid</th><th class="right">Action</th></tr></thead>
          <tbody>
            @for (r of dueRows(); track r.storeId) {
              <tr>
                <td><div class="cell-flex"><span class="thumb">{{initials(r.storeName)}}</span>
                  <div><div class="cell-main">{{r.storeName}}</div><div class="cell-sub">{{r.readyOrders}} order{{r.readyOrders === 1 ? '' : 's'}} ready · {{money(r.commission)}} commission</div></div></div></td>
                <td class="num"><b [style.color]="r.available < 0 ? 'var(--red)' : null">{{money(r.available)}}</b>
                  @if (r.due) { <div><kc-badge value="due"></kc-badge></div> }</td>
                <td class="num cell-sub">{{money(r.onHold)}}</td>
                <td>
                  @if (r.account) {
                    <div>{{methodLabel(r.account.method, r.account.bankName)}} · {{r.account.accountNumber}}</div>
                    <kc-badge [value]="accountLabel(r.account.status)"></kc-badge>
                  } @else { <span class="cell-sub">Not added yet</span> }
                </td>
                <td class="cell-sub">{{r.lastPaidAt ? dstr(r.lastPaidAt) : 'Never'}}</td>
                <td class="right"><div class="cell-actions">
                  @if (r.pendingPayout) {
                    <button class="btn btn-sm btn-primary" (click)="openPayPending(r)">Upload receipt</button>
                  } @else if (r.canPay) {
                    <button class="btn btn-sm btn-primary" (click)="openPay(r)">Pay {{money(r.available)}}</button>
                  } @else if (r.account && r.account.status === 'PENDING_VERIFICATION') {
                    <button class="btn btn-sm" (click)="tab.set('accounts'); accountFilter.set('PENDING_VERIFICATION')">Verify account</button>
                  } @else {
                    <span class="cell-sub">{{r.blockedReason}}</span>
                  }
                </div></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  }

  <!-- ============ HISTORY ============ -->
  @if (tab() === 'history') {
    <div class="card">
      @if (historyLoading()) { <kc-state mode="loading" message="Loading payouts…"></kc-state> }
      @else if (!history().length) { <kc-state mode="empty" message="No payouts in this filter."></kc-state> }
      @else {
        <table class="tbl">
          <thead><tr><th>Payout</th><th>Store</th><th>Sent to</th><th class="right">Amount</th><th>Status</th><th>Date</th><th class="right">Actions</th></tr></thead>
          <tbody>
            @for (p of history(); track p.id) {
              <tr>
                <td class="cell-main mono">{{p.payoutNumber}}<div class="cell-sub">{{p.orderCount}} orders · {{p.commissionRate}}%</div></td>
                <td>{{p.storeName}}</td>
                <td class="cell-sub">{{methodLabel(p.account.method, p.account.bankName)}} · {{p.account.accountNumber}}</td>
                <td class="num">{{money(p.amount)}}</td>
                <td><kc-badge [value]="p.status === 'PENDING' ? 'pending' : p.status.toLowerCase()"></kc-badge>
                  @if (p.cancelReason) { <div class="cell-sub">{{p.cancelReason}}</div> }</td>
                <td class="cell-sub">{{dstr(p.paidAt || p.createdAt)}}</td>
                <td class="right"><div class="cell-actions">
                  <button class="icon-btn" aria-label="Details" data-tip="Details & receipt" (click)="openDetail(p.id)"><kc-icon name="eye" [size]="14"></kc-icon></button>
                  @if (p.status === 'PENDING') {
                    <button class="btn btn-sm btn-primary" (click)="openPayRecord(p)">Upload receipt</button>
                    <button class="btn btn-sm btn-danger" (click)="askCancel(p)">Cancel</button>
                  }
                </div></td>
              </tr>
            }
          </tbody>
        </table>
        <div class="pager">
          <span class="muted">{{historyTotal()}} payouts</span><span class="grow"></span>
          <button class="btn btn-sm" [disabled]="historyPage() === 1" (click)="historyPage.set(historyPage() - 1); loadHistory()">Previous</button>
          <span class="muted">Page {{historyPage()}} of {{historyPages()}}</span>
          <button class="btn btn-sm" [disabled]="historyPage() >= historyPages()" (click)="historyPage.set(historyPage() + 1); loadHistory()">Next</button>
        </div>
      }
    </div>
  }

  <!-- ============ ACCOUNTS ============ -->
  @if (tab() === 'accounts') {
    <div class="card">
      @if (accountsLoading()) { <kc-state mode="loading" message="Loading payout accounts…"></kc-state> }
      @else if (!accountRows().length) { <kc-state mode="empty" message="No payout accounts in this filter."></kc-state> }
      @else {
        <table class="tbl">
          <thead><tr><th>Store</th><th>Bank</th><th>Name on account</th><th>Account number</th><th>KHQR</th><th>Status</th><th class="right">Actions</th></tr></thead>
          <tbody>
            @for (a of accountRows(); track a.id) {
              <tr>
                <td class="cell-main">{{a.storeName}}<div class="cell-sub">Updated {{a.updatedAt ? dstr(a.updatedAt) : '—'}}</div></td>
                <td>{{methodLabel(a.method, a.bankName)}}@if (a.phone) { <div class="cell-sub">{{a.phone}}</div> }</td>
                <td>{{a.accountName}}</td>
                <td class="mono">{{a.accountNumber}}</td>
                <td>@if (a.khqrImage) { <button class="khqr-thumb" (click)="zoomImage.set(a.khqrImage)" aria-label="View KHQR"><img [src]="a.khqrImage" alt=""/></button> } @else { <span class="cell-sub">—</span> }</td>
                <td><kc-badge [value]="accountLabel(a.status)"></kc-badge>
                  @if (a.rejectionReason) { <div class="cell-sub" style="color:var(--red)">{{a.rejectionReason}}</div> }</td>
                <td class="right"><div class="cell-actions">
                  @if (a.status !== 'VERIFIED') { <button class="btn btn-sm btn-primary" [disabled]="busy()" (click)="verifyAccount(a)">Verify</button> }
                  @if (a.status !== 'REJECTED') { <button class="btn btn-sm btn-danger" [disabled]="busy()" (click)="askReject(a)">Reject</button> }
                </div></td>
              </tr>
            }
          </tbody>
        </table>
        <p class="hint">Check the name matches the seller's identity and the store owner before verifying. Sellers changing their account always returns it here for a new check.</p>
      }
    </div>
  }

  <!-- ============ PAY DRAWER ============ -->
  @if (payTarget(); as t) {
    <div class="drawer-back" (click)="closePay()"></div>
    <div class="drawer" role="dialog" [attr.aria-label]="'Pay ' + t.storeName">
      <div class="drawer-head"><b>Pay {{t.storeName}}</b>
        <button class="icon-btn" aria-label="Close" (click)="closePay()"><kc-icon name="x" [size]="14"></kc-icon></button></div>
      <div class="drawer-body">
        <div class="amount-box">
          <span class="cell-sub">Send exactly</span>
          <strong>{{money(t.amount)}}</strong>
          <span class="cell-sub">{{t.orders}} order{{t.orders === 1 ? '' : 's'}} · after {{data()?.settings?.commissionRate}}% commission @if (t.payoutNumber) { · {{t.payoutNumber}} }</span>
        </div>

        @if (accountFor(t.storeId); as a) {
          <div class="sect">1. Transfer to this account</div>
          <div class="kv"><span class="k">Bank</span>{{methodLabel(a.method, a.bankName)}}</div>
          <div class="kv"><span class="k">Name</span>{{a.accountName}}</div>
          <div class="kv"><span class="k">Account number</span>
            <span class="mono">{{a.accountNumber}}</span>
            <button class="link" style="margin-left:8px" (click)="copy(a.accountNumber)">{{copied() ? 'Copied' : 'Copy'}}</button></div>
          @if (a.khqrImage) {
            <p class="cell-sub" style="margin:8px 0 4px">Or scan the seller's KHQR with your banking app:</p>
            <img class="khqr-big" [src]="a.khqrImage" alt="Seller KHQR"/>
          }
        } @else { <kc-state mode="loading" compact message="Loading account…"></kc-state> }

        <div class="sect">2. Upload the transfer receipt</div>
        <div class="upload-row">
          @if (receipt()) {
            @if (receipt()!.startsWith('data:application/pdf')) { <span class="file-chip"><kc-icon name="receipt" [size]="13"></kc-icon> PDF attached</span> }
            @else { <img class="receipt-prev" [src]="receipt()!" alt="Receipt"/> }
            <button class="btn btn-sm" (click)="receipt.set(null)">Remove</button>
          }
          <label class="btn btn-sm upload"><kc-icon name="image" [size]="13"></kc-icon> {{receipt() ? 'Replace' : 'Choose screenshot or PDF'}}
            <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" (change)="onReceipt($event)"/></label>
        </div>
        <label class="field"><span>Bank reference (optional)</span>
          <input class="input" maxlength="120" [(ngModel)]="reference" placeholder="e.g. ABA transaction ID"/></label>
        <label class="field"><span>Note to the seller (optional)</span>
          <input class="input" maxlength="500" [(ngModel)]="note"/></label>

        @if (payError()) { <div class="notice-row" role="alert" style="margin-top:12px"><kc-icon name="alert" [size]="14"></kc-icon> {{payError()}}</div> }
        <button class="btn btn-primary wide" [disabled]="!receipt() || busy()" (click)="confirmPay(t)">
          {{busy() ? 'Saving…' : 'I have sent ' + money(t.amount) + ' — mark as paid'}}</button>
        <p class="cell-sub" style="margin-top:8px">The seller sees this payout and the receipt immediately. These orders can't be paid again.</p>
      </div>
    </div>
  }

  <!-- ============ DETAIL DRAWER ============ -->
  @if (detail(); as p) {
    <div class="drawer-back" (click)="detail.set(null)"></div>
    <div class="drawer" role="dialog" [attr.aria-label]="p.payoutNumber">
      <div class="drawer-head"><div><b class="mono">{{p.payoutNumber}}</b> <kc-badge [value]="p.status === 'PENDING' ? 'pending' : p.status.toLowerCase()"></kc-badge></div>
        <button class="icon-btn" aria-label="Close" (click)="detail.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div>
      <div class="drawer-body">
        <div class="kv"><span class="k">Store</span>{{p.storeName}}</div>
        <div class="kv"><span class="k">Sales</span>{{money(p.grossSales)}}</div>
        <div class="kv"><span class="k">Commission ({{p.commissionRate}}%)</span>-{{money(p.commissionTotal)}}</div>
        <div class="kv"><span class="k">Paid to seller</span><b>{{money(p.amount)}}</b></div>
        <div class="kv"><span class="k">Sent to</span>{{methodLabel(p.account.method, p.account.bankName)}} · {{p.account.accountName}} · {{p.account.accountNumber}}</div>
        @if (p.reference) { <div class="kv"><span class="k">Reference</span><span class="mono">{{p.reference}}</span></div> }
        @if (p.paidAt) { <div class="kv"><span class="k">Paid</span>{{dstr(p.paidAt)}}</div> }
        @if (p.note) { <div class="kv"><span class="k">Note</span>{{p.note}}</div> }
        @if (p.proofUrl) {
          <div class="sect">Receipt</div>
          @if (p.proofUrl.startsWith('data:application/pdf')) { <a class="btn" [href]="p.proofUrl" [download]="p.payoutNumber + '.pdf'">Download PDF receipt</a> }
          @else { <img [src]="p.proofUrl" alt="Transfer receipt" style="width:100%;border-radius:10px;border:1px solid var(--line)"/> }
        }
        <div class="sect">Orders in this payout</div>
        <table class="tbl mini">
          <thead><tr><th>Order</th><th>Payment</th><th class="right">Sale</th><th class="right">Fee</th><th class="right">Net</th></tr></thead>
          <tbody>
            @for (l of p.lines; track l.orderId) {
              <tr><td class="mono">{{l.orderNumber}}</td><td class="cell-sub">{{l.collectedBy === 'SELLER' ? 'COD' : 'Online'}}</td>
                <td class="num">{{money(l.gross - l.refunded)}}</td><td class="num">-{{money(l.commission)}}</td><td class="num">{{money(l.net)}}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  }

  <!-- ============ RULES DRAWER ============ -->
  @if (rules(); as r) {
    <div class="drawer-back" (click)="rules.set(null)"></div>
    <div class="drawer" role="dialog" aria-label="Payout rules">
      <div class="drawer-head"><b>Payout rules</b>
        <button class="icon-btn" aria-label="Close" (click)="rules.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div>
      <div class="drawer-body">
        <label class="field"><span>Commission on product sales (%)</span>
          <input class="input" type="number" min="0" max="50" step="0.5" [(ngModel)]="r.commissionRate"/></label>
        <p class="cell-sub">Applies to payouts created from now on. Past payouts keep the rate they were paid at.</p>
        <label class="field"><span>How often sellers are paid</span>
          <select class="input" [(ngModel)]="r.payoutSchedule">
            <option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Every two weeks</option><option value="MONTHLY">Monthly</option>
          </select></label>
        <label class="field"><span>Payout day</span>
          <select class="input" [(ngModel)]="r.payoutWeekday">
            @for (d of weekdays; track $index) { <option [ngValue]="$index">{{d}}</option> }
          </select></label>
        <label class="field"><span>Hold after delivery (days)</span>
          <input class="input" type="number" min="0" max="60" [(ngModel)]="r.holdDays"/></label>
        <p class="cell-sub">Gives buyers time to report a problem before the seller is paid.</p>
        <label class="field"><span>Minimum payout ($)</span>
          <input class="input" type="number" min="0" [(ngModel)]="r.minimumPayout"/></label>
        @if (rulesError()) { <div class="notice-row" role="alert" style="margin-top:12px">{{rulesError()}}</div> }
        <button class="btn btn-primary wide" [disabled]="busy()" (click)="saveRules(r)">{{busy() ? 'Saving…' : 'Save rules'}}</button>
      </div>
    </div>
  }

  @if (zoomImage(); as img) {
    <div class="drawer-back" (click)="zoomImage.set(null)"></div>
    <img class="zoom" [src]="img" alt="KHQR" (click)="zoomImage.set(null)"/>
  }

  @if (confirmReq(); as c) {
    <kc-confirm [title]="c.title" [message]="c.msg" [requireReason]="c.requireReason"
      [confirmLabel]="c.label" (confirm)="runConfirm($event)" (cancel)="confirmReq.set(null)"></kc-confirm>
  }`,
  styles: [`
    .pill{display:inline-block;margin-left:4px;padding:0 6px;border-radius:99px;background:var(--accent);color:#fff;font-size:10.5px;font-weight:650}
    .check{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--muted);cursor:pointer}
    .mono{font-family:ui-monospace,Consolas,monospace;font-size:12px}
    .pager{display:flex;align-items:center;gap:12px;padding:12px 16px;border-top:1px solid var(--line)}
    .pager .grow{flex:1}
    .hint{margin:0;padding:10px 16px;border-top:1px solid var(--line);font-size:11.5px;color:var(--muted)}
    .notice-row{display:flex;align-items:center;gap:8px;margin:0 0 12px;padding:9px 14px;border-radius:10px;background:var(--red-050);color:var(--red);font-size:12px;font-weight:600}
    .notice-row .link{margin-left:auto}
    .khqr-thumb{border:1px solid var(--line);border-radius:6px;padding:0;background:#fff;cursor:zoom-in;width:40px;height:40px;overflow:hidden}
    .khqr-thumb img{width:100%;height:100%;object-fit:cover}
    .khqr-big{width:200px;max-width:100%;border:1px solid var(--line);border-radius:10px}
    .zoom{position:fixed;inset:0;margin:auto;max-width:min(420px,90vw);max-height:90vh;z-index:60;border-radius:12px;background:#fff;cursor:zoom-out}
    .amount-box{display:flex;flex-direction:column;gap:2px;padding:16px;border-radius:12px;background:var(--accent-050);text-align:center}
    .amount-box strong{font-size:28px;letter-spacing:-.02em;color:var(--accent)}
    .upload-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}
    .upload{position:relative;overflow:hidden;cursor:pointer}
    .upload input{position:absolute;inset:0;opacity:0;cursor:pointer}
    .receipt-prev{width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--line)}
    .file-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:99px;background:var(--gray);font-size:12px}
    .field{display:flex;flex-direction:column;gap:5px;margin-top:12px}
    .field>span{font-size:12px;font-weight:600;color:var(--muted)}
    .field .input{width:100%}
    .wide{width:100%;justify-content:center;margin-top:16px;padding:10px}
    .tbl.mini{min-width:0}
    .tbl.mini td,.tbl.mini th{padding:7px 8px}
  `],
})
export class PayoutsComponent {
  private readonly api = inject(AdminApiService);
  private readonly d = inject(AdminService);

  money = money; dstr = dstr; initials = initials; weekdays = WEEKDAYS;

  tab = signal<Tab>('due');
  data = signal<PayoutBalances | null>(null);
  loadError = signal('');
  actionError = signal('');
  busy = signal(false);
  onlyMoney = signal(true);

  accounts = signal<PayoutAccountRow[]>([]);
  accountsLoading = signal(true);
  accountFilter = signal('ALL');

  history = signal<PayoutRecord[]>([]);
  historyLoading = signal(false);
  historyStatus = signal('ALL');
  historyPage = signal(1);
  historyPages = signal(1);
  historyTotal = signal(0);
  paidAllTime = signal(0);

  payTarget = signal<PayTarget | null>(null);
  receipt = signal<string | null>(null);
  reference = '';
  note = '';
  payError = signal('');
  copied = signal(false);

  detail = signal<PayoutDetail | null>(null);
  rules = signal<PayoutRules | null>(null);
  rulesError = signal('');
  zoomImage = signal<string | null>(null);
  confirmReq = signal<ConfirmRequest | null>(null);

  dueRows = computed(() => (this.data()?.stores ?? []).filter((r) => !this.onlyMoney() || r.available !== 0 || r.onHold !== 0 || !!r.pendingPayout));
  accountRows = computed(() => this.accounts().filter((a) => this.accountFilter() === 'ALL' || a.status === this.accountFilter()));

  constructor() { this.refresh(); }

  refresh() {
    this.loadBalances();
    this.loadAccounts();
    this.loadHistory();
  }

  loadBalances() {
    this.loadError.set('');
    this.api.payoutBalances().subscribe({
      next: (b) => this.data.set(b),
      error: (e) => this.loadError.set(e?.status === 401 || e?.status === 403
        ? 'Payouts need an ADMIN session. Sign in at /admin/login.'
        : apiErrorMessage(e, 'Could not load seller balances.')),
    });
  }

  loadAccounts() {
    this.accountsLoading.set(true);
    this.api.payoutAccounts().subscribe({
      next: (list) => { this.accounts.set(list); this.accountsLoading.set(false); },
      error: () => { this.accounts.set([]); this.accountsLoading.set(false); },
    });
  }

  loadHistory() {
    this.historyLoading.set(true);
    this.api.payouts({ status: this.historyStatus(), page: this.historyPage() }).subscribe({
      next: (res) => {
        this.history.set(res.payouts);
        this.historyPages.set(res.pagination.totalPages);
        this.historyTotal.set(res.pagination.total);
        this.paidAllTime.set(res.paidAllTime);
        this.historyLoading.set(false);
      },
      error: () => { this.history.set([]); this.historyLoading.set(false); },
    });
  }

  accountFor = (storeId: string) => this.accounts().find((a) => a.storeId === storeId) ?? null;
  methodLabel = (method: string, bankName?: string | null) => (method === 'OTHER_BANK' && bankName) ? bankName : METHOD_LABEL[method] ?? method;
  accountLabel = (status: string) => ({ VERIFIED: 'verified', PENDING_VERIFICATION: 'pending', REJECTED: 'rejected' } as Record<string, string>)[status] ?? status;
  scheduleLabel(s: PayoutRules) {
    const day = WEEKDAYS[s.payoutWeekday];
    return s.payoutSchedule === 'MONTHLY' ? `first ${day} monthly` : s.payoutSchedule === 'BIWEEKLY' ? `every other ${day}` : `every ${day}`;
  }

  // ------------------------------------------------------------- paying
  openPay(r: PayoutBalanceRow) {
    this.resetPayForm();
    this.payTarget.set({ storeId: r.storeId, storeName: r.storeName, amount: r.available, orders: r.readyOrders });
  }

  openPayPending(r: PayoutBalanceRow) {
    const p = r.pendingPayout!;
    this.resetPayForm();
    this.payTarget.set({ storeId: r.storeId, storeName: r.storeName, amount: p.amount, orders: 0, payoutId: p.id, payoutNumber: p.payoutNumber });
  }

  openPayRecord(p: PayoutRecord) {
    this.resetPayForm();
    this.payTarget.set({ storeId: p.storeId, storeName: p.storeName, amount: p.amount, orders: p.orderCount, payoutId: p.id, payoutNumber: p.payoutNumber });
  }

  private resetPayForm() { this.receipt.set(null); this.reference = ''; this.note = ''; this.payError.set(''); this.copied.set(false); }
  closePay() { if (!this.busy()) this.payTarget.set(null); }

  onReceipt(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > MAX_RECEIPT_BYTES) { this.payError.set('That file is larger than 3.5 MB. Take a screenshot instead.'); return; }
    const reader = new FileReader();
    reader.onload = () => { this.receipt.set(String(reader.result)); this.payError.set(''); };
    reader.onerror = () => this.payError.set('Could not read that file.');
    reader.readAsDataURL(file);
  }

  copy(text: string) {
    navigator.clipboard?.writeText(text.replace(/\s/g, '')).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    }).catch(() => undefined);
  }

  confirmPay(t: PayTarget) {
    const proofUrl = this.receipt();
    if (!proofUrl) return;
    const paid = { proofUrl, reference: this.reference.trim() || undefined, note: this.note.trim() || undefined };
    const req = t.payoutId ? this.api.markPayoutPaid(t.payoutId, paid) : this.api.payStore(t.storeId, paid);
    this.busy.set(true); this.payError.set('');
    req.subscribe({
      next: (p) => {
        this.busy.set(false);
        this.payTarget.set(null);
        this.d.log(`Paid ${money(p.amount)} to ${p.storeName} (${p.payoutNumber})`, 'completed', { target: p.id });
        this.d.toast(`Payout ${p.payoutNumber} recorded`);
        this.refresh();
      },
      error: (e) => { this.busy.set(false); this.payError.set(apiErrorMessage(e, 'Could not record this payout.')); },
    });
  }

  askRunDue() {
    const b = this.data();
    if (!b) return;
    this.confirmReq.set({
      title: `Queue ${b.totals.dueStores} payouts (${money(b.totals.dueNow)})?`, label: 'Queue payouts', requireReason: false,
      msg: 'Locks each due store\'s balance into a payout waiting for a receipt. Send each transfer, then upload its receipt from Payout history.',
      fn: () => {
        this.busy.set(true);
        this.api.runDuePayouts().subscribe({
          next: (res) => {
            this.busy.set(false);
            this.d.log(`Queued ${res.created.length} seller payouts`, 'pending');
            this.d.toast(`${res.created.length} payouts queued${res.skipped.length ? `, ${res.skipped.length} skipped` : ''}`);
            this.tab.set('history'); this.historyStatus.set('PENDING'); this.historyPage.set(1);
            this.refresh();
          },
          error: (e) => { this.busy.set(false); this.actionError.set(apiErrorMessage(e, 'Could not queue payouts.')); },
        });
      },
    });
  }

  askCancel(p: PayoutRecord) {
    this.confirmReq.set({
      title: `Cancel ${p.payoutNumber}?`, label: 'Cancel payout', requireReason: true,
      msg: `Only cancel if you did not send the money. Its ${p.orderCount} orders go back into ${p.storeName}'s balance.`,
      fn: (reason) => this.run(this.api.cancelPayout(p.id, reason), `Cancelled payout ${p.payoutNumber}`, 'Payout cancelled', reason),
    });
  }

  openDetail(id: string) {
    this.api.payoutDetail(id).subscribe({
      next: (p) => this.detail.set(p),
      error: (e) => this.actionError.set(apiErrorMessage(e, 'Could not open that payout.')),
    });
  }

  // ------------------------------------------------------------- accounts
  verifyAccount(a: PayoutAccountRow) {
    this.run(this.api.reviewPayoutAccount(a.id, 'VERIFIED'), `Verified payout account of ${a.storeName}`, 'Account verified');
  }

  askReject(a: PayoutAccountRow) {
    this.confirmReq.set({
      title: `Reject ${a.storeName}'s payout account?`, label: 'Reject', requireReason: true,
      msg: 'The seller sees your reason and can correct the details. Nothing is paid to this store until it is verified.',
      fn: (reason) => this.run(this.api.reviewPayoutAccount(a.id, 'REJECTED', reason), `Rejected payout account of ${a.storeName}`, 'Account rejected', reason),
    });
  }

  // ------------------------------------------------------------- rules
  openRules() {
    const s = this.data()?.settings;
    this.rulesError.set('');
    if (s) this.rules.set({ ...s });
  }

  saveRules(r: PayoutRules) {
    this.busy.set(true); this.rulesError.set('');
    this.api.savePayoutRules({
      commissionRate: Number(r.commissionRate), payoutSchedule: r.payoutSchedule, payoutWeekday: Number(r.payoutWeekday),
      holdDays: Number(r.holdDays), minimumPayout: Number(r.minimumPayout),
    }).subscribe({
      next: () => {
        this.busy.set(false); this.rules.set(null);
        this.d.log(`Updated payout rules: ${r.commissionRate}% commission, ${r.payoutSchedule.toLowerCase()}, ${r.holdDays}-day hold`, 'active');
        this.d.toast('Payout rules saved');
        this.loadBalances();
      },
      error: (e) => { this.busy.set(false); this.rulesError.set(apiErrorMessage(e, 'Could not save the rules.')); },
    });
  }

  private run(req: import('rxjs').Observable<unknown>, logMsg: string, toast: string, reason?: string) {
    this.busy.set(true); this.actionError.set('');
    req.subscribe({
      next: () => { this.busy.set(false); this.d.log(logMsg, 'active', { reason }); this.d.toast(toast); this.refresh(); },
      error: (e: unknown) => { this.busy.set(false); this.actionError.set(apiErrorMessage(e, 'The server refused that change.')); },
    });
  }

  runConfirm(reason: string) { const c = this.confirmReq(); if (c) c.fn(reason); this.confirmReq.set(null); }
}
