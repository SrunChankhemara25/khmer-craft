import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { AdminService } from '../admin-data.service';
import { AdminApiService, AdminSlide, SlideInput, SlidePlacement } from '../admin-api.service';
import { apiErrorMessage } from '../../core/auth/auth.service';
import { BadgeComponent } from '../ui/badge.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { IconComponent } from '../ui/icon.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { StateComponent } from '../ui/state.component';
import { StatComponent } from '../ui/stat.component';
import { dstr, money } from '../ui/format';

type View = 'requests' | 'live' | 'inactive' | 'all';
interface ConfirmRequest { title: string; msg: string; label: string; requireReason: boolean; fn: (reason: string) => void }
interface Draft {
  id: string | null;
  isHouse: boolean;
  placement: SlidePlacement;
  badge: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  targetUrl: string;
  buttonText: string;
  startDate: string;
  endDate: string;
  publish: boolean;
}

const PLACEMENT_LABEL: Record<SlidePlacement, string> = { HERO: 'Hero banner', BRAND_ADS: 'Featured brands rail' };
/** Matches the API's 5MB cap on an uploaded image string, with headroom for base64. */
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Homepage slide management. Two carousels (hero banner, featured-brands
 * rail), each with an admin-controlled order. Sellers request slides and an
 * admin approves them here; admins can also publish KhmerCraft's own slides.
 */
