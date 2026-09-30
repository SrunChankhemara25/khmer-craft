import { Component, inject, signal } from '@angular/core';
import { AdminApiService } from '../admin-api.service';
import { ApiStore } from '../../core/api/api.models';
import { BadgeComponent } from '../ui/badge.component';
import { IconComponent } from '../ui/icon.component';
import { StateComponent } from '../ui/state.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';

interface WebsiteRecord { id: string; storeId: string; domain: string; template: string; status: 'draft' | 'published' | 'paused' }
const KEY = 'khmercraft.admin.websites';

@Component({
  standalone: true,
  imports: [BadgeComponent, IconComponent, StateComponent, ConfirmComponent, MenuComponent],
  template: `
  <div class="page-head"><div><h1 class="page-title">Storefront Websites</h1><p class="page-sub">Create and manage optional websites connected to existing stores</p></div><button class="btn btn-primary" (click)="beginCreate()">New website</button></div>
  <div class="card card-pad ops-note mb"><kc-icon name="globe" [size]="18"></kc-icon><div><b>One catalog, multiple channels</b><p class="muted">Websites use the store catalog, prices, variants, and inventory. These frontend records are saved locally until website APIs are available.</p></div></div>
  @if (editing()) {
    <div class="card card-pad mb"><div class="card-head" style="padding:0 0 14px;border:0"><h3 class="card-title">{{editing() === 'new' ? 'Create website connection' : 'Edit website connection'}}</h3><button class="icon-btn" aria-label="Close form" (click)="editing.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div>
      <div class="grid half"><div class="form-row"><label>Connected store</label><select class="input" [value]="formStore()" (change)="formStore.set($any($event.target).value)"><option value="">Select a store</option>@for (s of stores(); track s.id) { <option [value]="s.id">{{s.name}}</option> }</select></div><div class="form-row"><label>Domain</label><input class="input" placeholder="shop.example.com" [value]="formDomain()" (input)="formDomain.set($any($event.target).value)" /></div><div class="form-row"><label>Template</label><select class="input" [value]="formTemplate()" (change)="formTemplate.set($any($event.target).value)"><option>Khmer Craft</option><option>Minimal Market</option><option>Editorial</option></select></div></div>
      <div class="modal-actions"><button class="btn" (click)="editing.set(null)">Cancel</button><button class="btn btn-primary" [disabled]="!formStore() || !formDomain().trim()" (click)="save()">Save website</button></div>
    </div>
  }
  <div class="card"><table class="tbl"><thead><tr><th>Website</th><th>Store</th><th>Template</th><th>Deployment</th><th class="right">Actions</th></tr></thead><tbody>
    @for (w of records(); track w.id) { <tr><td class="cell-main">{{w.domain}}</td><td>{{storeName(w.storeId)}}</td><td class="cell-sub">{{w.template}}</td><td><kc-badge [value]="w.status"></kc-badge></td><td class="right"><div class="cell-actions"><button class="btn btn-sm" (click)="toggleStatus(w)">{{w.status === 'published' ? 'Pause' : 'Publish'}}</button><kc-menu [items]="menuFor(w)" (pick)="act($event, w)"></kc-menu></div></td></tr> }
    @empty { <tr><td colspan="5"><kc-state mode="empty" message="No storefront websites have been connected yet. Create one to manage its domain and deployment state."></kc-state></td></tr> }
  </tbody></table></div>
  @if (pendingDelete(); as w) { <kc-confirm title="Delete website connection?" [message]="'The connection for ' + w.domain + ' will be removed from this Admin workspace.'" confirmLabel="Delete website" (confirm)="removeConfirmed(w)" (cancel)="pendingDelete.set(null)"></kc-confirm> }`,
})
export class WebsitesComponent {
  private api = inject(AdminApiService);
  stores = signal<ApiStore[]>([]); records = signal<WebsiteRecord[]>([]); editing = signal<string | null>(null); formStore = signal(''); formDomain = signal(''); formTemplate = signal('Khmer Craft');
  pendingDelete = signal<WebsiteRecord | null>(null);
  storeName = (id: string) => this.stores().find(s => s.id === id)?.name ?? 'Unknown store';
  constructor() { try { this.records.set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch {} this.api.stores(1, 50).subscribe({ next: r => this.stores.set(r.stores) }); }
  beginCreate() { this.formStore.set(''); this.formDomain.set(''); this.formTemplate.set('Khmer Craft'); this.editing.set('new'); }
  beginEdit(w: WebsiteRecord) { this.formStore.set(w.storeId); this.formDomain.set(w.domain); this.formTemplate.set(w.template); this.editing.set(w.id); }
  save() { const current = this.editing(); const next = { id: current && current !== 'new' ? current : 'WEB-' + Date.now(), storeId: this.formStore(), domain: this.formDomain().trim(), template: this.formTemplate(), status: 'draft' as const }; this.records.update(list => current && current !== 'new' ? list.map(w => w.id === current ? { ...w, ...next } : w) : [...list, next]); this.persist(); this.editing.set(null); }
  toggleStatus(w: WebsiteRecord) { this.records.update(list => list.map(x => x.id === w.id ? { ...x, status: x.status === 'published' ? 'paused' : 'published' } : x)); this.persist(); }
  menuFor(w: WebsiteRecord): MenuItem[] { return [{ label: 'Edit website', icon: 'edit', action: 'edit' }, { label: 'Delete website', icon: 'trash', danger: true, action: 'delete' }]; }
  act(action: string, w: WebsiteRecord) { if (action === 'edit') this.beginEdit(w); if (action === 'delete') this.pendingDelete.set(w); }
  removeConfirmed(w: WebsiteRecord) { this.records.update(list => list.filter(x => x.id !== w.id)); this.persist(); this.pendingDelete.set(null); }
  private persist() { localStorage.setItem(KEY, JSON.stringify(this.records())); }
}
