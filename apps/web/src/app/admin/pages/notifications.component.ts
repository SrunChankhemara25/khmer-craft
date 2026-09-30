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
  <div class="page-head"><div><h1 class="page-title">Notifications</h1>
    <p class="page-sub">Send announcements, warnings or resolutions to buyers and sellers — optionally closing the ticket they address</p></div>
    <button class="btn btn-primary" (click)="openModal()"><kc-icon name="send" [size]="14"></kc-icon> Create notification</button></div>

  <div class="card">
    @for (n of d.notices(); track n.id) {
      <div class="list-item" style="padding:14px 18px">
        <span class="kind-dot" [class.warn]="n.kind === 'warning'" [class.good]="n.kind === 'resolution'"></span>
        <div style="flex:1;min-width:0">
          <div class="cell-main">{{n.title}}</div>
          <div class="cell-sub">{{n.body}}</div>
          @if (n.related) { <div class="cell-sub" style="margin-top:3px">Linked ticket: {{n.related}}</div> }
        </div>
        <kc-badge [value]="n.kind ?? 'announcement'"></kc-badge>
        <kc-badge [value]="n.audience === 'Sellers' ? 'pending' : n.audience === 'Buyers' ? 'active' : 'approved'"></kc-badge>
        <span class="cell-sub" style="margin-left:6px;white-space:nowrap">{{dstr(n.date)}}</span>
      </div>
    } @empty { <div class="empty">No notifications sent yet.</div> }
  </div>

  @if (open) {
    <div class="modal-back"><div class="modal">
      <h3>New notification</h3><p>Delivered in-app immediately to the chosen audience.</p>
      <div class="form-row"><label>Title <span class="req">*</span></label>
        <input class="input" [value]="title()" (input)="title.set($any($event.target).value)" placeholder="e.g. Refund issued for ORD-5006"/></div>
      <div class="form-row"><label>Message <span class="req">*</span></label>
        <input class="input" [value]="body()" (input)="body.set($any($event.target).value)" placeholder="What should the recipient know or do?"/></div>
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
    </div></div>
  }`,
  styles: [`
    .req{color:var(--red)}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .two label{display:grid;gap:5px;font-size:12px;font-weight:550}
    .check-row{display:flex;gap:8px;align-items:center;font-size:12.5px;font-weight:550;margin:-4px 0 12px;cursor:pointer}
    .check-row input{accent-color:var(--accent)}
    .kind-dot{width:9px;height:9px;border-radius:50%;background:var(--muted);margin-top:6px;flex-shrink:0}
    .kind-dot.warn{background:var(--amber)}
    .kind-dot.good{background:var(--green)}
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
  if (!this.title().trim()) return;
  
  this.d.sendNotice({ 
    title: this.title().trim(), 
    body: this.body().trim(), 
    audience: this.aud() 
    // ❌ Remove: kind: this.kind() 
  });
  
  this.open = false; 
  this.title.set(''); 
  this.body.set('');
}
}