@Component({
  standalone: true,
  imports: [FormsModule, BadgeComponent, ConfirmComponent, IconComponent, MenuComponent, StateComponent, StatComponent],
  template: `
  <div class="page-head">
    <div><h1 class="page-title">Homepage Slides</h1>
      <p class="page-sub">Review seller slide requests, publish KhmerCraft slides, and set what shoppers see first</p></div>
    <div class="cell-actions">
      <button class="btn btn-sm" (click)="load()"><kc-icon name="refresh" [size]="13"></kc-icon> Refresh</button>
      <button class="btn btn-primary" (click)="openCreate()"><kc-icon name="plus" [size]="14"></kc-icon> New slide</button>
    </div>
  </div>

  <div class="grid stats mb">
    <kc-stat label="Waiting for review" icon="clock" [value]="count('requests')" hint="Seller slide requests"></kc-stat>
    <kc-stat label="On the homepage now" icon="eye" [value]="liveCount()" [hint]="liveHero() + ' hero · ' + liveBrand() + ' brand rail'"></kc-stat>
    <kc-stat label="Paused or draft" icon="pause" [value]="count('inactive')"></kc-stat>
    <kc-stat label="Seller ad revenue" icon="wallet" [value]="money(paidRevenue())" hint="Paid seller slide bookings"></kc-stat>
  </div>

  <div class="toolbar">
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" [class.active]="view() === 'requests'" (click)="view.set('requests')">Requests ({{count('requests')}})</button>
      <button class="tab" role="tab" [class.active]="view() === 'live'" (click)="view.set('live')">Approved ({{count('live')}})</button>
      <button class="tab" role="tab" [class.active]="view() === 'inactive'" (click)="view.set('inactive')">Paused & drafts ({{count('inactive')}})</button>
      <button class="tab" role="tab" [class.active]="view() === 'all'" (click)="view.set('all')">All ({{slides().length}})</button>
    </div>
    <select class="input" [value]="placement()" (change)="placement.set($any($event.target).value)" aria-label="Carousel">
      <option value="ALL">Both carousels</option>
      <option value="HERO">Hero banner</option>
      <option value="BRAND_ADS">Featured brands rail</option>
    </select>
  </div>

  @if (view() === 'live' && placement() === 'ALL' && rows().length > 1) {
    <p class="hint-row"><kc-icon name="sliders" [size]="13"></kc-icon> Choose one carousel above to change the order slides appear in.</p>
  }
  @if (actionError()) {
    <div class="notice-row" role="alert"><kc-icon name="alert" [size]="14"></kc-icon> {{actionError()}}
      <button class="link" (click)="actionError.set('')">Dismiss</button></div>
  }

  <div class="card">
    @if (loading()) { <kc-state mode="loading" message="Loading slides…"></kc-state> }
    @else if (error()) { <kc-state mode="error" [message]="error()" (retry)="load()"></kc-state> }
    @else if (!rows().length) {
      <kc-state mode="empty" [message]="view() === 'requests' ? 'No slide requests waiting. New seller requests will appear here.' : 'No slides in this view.'"></kc-state>
    } @else {
      <table class="tbl">
        <thead><tr>
          @if (canReorder()) { <th style="width:70px">Order</th> }
          <th>Slide</th><th>Carousel</th><th>Owner</th><th>Schedule</th><th>Billing</th><th>Status</th><th class="right">Actions</th>
        </tr></thead>
        <tbody>
          @for (s of rows(); track s._id; let i = $index; let last = $last) {
            <tr>
              @if (canReorder()) {
                <td><div class="order">
                  <span class="pos">{{i + 1}}</span>
                  <button class="icon-btn" aria-label="Move up" data-tip="Move up" [disabled]="i === 0 || busy()" (click)="move(i, -1)"><kc-icon name="arrow-up" [size]="13"></kc-icon></button>
                  <button class="icon-btn" aria-label="Move down" data-tip="Move down" [disabled]="last || busy()" (click)="move(i, 1)"><kc-icon name="arrow-down" [size]="13"></kc-icon></button>
                </div></td>
              }
              <td><div class="cell-flex" style="align-items:flex-start">
                @if (s.imageUrl) { <img class="prev" [src]="s.imageUrl" alt="" loading="lazy"/> }
                @else { <span class="prev empty"><kc-icon name="image" [size]="16"></kc-icon></span> }
                <div style="min-width:0">
                  <div class="kicker">{{s.badge || 'PROMOTION'}}</div>
                  <div class="cell-main">{{s.title}}</div>
                  <div class="cell-sub clamp">{{s.subtitle}}</div>
                  <div class="cell-sub link-out">→ {{s.targetUrl}}</div>
                </div>
              </div></td>
              <td class="cell-sub">{{placementLabel(s.placement)}}</td>
              <td>@if (s.isHouse) { <span class="house">KhmerCraft</span> } @else {
                <div class="cell-main">{{s.storeName}}</div><div class="cell-sub">{{s.campaignTitle || 'Custom booking'}}</div> }</td>
              <td><div class="cell-sub">{{dstr(s.startDate)}} → {{dstr(s.endDate)}}</div>
                <div class="cell-sub">{{timing(s)}}</div></td>
              <td>@if (s.isHouse) { <span class="cell-sub">—</span> } @else {
                <div class="cell-main">{{s.totalPrice ? money(s.totalPrice) : 'Free'}}</div>
                @if (s.totalPrice) { <div class="cell-sub" [style.color]="s.isPaid ? 'var(--green)' : 'var(--red)'">{{s.isPaid ? 'Paid' : 'Unpaid'}}</div> } }</td>
              <td><kc-badge [value]="statusLabel(s)"></kc-badge>
                @if (s.rejectionReason && s.status === 'REJECTED') { <div class="cell-sub" style="color:var(--red);max-width:180px">{{s.rejectionReason}}</div> }</td>
              <td class="right"><div class="cell-actions">
                @if (s.status === 'PENDING_APPROVAL') {
                  <button class="btn btn-sm btn-primary" [disabled]="busy()" (click)="approve(s)">Approve</button>
                  <button class="btn btn-sm btn-danger" [disabled]="busy()" (click)="askReject(s)">Reject</button>
                } @else if (s.status === 'APPROVED') {
                  <button class="btn btn-sm" [disabled]="busy()" (click)="setStatus(s, 'PAUSED')"><kc-icon name="pause" [size]="11"></kc-icon> Pause</button>
                } @else if (s.status === 'PAUSED' || (s.status === 'DRAFT' && s.isHouse)) {
                  <button class="btn btn-sm" [disabled]="busy()" (click)="setStatus(s, 'APPROVED')"><kc-icon name="play" [size]="11"></kc-icon> {{s.status === 'DRAFT' ? 'Publish' : 'Resume'}}</button>
                }
                <kc-menu [items]="menu(s)" (pick)="act($event, s)"></kc-menu>
              </div></td>
            </tr>
          }
        </tbody>
      </table>
    }
  </div>

  <!-- ============ CREATE / EDIT ============ -->
  @if (draft(); as f) {
    <div class="drawer-back" (click)="closeDraft()"></div>
    <div class="drawer wide" role="dialog" [attr.aria-label]="f.id ? 'Edit slide' : 'New slide'">
      <div class="drawer-head"><b>{{f.id ? 'Edit slide' : 'New KhmerCraft slide'}}</b>
        <button class="icon-btn" aria-label="Close" (click)="closeDraft()"><kc-icon name="x" [size]="14"></kc-icon></button></div>
      <div class="drawer-body">
        <div class="preview" [class.hero]="f.placement === 'HERO'" [style.background-image]="f.imageUrl ? 'url(' + f.imageUrl + ')' : null">
          <div class="preview-shade"></div>
          <div class="preview-copy">
            <span class="preview-badge">{{f.badge || 'KHMERCRAFT'}}</span>
            <strong>{{f.title || 'Slide title'}}</strong>
            @if (f.subtitle) { <span>{{f.subtitle}}</span> }
            <span class="preview-cta">{{f.buttonText || 'Explore Now'}} →</span>
          </div>
        </div>
        <p class="cell-sub" style="margin:6px 0 16px">Preview — {{placementLabel(f.placement)}}</p>

        @if (!f.isHouse) {
          <p class="hint-row">This is a seller's slide. You can move it to another carousel or change its dates; to change its content, reject it with a reason so the seller can resubmit.</p>
        }

        <div class="form">
          <label class="field"><span>Carousel</span>
            <select class="input" [(ngModel)]="f.placement">
              <option value="HERO">Hero banner (top of homepage)</option>
              <option value="BRAND_ADS">Featured brands rail</option>
            </select></label>
          <label class="field"><span>Title *</span>
            <input class="input" maxlength="120" [(ngModel)]="f.title" [disabled]="!f.isHouse" placeholder="e.g. Khmer New Year gifts"/></label>
          <label class="field"><span>Subtitle</span>
            <input class="input" maxlength="240" [(ngModel)]="f.subtitle" [disabled]="!f.isHouse" placeholder="One line shoppers read under the title"/></label>
          <div class="two">
            <label class="field"><span>Badge</span>
              <input class="input" maxlength="40" [(ngModel)]="f.badge" [disabled]="!f.isHouse" placeholder="KHMERCRAFT"/></label>
            <label class="field"><span>Button text</span>
              <input class="input" maxlength="40" [(ngModel)]="f.buttonText" [disabled]="!f.isHouse" placeholder="Explore Now"/></label>
          </div>
          <label class="field"><span>Links to *</span>
            <input class="input" maxlength="500" [(ngModel)]="f.targetUrl" [disabled]="!f.isHouse" placeholder="/products?category=Textiles"/></label>
          <div class="field"><span>Image *</span>
            <div class="img-row">
              <input class="input" style="flex:1" [ngModel]="f.imageUrl.startsWith('data:') ? '(uploaded image)' : f.imageUrl"
                (ngModelChange)="f.imageUrl = $event" [disabled]="!f.isHouse || f.imageUrl.startsWith('data:')" placeholder="https://… image URL"/>
              @if (f.isHouse) {
                @if (f.imageUrl.startsWith('data:')) { <button class="btn btn-sm" type="button" (click)="f.imageUrl = ''">Remove</button> }
                <label class="btn btn-sm upload"><kc-icon name="image" [size]="13"></kc-icon> Upload
                  <input type="file" accept="image/png,image/jpeg,image/webp" (change)="upload($event, f)"/></label>
              }
            </div>
            <small class="cell-sub">{{f.placement === 'HERO' ? 'Wide banner, about 1600×600.' : 'About 1200×800.'}} JPG, PNG or WebP up to 3.5 MB.</small>
          </div>
          <div class="two">
            <label class="field"><span>Starts</span><input class="input" type="date" [(ngModel)]="f.startDate"/></label>
            <label class="field"><span>Ends</span><input class="input" type="date" [(ngModel)]="f.endDate"/></label>
          </div>
          @if (!f.id) {
            <label class="check"><input type="checkbox" [(ngModel)]="f.publish"/> Publish now (otherwise saved as a draft)</label>
          }
        </div>
        @if (formError()) { <div class="notice-row" role="alert" style="margin-top:14px"><kc-icon name="alert" [size]="14"></kc-icon> {{formError()}}</div> }
        <div class="form-actions">
          <button class="btn" (click)="closeDraft()">Cancel</button>
          <button class="btn btn-primary" [disabled]="busy() || !valid(f)" (click)="save(f)">{{busy() ? 'Saving…' : f.id ? 'Save changes' : f.publish ? 'Publish slide' : 'Save draft'}}</button>
        </div>
      </div>
    </div>
  }

  @if (confirmReq(); as c) {
    <kc-confirm [title]="c.title" [message]="c.msg" [requireReason]="c.requireReason"
      [confirmLabel]="c.label" (confirm)="runConfirm($event)" (cancel)="confirmReq.set(null)"></kc-confirm>
  }`,
  styles: [`
    .prev{width:96px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--line);background:var(--gray);flex-shrink:0}
    .prev.empty{display:grid;place-items:center;color:var(--muted)}
    .kicker{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}
    .clamp{max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .link-out{font-size:11px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .house{display:inline-block;padding:2px 8px;border-radius:6px;background:var(--accent-050);color:var(--accent);font-size:11px;font-weight:650}
    .order{display:flex;align-items:center;gap:2px}
    .order .pos{width:18px;font-weight:650;font-variant-numeric:tabular-nums;color:var(--muted)}
    .order .icon-btn{width:26px;height:26px}
    .order .icon-btn:disabled{opacity:.3;cursor:default}
    .hint-row{display:flex;align-items:center;gap:8px;margin:0 0 12px;padding:9px 14px;border-radius:10px;background:var(--gray);color:var(--muted);font-size:12px}
    .notice-row{display:flex;align-items:center;gap:8px;margin:0 0 12px;padding:9px 14px;border-radius:10px;background:var(--red-050);color:var(--red);font-size:12px;font-weight:600}
    .notice-row .link{margin-left:auto}
    .drawer.wide{width:560px}
    .preview{position:relative;height:170px;border-radius:12px;overflow:hidden;background:var(--ink) center/cover no-repeat;display:flex;align-items:flex-end}
    .preview.hero{height:150px}
    .preview-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgb(0 0 0/.65),rgb(0 0 0/.1))}
    .preview-copy{position:relative;display:flex;flex-direction:column;gap:4px;padding:16px;color:#fff;max-width:80%}
    .preview-copy strong{font-size:18px;line-height:1.2}
    .preview-copy span{font-size:12px;opacity:.9}
    .preview-badge{align-self:flex-start;background:rgb(255 255 255/.2);border-radius:4px;padding:2px 6px;font-size:10px!important;font-weight:700;letter-spacing:.06em}
    .preview-cta{font-weight:650;margin-top:4px}
    .form{display:flex;flex-direction:column;gap:12px}
    .field{display:flex;flex-direction:column;gap:5px}
    .field>span{font-size:12px;font-weight:600;color:var(--muted)}
    .field .input{width:100%}
    .field .input:disabled{background:var(--gray);color:var(--muted)}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .img-row{display:flex;gap:8px;align-items:center}
    .upload{position:relative;overflow:hidden;cursor:pointer}
    .upload input{position:absolute;inset:0;opacity:0;cursor:pointer}
    .check{display:flex;gap:8px;align-items:center;font-size:13px;cursor:pointer}
    .form-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
    @media (max-width:640px){ .two{grid-template-columns:1fr} .drawer.wide{width:100%} }
  `],
})
export class SlidesComponent {
  private readonly api = inject(AdminApiService);
  private readonly d = inject(AdminService);

