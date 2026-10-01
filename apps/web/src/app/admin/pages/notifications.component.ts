import { Component, computed, inject, signal } from '@angular/core';
import { AdminService } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { IconComponent } from '../ui/icon.component';
import { dstr } from '../ui/format';

/**
 * Admin outreach. A notification can be tied to an open report or complaint
 * and resolve it in the same step — so sending a message can actually close
 * the problem it addresses, not just announce things.
 */
@Component({
  standalone: true, imports: [BadgeComponent, IconComponent],
  template: `
  <div class="page-head"><div><span class="eyebrow">Engagement · Outreach</span><h1 class="page-title">Notifications</h1>
    <p class="page-sub">Send announcements, warnings or resolutions to buyers and sellers — optionally closing the ticket they address</p></div>
    <button class="btn btn-primary" (click)="openModal()"><kc-icon name="send" [size]="14"></kc-icon> Create notification</button></div>

  <div class="notification-workspace">
    @if (open) {
      <section class="card card-pad compose-panel">
      <div class="section-heading"><div><span class="eyebrow">Compose</span><h2 class="card-title">New notification</h2></div><button class="icon-btn" aria-label="Close composer" (click)="open = false"><kc-icon name="x" [size]="14"></kc-icon></button></div>
      <p class="muted">Delivered in-app immediately to the chosen audience.</p>
      <div class="form-row"><label>Title <span class="req">*</span></label>
        <input class="input" [value]="title()" (input)="title.set($any($event.target).value)" placeholder="e.g. Refund issued for ORD-5006"/></div>
      <div class="form-row"><label>Message <span class="req">*</span></label>
        <textarea class="input" rows="4" [value]="body()" (input)="body.set($any($event.target).value)" placeholder="What should the recipient know or do?"></textarea></div>
      <div class="form-row two"><label>Audience</label>
        <select class="input" [value]="aud()" (change)="aud.set($any($event.target).value)">
          <option>Everyone</option><option>Buyers</option><option>Sellers</option></select>
        <label>Type</label>
        <select class="input" [value]="kind()" (change)="kind.set($any($event.target).value)">
          <option value="announcement">Announcement</option>
          <option value="warning">Warning</option>
          <option value="resolution">Resolution</option></select></div>
      <div class="form-row"><label>Linked ticket <em>(optional)</em></label>
        <select class="input" [value]="related()" (change)="related.set($any($event.target).value)">
          <option value="">None</option>
          @for (t of tickets(); track t.id) { <option [value]="t.id">{{t.label}}</option> }</select></div>
      @if (related()) {
        <label class="check-row"><input type="checkbox" [checked]="resolveLinked()" (change)="resolveLinked.set($any($event.target).checked)"/>
          Also mark this ticket as resolved when sending</label>
      }
      <div class="modal-actions">
        <button class="btn" (click)="open = false">Cancel</button>
        <button class="btn btn-primary" [disabled]="!title().trim() || !body().trim()" (click)="send()">Send</button>
      </div>
      </section>
    }
    <section class="card notice-feed">
      <div class="card-head"><div><h2 class="card-title">Sent notifications</h2><span class="cell-sub">{{d.notices().length}} messages in this workspace</span></div><span class="muted">Newest first</span></div>
      <div class="notice-list">
        @for (n of d.notices(); track n.id) {
          <div class="notice-item">
            <span class="kind-dot" [class.warn]="n.kind === 'warning'" [class.good]="n.kind === 'resolution'"></span>
            <div class="notice-copy"><div class="cell-main">{{n.title}}</div><div class="cell-sub">{{n.body}}</div>@if (n.related) { <div class="cell-sub notice-related">Linked ticket: {{n.related}}</div> }</div>
            <div class="notice-meta"><kc-badge [value]="n.kind ?? 'announcement'"></kc-badge><kc-badge [value]="n.audience === 'Sellers' ? 'pending' : n.audience === 'Buyers' ? 'active' : 'approved'"></kc-badge><span class="cell-sub">{{dstr(n.date)}}</span></div>
          </div>
        } @empty { <div class="empty">No notifications sent yet. Create the first one from the composer.</div> }
      </div>
    </section>
  </div>`,
  styles: [`
    .req{color:var(--red)}
    .notification-workspace{display:grid;grid-template-columns:minmax(300px,.8fr) minmax(0,1.5fr);gap:14px;align-items:start}
    .notification-workspace:not(:has(.compose-panel)){grid-template-columns:1fr}
    .section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .section-heading .card-title{margin-top:2px}
    .compose-panel>.muted{margin:5px 0 18px;font-size:12px}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .two label{display:grid;gap:5px;font-size:12px;font-weight:550}
    .check-row{display:flex;gap:8px;align-items:center;font-size:12.5px;font-weight:550;margin:-4px 0 12px;cursor:pointer}
    .check-row input{accent-color:var(--accent)}
    .notice-list{padding:0 18px}
    .notice-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;gap:10px;padding:15px 0;border-bottom:1px solid var(--line)}
    .notice-item:last-child{border-bottom:0}
    .notice-copy{min-width:0}
    .notice-related{margin-top:4px;color:var(--accent)}
    .notice-meta{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
    .kind-dot{width:9px;height:9px;border-radius:50%;background:var(--muted);margin-top:6px;flex-shrink:0}
    .kind-dot.warn{background:var(--amber)}
    .kind-dot.good{background:var(--green)}
    @media (max-width:900px){.notification-workspace{grid-template-columns:1fr}.notice-meta{justify-content:flex-start;grid-column:2}}
    @media (max-width:560px){.two{grid-template-columns:1fr}.notice-item{grid-template-columns:auto minmax(0,1fr)}.notice-meta{grid-column:2}}
  `],
})
export class NotificationsComponent {
  d = inject(AdminService);
  dstr = dstr;
  open = false;
  title = signal(''); body = signal(''); aud = signal('Everyone');
  kind = signal<'announcement' | 'warning' | 'resolution'>('announcement');
  related = signal('');
  resolveLinked = signal(true);

  tickets = computed(() => [
    ...this.d.reports().filter(r => r.status === 'open').map(r => ({ id: r.id, label: `Report ${r.id} — ${r.target}` })),
    ...this.d.complaints().filter(c => c.status !== 'resolved').map(c => ({ id: c.id, label: `Complaint ${c.id} — ${c.subject}` })),
  ]);

  openModal() { this.open = true; }

  send() {
    if (!this.title().trim() || !this.body().trim()) return;
    const ticket = this.related();
    this.d.sendNotice({ title: this.title().trim(), body: this.body().trim(), audience: this.aud(), kind: this.kind(), related: ticket || undefined });
    if (ticket && this.resolveLinked()) {
      if (ticket.startsWith('RP-')) this.d.setReportStatus(ticket, 'resolved');
      if (ticket.startsWith('CP-')) this.d.setComplaintStatus(ticket, 'resolved');
    }
    this.open = false; this.title.set(''); this.body.set(''); this.related.set(''); this.kind.set('announcement');
  }
}
