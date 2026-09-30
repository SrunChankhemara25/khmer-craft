import { Component, signal } from '@angular/core';
import { BadgeComponent } from '../ui/badge.component';
import { IconComponent } from '../ui/icon.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { DateRangePickerComponent } from '../ui/date-range-picker.component';

interface AdRequest { id: string; title: string; store: string; placement: string; start: string; end: string; price: number; status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paused' }
const KEY = 'khmercraft.admin.ads';

@Component({
  standalone: true,
  imports: [BadgeComponent, IconComponent, ConfirmComponent, MenuComponent, DateRangePickerComponent],
  template: `
  <div class="page-head"><div><h1 class="page-title">Promotions & Ads</h1><p class="page-sub">Create, review, schedule, and control sponsored marketplace placements</p></div><button class="btn btn-primary" (click)="beginCreate()">New ad request</button></div>
  <div class="card card-pad ops-note mb"><kc-icon name="megaphone" [size]="18"></kc-icon><div><b>Publishing gate</b><p class="muted">Only approved sellers, approved creative, confirmed payment, and active Phnom Penh booking dates may publish. These frontend records do not publish ads yet.</p></div></div>
  @if (editing()) { <div class="card card-pad mb"><div class="card-head" style="padding:0 0 14px;border:0"><h3 class="card-title">{{editing() === 'new' ? 'Create ad request' : 'Edit ad request'}}</h3><button class="icon-btn" aria-label="Close form" (click)="editing.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div><div class="grid half"><div class="form-row"><label>Campaign title</label><input class="input" placeholder="Holiday craft collection" [value]="formTitle()" (input)="formTitle.set($any($event.target).value)" /></div><div class="form-row"><label>Store or product</label><input class="input" placeholder="Store destination" [value]="formStore()" (input)="formStore.set($any($event.target).value)" /></div><div class="form-row"><label>Placement</label><select class="input" [value]="formPlacement()" (change)="formPlacement.set($any($event.target).value)"><option>Homepage hero</option><option>Homepage promotion card</option><option>Category banner</option></select></div><div class="form-row"><label>Price</label><input class="input" type="number" min="0" [value]="formPrice()" (input)="formPrice.set(+$any($event.target).value)" /></div><div class="form-row" style="grid-column:1/-1"><label>Campaign dates</label><kc-date-range [start]="formStart()" [end]="formEnd()" (apply)="setDates($event)"></kc-date-range></div></div><div class="modal-actions"><button class="btn" (click)="editing.set(null)">Cancel</button><button class="btn btn-primary" [disabled]="!valid()" (click)="save()">Save request</button></div></div> }
  <div class="card"><table class="tbl"><thead><tr><th>Campaign</th><th>Destination</th><th>Placement</th><th>Schedule</th><th>Price</th><th>Status</th><th class="right">Actions</th></tr></thead><tbody>
    @for (a of ads(); track a.id) { <tr><td class="cell-main">{{a.title}}</td><td>{{a.store}}</td><td class="cell-sub">{{a.placement}}</td><td class="cell-sub">{{a.start}} → {{a.end}}</td><td class="num">{{'$' + a.price}}</td><td><kc-badge [value]="a.status"></kc-badge></td><td class="right"><div class="cell-actions"><button class="btn btn-sm" (click)="approve(a)">{{a.status === 'approved' ? 'Pause' : 'Approve'}}</button><kc-menu [items]="menuFor(a)" (pick)="act($event, a)"></kc-menu></div></td></tr> }
    @empty { <tr><td colspan="7"><div class="empty">No ad requests yet. Create one to review placement, schedule, price, and approval state.</div></td></tr> }
  </tbody></table></div>
  @if (pendingDelete(); as a) { <kc-confirm title="Delete ad request?" [message]="'The request for ' + a.title + ' will be removed from this Admin workspace.'" confirmLabel="Delete request" (confirm)="removeConfirmed(a)" (cancel)="pendingDelete.set(null)"></kc-confirm> }`,
})
export class PromotionsComponent {
  ads = signal<AdRequest[]>([]); editing = signal<string | null>(null); formTitle = signal(''); formStore = signal(''); formPlacement = signal('Homepage hero'); formStart = signal(''); formEnd = signal(''); formPrice = signal(0);
  pendingDelete = signal<AdRequest | null>(null);
  constructor() { try { this.ads.set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch {} }
  valid() { return !!this.formTitle().trim() && !!this.formStore().trim() && !!this.formStart() && !!this.formEnd() && this.formPrice() >= 0; }
  setDates(value: { start: string; end: string }) { this.formStart.set(value.start); this.formEnd.set(value.end); }
  beginCreate() { this.formTitle.set(''); this.formStore.set(''); this.formPlacement.set('Homepage hero'); this.formStart.set(''); this.formEnd.set(''); this.formPrice.set(0); this.editing.set('new'); }
  beginEdit(a: AdRequest) { this.formTitle.set(a.title); this.formStore.set(a.store); this.formPlacement.set(a.placement); this.formStart.set(a.start); this.formEnd.set(a.end); this.formPrice.set(a.price); this.editing.set(a.id); }
  save() { const id = this.editing(); const next = { id: id && id !== 'new' ? id : 'AD-' + Date.now(), title: this.formTitle().trim(), store: this.formStore().trim(), placement: this.formPlacement(), start: this.formStart(), end: this.formEnd(), price: this.formPrice(), status: 'draft' as const }; this.ads.update(list => id && id !== 'new' ? list.map(a => a.id === id ? { ...a, ...next } : a) : [...list, next]); this.persist(); this.editing.set(null); }
  approve(a: AdRequest) { this.ads.update(list => list.map(x => x.id === a.id ? { ...x, status: x.status === 'approved' ? 'paused' : 'approved' } : x)); this.persist(); }
  menuFor(a: AdRequest): MenuItem[] { return [{ label: 'Edit request', icon: 'edit', action: 'edit' }, { label: 'Delete request', icon: 'trash', danger: true, action: 'delete' }]; }
  act(action: string, a: AdRequest) { if (action === 'edit') this.beginEdit(a); if (action === 'delete') this.pendingDelete.set(a); }
  removeConfirmed(a: AdRequest) { this.ads.update(list => list.filter(x => x.id !== a.id)); this.persist(); this.pendingDelete.set(null); }
  private persist() { localStorage.setItem(KEY, JSON.stringify(this.ads())); }
}