  money = money; dstr = dstr;

  slides = signal<AdminSlide[]>([]);
  loading = signal(true);
  error = signal('');
  busy = signal(false);
  actionError = signal('');
  view = signal<View>('requests');
  placement = signal<SlidePlacement | 'ALL'>('ALL');
  draft = signal<Draft | null>(null);
  formError = signal('');
  confirmReq = signal<ConfirmRequest | null>(null);

  private matches(s: AdminSlide, view: View) {
    switch (view) {
      case 'requests': return s.status === 'PENDING_APPROVAL';
      case 'live': return s.status === 'APPROVED';
      case 'inactive': return s.status === 'PAUSED' || s.status === 'DRAFT';
      default: return true;
    }
  }

  rows = computed(() => {
    const p = this.placement();
    const list = this.slides().filter((s) => this.matches(s, this.view()) && (p === 'ALL' || s.placement === p));
    // Approved slides read in carousel order; everything else newest first.
    return this.view() === 'live'
      ? [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      : [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
  canReorder = computed(() => this.view() === 'live' && this.placement() !== 'ALL' && this.rows().length > 1);
  count = (v: View) => this.slides().filter((s) => this.matches(s, v)).length;
  liveHero = computed(() => this.slides().filter((s) => s.isLive && s.placement === 'HERO').length);
  liveBrand = computed(() => this.slides().filter((s) => s.isLive && s.placement === 'BRAND_ADS').length);
  liveCount = computed(() => this.liveHero() + this.liveBrand());
  paidRevenue = computed(() => this.slides().filter((s) => !s.isHouse && s.isPaid).reduce((sum, s) => sum + (s.totalPrice || 0), 0));

  placementLabel = (p: SlidePlacement) => PLACEMENT_LABEL[p] ?? p;

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true); this.error.set('');
    this.api.slides().subscribe({
      next: (list) => {
        this.slides.set(list);
        this.loading.set(false);
        if (this.view() === 'requests' && !this.count('requests') && this.count('live')) this.view.set('live');
      },
      error: (e) => { this.error.set(apiErrorMessage(e, 'Could not load slides. Are you signed in as ADMIN?')); this.loading.set(false); },
    });
  }

  statusLabel(s: AdminSlide): string {
    if (s.status === 'APPROVED') return s.isLive ? 'live' : new Date(s.startDate) > new Date() ? 'scheduled' : !s.isHouse && !s.isPaid && s.totalPrice ? 'unpaid' : 'ended';
    return ({ PENDING_APPROVAL: 'pending approval', PAUSED: 'paused', DRAFT: 'draft', REJECTED: 'rejected', EXPIRED: 'ended' } as Record<string, string>)[s.status] ?? s.status.toLowerCase();
  }

  timing(s: AdminSlide): string {
    const now = Date.now();
    const start = new Date(s.startDate).getTime();
    const end = new Date(s.endDate).getTime();
    const days = (ms: number) => Math.max(1, Math.ceil(ms / 864e5));
    if (now < start) return `Starts in ${days(start - now)} day${days(start - now) === 1 ? '' : 's'}`;
    if (now > end) return 'Ended';
    return `${days(end - now)} day${days(end - now) === 1 ? '' : 's'} left`;
  }

  menu(s: AdminSlide): MenuItem[] {
    const m: MenuItem[] = [{ label: s.isHouse ? 'Edit slide' : 'Change carousel or dates', icon: 'edit', action: 'edit' }];
    if (s.isHouse && s.status === 'APPROVED') m.push({ label: 'Move to drafts', icon: 'eye-off', action: 'draft' });
    if (!s.isHouse && (s.status === 'APPROVED' || s.status === 'PAUSED')) m.push({ label: 'Reject with reason', icon: 'x', danger: true, action: 'reject' });
    m.push({ label: 'Delete slide', icon: 'trash', danger: true, action: 'delete' });
    return m;
  }

  act(action: string, s: AdminSlide) {
    if (action === 'edit') this.openEdit(s);
    else if (action === 'draft') this.setStatus(s, 'DRAFT');
    else if (action === 'reject') this.askReject(s);
    else if (action === 'delete') {
      this.confirmReq.set({
        title: `Delete “${s.title}”?`, label: 'Delete', requireReason: false,
        msg: s.isHouse ? 'The slide is removed permanently.' : `This removes ${s.storeName}'s slide permanently, including its booking record. Rejecting keeps the record and tells the seller why.`,
        fn: () => this.run(this.api.deleteSlide(s._id), `Deleted slide “${s.title}”`, 'Slide deleted', 'rejected'),
      });
    }
  }

  approve(s: AdminSlide) {
    this.run(this.api.reviewPromotionSlide(s._id, 'APPROVED'), `Approved ${s.storeName} slide “${s.title}”`, 'Slide approved', 'approved');
  }

  askReject(s: AdminSlide) {
    this.confirmReq.set({
      title: `Reject “${s.title}”?`, label: 'Reject', requireReason: true,
      msg: `${s.storeName} sees this reason and can submit a corrected slide.`,
      fn: (reason) => this.run(this.api.reviewPromotionSlide(s._id, 'REJECTED', reason), `Rejected ${s.storeName} slide “${s.title}”`, 'Slide rejected', 'rejected', reason),
    });
  }

  setStatus(s: AdminSlide, status: 'APPROVED' | 'PAUSED' | 'DRAFT') {
    const verb = status === 'PAUSED' ? 'Paused' : status === 'DRAFT' ? 'Unpublished' : s.status === 'DRAFT' ? 'Published' : 'Resumed';
    this.run(this.api.setSlideStatus(s._id, status), `${verb} slide “${s.title}”`, `Slide ${verb.toLowerCase()}`, status === 'APPROVED' ? 'active' : 'pending');
  }

  move(index: number, delta: number) {
    const list = this.rows().map((s) => s._id);
    const target = index + delta;
    [list[index], list[target]] = [list[target], list[index]];
    const placement = this.placement() as SlidePlacement;
    // Show the new order immediately; the server response is the source of truth.
    this.slides.update((all) => all.map((s) => {
      const pos = list.indexOf(s._id);
      return pos >= 0 ? { ...s, sortOrder: pos + 1 } : s;
    }));
    this.busy.set(true);
    this.api.reorderSlides(placement, list).subscribe({
      next: () => { this.busy.set(false); this.d.toast('Order saved'); },
      error: (e) => { this.busy.set(false); this.actionError.set(apiErrorMessage(e, 'Could not save the new order.')); this.load(); },
    });
  }

  // ------------------------------------------------------------- form
  openCreate() {
    const now = new Date();
    this.formError.set('');
    this.draft.set({
      id: null, isHouse: true,
      placement: this.placement() === 'BRAND_ADS' ? 'BRAND_ADS' : 'HERO',
      badge: '', title: '', subtitle: '', imageUrl: '', targetUrl: '/products', buttonText: '',
      startDate: day(now), endDate: day(new Date(now.getTime() + 30 * 864e5)), publish: true,
    });
  }

  openEdit(s: AdminSlide) {
    this.formError.set('');
    this.draft.set({
      id: s._id, isHouse: !!s.isHouse, placement: s.placement,
      badge: s.badge ?? '', title: s.title, subtitle: s.subtitle ?? '', imageUrl: s.imageUrl ?? '',
      targetUrl: s.targetUrl, buttonText: s.buttonText ?? '',
      startDate: day(new Date(s.startDate)), endDate: day(new Date(s.endDate)), publish: s.status === 'APPROVED',
    });
  }

  closeDraft() { if (!this.busy()) this.draft.set(null); }

  valid(f: Draft) {
    return f.title.trim().length >= 2 && !!f.imageUrl.trim() && /^\/(?!\/)/.test(f.targetUrl.trim()) && (!f.startDate || !f.endDate || f.endDate > f.startDate);
  }

  upload(event: Event, f: Draft) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) { this.formError.set('That image is larger than 3.5 MB. Please compress it or use an image URL.'); return; }
    const reader = new FileReader();
    reader.onload = () => { f.imageUrl = String(reader.result); this.draft.set({ ...f }); this.formError.set(''); };
    reader.onerror = () => this.formError.set('Could not read that file.');
    reader.readAsDataURL(file);
  }

