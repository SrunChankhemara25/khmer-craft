import { Component, computed, inject, signal } from '@angular/core';
import { AdminService, Review } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { dstr } from '../ui/format';

interface ConfirmRequest { title: string; msg: string; label: string; fn: (reason: string) => void }

/**
 * Review moderation. Buyers only ever see non-banned reviews on product
 * pages, so banning here removes a review from the storefront everywhere.
 * Demo dataset until a server-side moderation endpoint exists.
 */
@Component({
  standalone: true, imports: [BadgeComponent, ConfirmComponent, MenuComponent],
  template: `
  <div class="page-head"><div><h1 class="page-title">Reviews</h1>
    <p class="page-sub">What buyers see on product pages — ban, unban or delete reviews, with a recorded reason</p></div>
    <span class="muted">{{rows().length}} matching · page {{page()}} of {{pages()}}</span></div>

  <div class="toolbar">
    <div class="tabs">
      @for (t of ['visible', 'hidden', 'all']; track t) {
        <button class="tab" [class.active]="tab() === t" (click)="setTab(t)">{{t === 'visible' ? 'Live on site' : t === 'hidden' ? 'Banned' : 'All'}}</button>
      }
    </div>
    <input class="input input-search" placeholder="Search product or buyer" [value]="q()" (input)="setSearch($any($event.target).value)"/>
  </div>

  <div class="card"><table class="tbl">
    <thead><tr><th>Product</th><th>Buyer</th><th>Rating</th><th>Comment</th><th>Date</th><th>Status</th><th class="right">Actions</th></tr></thead>
    <tbody>
      @for (r of view(); track r.id) {
        <tr>
          <td class="cell-main">{{r.product}}</td><td>{{r.buyer}}</td>
          <td><span class="stars">{{'★'.repeat(r.rating)}}</span><span class="stars" style="opacity:.25">{{'★'.repeat(5 - r.rating)}}</span></td>
          <td class="cell-sub" style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{r.comment}}</td>
          <td class="cell-sub">{{dstr(r.date)}}</td>
          <td><kc-badge [value]="r.status === 'visible' ? 'visible' : 'banned'"></kc-badge></td>
          <td class="right"><div class="cell-actions">
            @if (r.status === 'visible') {
              <button class="btn btn-sm btn-danger" (click)="askBan(r)">Ban</button>
            } @else {
              <button class="btn btn-sm" (click)="unban(r)">Unban</button>
            }
            <kc-menu [items]="[{label: 'Delete permanently', icon: 'trash', danger: true, action: 'delete'}]" (pick)="askDelete(r)"></kc-menu>
          </div></td>
        </tr>
      } @empty { <tr><td colspan="7"><div class="empty">No reviews in this view.</div></td></tr> }
    </tbody>
  </table>
  @if (pages() > 1) {
    <div class="pager">
      <button class="btn btn-sm" [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
      <span class="muted">Page {{page()}} of {{pages()}}</span>
      <button class="btn btn-sm" [disabled]="page() >= pages()" (click)="page.set(page() + 1)">Next</button>
    </div>
  }
  </div>

  @if (confirmReq(); as c) {
    <kc-confirm [title]="c.title" [message]="c.msg" [requireReason]="true"
      [confirmLabel]="c.label" (confirm)="runConfirm($event)" (cancel)="confirmReq.set(null)"></kc-confirm>
  }`,
  styles: [`
    .pager{display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:12px 16px;border-top:1px solid var(--line)}
    .stars{color:var(--amber);letter-spacing:2px;font-size:12px}
  `],
})
export class ReviewsComponent {
  d = inject(AdminService);
  dstr = dstr;
  tab = signal<'visible' | 'hidden' | 'all'>('visible');
  q = signal('');
  page = signal(1);
  private readonly pageSize = 8;
  confirmReq = signal<ConfirmRequest | null>(null);
  private pending = signal<Review | null>(null);

  rows = computed(() => this.d.reviews().filter(r =>
    (this.tab() === 'all' || r.status === this.tab()) &&
    (!this.q() || [r.product, r.buyer].join(' ').toLowerCase().includes(this.q().toLowerCase()))));
  pages = computed(() => Math.max(1, Math.ceil(this.rows().length / this.pageSize)));
  view = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.rows().slice(start, start + this.pageSize);
  });
setTab(t: string) {
  this.tab.set(t as 'visible' | 'hidden' | 'all');
}
  setSearch(v: string) { this.q.set(v); this.page.set(1); }

  askBan(r: Review) {
    this.pending.set(r);
    this.confirmReq.set({
      title: `Ban this review?`, label: 'Ban review',
      msg: `“${r.comment.slice(0, 80)}…” by ${r.buyer} will be hidden from every buyer-facing page. It stays recoverable here via Unban.`,
      fn: (reason) => { this.d.setReviewStatus(r.id, 'hidden'); this.d.log(`Banned review on ${r.product}`, 'hidden', { target: r.id, reason }); this.d.toast('Review banned'); },
    });
  }
  unban(r: Review) {
    this.d.setReviewStatus(r.id, 'visible');
    this.d.log(`Unbanned review on ${r.product}`, 'active', { target: r.id });
    this.d.toast('Review is live again');
  }
  askDelete(r: Review) {
    this.pending.set(r);
    this.confirmReq.set({
      title: 'Delete this review permanently?', label: 'Delete',
      msg: `The review by ${r.buyer} on ${r.product} is removed for good — unlike a ban it cannot be restored.`,
      fn: (reason) => { this.d.deleteReview(r.id); this.d.log(`Deleted review on ${r.product}`, 'rejected', { target: r.id, reason }); },
    });
  }
  runConfirm(reason: string) { const c = this.confirmReq(); if (c) c.fn(reason); this.confirmReq.set(null); this.pending.set(null); }
}
