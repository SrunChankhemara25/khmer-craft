import { Component, computed, inject, signal } from '@angular/core';
import { AdminService } from '../admin-data.service';
import { StatComponent } from '../ui/stat.component';
import { BadgeComponent } from '../ui/badge.component';
import { IconComponent } from '../ui/icon.component';
import { money } from '../ui/format';

interface Register { id: string; name: string; store: string; status: 'open' | 'closed'; openingCash: number }
const KEY = 'khmercraft.admin.pos-registers';

@Component({
  standalone: true,
  imports: [StatComponent, BadgeComponent, IconComponent],
  template: `
  <div class="page-head"><div><h1 class="page-title">POS Operations</h1><p class="page-sub">Manage registers and review in-store payment exceptions</p></div><button class="btn btn-primary" (click)="beginCreate()">New register</button></div>
  <div class="card card-pad ops-note mb"><kc-icon name="terminal" [size]="18"></kc-icon><div><b>POS control boundary</b><p class="muted">Register setup and shift state are frontend records for now. Sales, receipts, stock deductions, refunds, and payments remain blocked until POS APIs are connected.</p></div></div>
  <div class="grid stats mb"><kc-stat label="Configured registers" icon="terminal" [value]="registers().length"></kc-stat><kc-stat label="Open shifts" icon="clock" [value]="openCount()"></kc-stat><kc-stat label="Failed payments" icon="alert" [value]="failed().length"></kc-stat><kc-stat label="POS sales" icon="card" value="—" hint="backend endpoint required"></kc-stat></div>
  @if (editing()) { <div class="card card-pad mb"><div class="card-head" style="padding:0 0 14px;border:0"><h3 class="card-title">{{editing() === 'new' ? 'Create register' : 'Edit register'}}</h3><button class="icon-btn" aria-label="Close form" (click)="editing.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div><div class="grid half"><div class="form-row"><label>Register name</label><input class="input" placeholder="Front counter" [value]="formName()" (input)="formName.set($any($event.target).value)" /></div><div class="form-row"><label>Store</label><input class="input" placeholder="Store name" [value]="formStore()" (input)="formStore.set($any($event.target).value)" /></div><div class="form-row"><label>Opening cash</label><input class="input" type="number" min="0" [value]="formCash()" (input)="formCash.set(+$any($event.target).value)" /></div></div><div class="modal-actions"><button class="btn" (click)="editing.set(null)">Cancel</button><button class="btn btn-primary" [disabled]="!formName().trim() || !formStore().trim()" (click)="save()">Save register</button></div></div> }
  <div class="card"><table class="tbl"><thead><tr><th>Register</th><th>Store</th><th>Opening cash</th><th>Shift</th><th class="right">Actions</th></tr></thead><tbody>
    @for (r of registers(); track r.id) { <tr><td class="cell-main">{{r.name}}</td><td>{{r.store}}</td><td class="num">{{money(r.openingCash)}}</td><td><kc-badge [value]="r.status"></kc-badge></td><td class="right"><div class="cell-actions"><button class="btn btn-sm" (click)="toggle(r)">{{r.status === 'open' ? 'Close shift' : 'Open shift'}}</button><button class="icon-btn" aria-label="Edit register" data-tip="Edit register" (click)="beginEdit(r)"><kc-icon name="edit" [size]="14"></kc-icon></button><button class="icon-btn" aria-label="Delete register" data-tip="Delete register" (click)="remove(r)"><kc-icon name="trash" [size]="14"></kc-icon></button></div></td></tr> }
    @empty { <tr><td colspan="5"><div class="empty">No registers configured. Add a register to prepare the admin control surface.</div></td></tr> }
  </tbody></table></div>
  <div class="card card-pad" style="margin-top:14px"><h3 class="card-title">Payment exceptions</h3><table class="tbl"><tbody>@for (p of failed(); track p.id) { <tr><td class="cell-main">{{p.id}}</td><td>{{p.order}}</td><td class="num">{{money(p.amount)}}</td><td><kc-badge value="failed"></kc-badge></td></tr> } @empty { <tr><td><span class="muted">No failed payment records.</span></td></tr> }</tbody></table></div>`,
})
export class PosComponent {
  d = inject(AdminService); money = money; registers = signal<Register[]>([]); editing = signal<string | null>(null); formName = signal(''); formStore = signal(''); formCash = signal(0);
  failed = computed(() => this.d.payments().filter(p => p.status === 'failed')); openCount = computed(() => this.registers().filter(r => r.status === 'open').length);
  constructor() { try { this.registers.set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch {} }
  beginCreate() { this.formName.set(''); this.formStore.set(''); this.formCash.set(0); this.editing.set('new'); }
  beginEdit(r: Register) { this.formName.set(r.name); this.formStore.set(r.store); this.formCash.set(r.openingCash); this.editing.set(r.id); }
  save() { const id = this.editing(); const next = { id: id && id !== 'new' ? id : 'REG-' + Date.now(), name: this.formName().trim(), store: this.formStore().trim(), openingCash: this.formCash(), status: 'closed' as const }; this.registers.update(list => id && id !== 'new' ? list.map(r => r.id === id ? { ...r, ...next } : r) : [...list, next]); this.persist(); this.editing.set(null); }
  toggle(r: Register) { this.registers.update(list => list.map(x => x.id === r.id ? { ...x, status: x.status === 'open' ? 'closed' : 'open' } : x)); this.persist(); }
  remove(r: Register) { if (confirm(`Delete register ${r.name}?`)) { this.registers.update(list => list.filter(x => x.id !== r.id)); this.persist(); } }
  private persist() { localStorage.setItem(KEY, JSON.stringify(this.registers())); }
}