  save(f: Draft) {
    // Dates are picked as calendar days; end-of-day keeps the last day live.
    const start = f.startDate ? new Date(`${f.startDate}T00:00:00`).toISOString() : undefined;
    const end = f.endDate ? new Date(`${f.endDate}T23:59:59`).toISOString() : undefined;
    const content: SlideInput = {
      placement: f.placement, title: f.title.trim(), subtitle: f.subtitle.trim() || undefined,
      badge: f.badge.trim() || undefined, imageUrl: f.imageUrl.trim(), targetUrl: f.targetUrl.trim(),
      buttonText: f.buttonText.trim() || undefined, startDate: start, endDate: end,
    };
    const req = f.id
      ? this.api.updateSlide(f.id, f.isHouse ? content : { placement: f.placement, startDate: start, endDate: end })
      : this.api.createSlide({ ...content, publish: f.publish });
    this.busy.set(true); this.formError.set('');
    req.subscribe({
      next: () => {
        this.busy.set(false);
        this.draft.set(null);
        this.d.log(`${f.id ? 'Edited' : 'Created'} homepage slide “${content.title}”`, 'active');
        this.d.toast(f.id ? 'Slide saved' : f.publish ? 'Slide published' : 'Draft saved');
        if (!f.id) { this.placement.set(f.placement); this.view.set(f.publish ? 'live' : 'inactive'); }
        this.load();
        this.api.refreshBadges();
      },
      error: (e) => { this.busy.set(false); this.formError.set(apiErrorMessage(e, 'Could not save this slide.')); },
    });
  }

  private run(req: Observable<unknown>, logMsg: string, toast: string, kind: string, reason?: string) {
    this.busy.set(true); this.actionError.set('');
    req.subscribe({
      next: () => {
        this.busy.set(false);
        this.d.log(logMsg, kind, { reason });
        this.d.toast(toast);
        this.load();
        this.api.refreshBadges();
      },
      error: (e: unknown) => { this.busy.set(false); this.actionError.set(apiErrorMessage(e, 'The server refused that change.')); },
    });
  }

  runConfirm(reason: string) { const c = this.confirmReq(); if (c) c.fn(reason); this.confirmReq.set(null); }
}
