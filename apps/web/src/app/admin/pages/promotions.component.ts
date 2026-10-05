import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../admin-api.service';
import { BadgeComponent } from '../ui/badge.component';
import { IconComponent } from '../ui/icon.component';
import { StateComponent } from '../ui/state.component';
import { StatComponent } from '../ui/stat.component';
import { dstr, money } from '../ui/format';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, IconComponent, StateComponent, StatComponent],
  template: `
    <div class="page-head">
      <div>
        <h1 class="page-title">Marketplace Promotions & Slides</h1>
        <p class="page-sub">
          Control seasonal event themes (Pchum Ben, Festivals) and approve seller slide placements on the homepage
        </p>
      </div>
      <div class="cell-actions">
        @if (tab() === 'campaigns') {
          <button class="btn btn-primary" (click)="openCreateCampaign()">
            <kc-icon name="plus" [size]="14"></kc-icon> Drop Seasonal Event
          </button>
        }
        <button class="btn btn-sm" (click)="refresh()">Refresh</button>
      </div>
    </div>

    <!-- Top Stats -->
    <div class="grid g4 mb">
      <kc-stat label="Active seasonal events" icon="tag" [value]="activeCampaignCount()"></kc-stat>
      <kc-stat label="Pending slides" icon="clock" [value]="pendingSlideCount()" hint="Awaiting approval"></kc-stat>
      <kc-stat label="Live approved slides" icon="check" [value]="approvedSlideCount()"></kc-stat>
      <kc-stat label="Total slide slots" icon="box" [value]="slides().length"></kc-stat>
    </div>

    <!-- Navigation Tabs -->
    <div class="toolbar">
      <div class="tabs">
        <button class="tab" [class.active]="tab() === 'slides'" (click)="tab.set('slides')">
          Seller Slide Applications ({{ slides().length }})
        </button>
        <button class="tab" [class.active]="tab() === 'campaigns'" (click)="tab.set('campaigns')">
          Seasonal Theme Events ({{ campaigns().length }})
        </button>
      </div>
      <span class="grow"></span>
      @if (tab() === 'slides') {
        <select class="input" [value]="slideFilter()" (change)="onFilterChange($any($event.target).value)">
          <option value="ALL">All slide statuses</option>
          <option value="PENDING_APPROVAL">Pending review</option>
          <option value="APPROVED">Approved & Live</option>
          <option value="REJECTED">Rejected</option>
        </select>
      }
    </div>

    <!-- ============ TAB 1: SELLER SLIDES ============ -->
    @if (tab() === 'slides') {
      <div class="card">
        @if (loading()) {
          <kc-state mode="loading" message="Loading promotional slide submissions…"></kc-state>
        } @else if (error()) {
          <kc-state mode="error" [message]="error()" (retry)="loadSlides()"></kc-state>
        } @else if (!filteredSlides().length) {
          <kc-state mode="empty" message="No promotional slides in this filter."></kc-state>
        } @else {
          <table class="tbl">
            <thead>
              <tr>
                <th>Slide Preview & Creative</th>
                <th>Store</th>
                <th>Destination</th>
                <th>Event & Theme</th>
                <th>Schedule</th>
                <th>Pricing</th>
                <th>Status</th>
                <th class="right">Moderation</th>
              </tr>
            </thead>
            <tbody>
              @for (s of filteredSlides(); track s._id) {
                <tr>
                  <td>
                    <div class="cell-flex" style="align-items:flex-start">
                      <img
                        [src]="s.imageUrl"
                        alt="Creative preview"
                        style="width:84px;height:52px;object-fit:cover;border-radius:8px;border:1px solid var(--line);background:var(--paper)"
                      />
                      <div>
                        <div style="font-size:10px;font-weight:800;color:var(--brand);text-transform:uppercase;letter-spacing:.05em">
                          {{ s.badge || 'PROMOTION' }}
                        </div>
                        <div class="cell-main" style="font-size:13px">{{ s.title }}</div>
                        <div class="cell-sub" style="max-width:240px;line-height:1.3">{{ s.subtitle }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="cell-main">{{ s.storeName }}</div>
                    <div class="cell-sub">/stores/{{ s.storeSlug }}</div>
                  </td>
                  <td>
                    <div class="cell-flex">
                      <kc-badge [value]="s.targetType === 'PRODUCT' ? 'product' : 'store'"></kc-badge>
                      <a [href]="s.targetUrl" target="_blank" class="cell-sub" style="color:var(--brand);text-decoration:underline">
                        {{ s.targetUrl }}
                      </a>
                    </div>
                  </td>
                  <td>
                    <div class="cell-main">{{ s.campaignTitle || 'Custom Date Booking' }}</div>
                    <span class="theme-pill-tag" [attr.data-theme]="s.theme">{{ s.theme }}</span>
                  </td>
                  <td>
                    <div class="cell-main">{{ s.days }} days</div>
                    <div class="cell-sub">{{ dstr(s.startDate) }} → {{ dstr(s.endDate) }}</div>
                  </td>
                  <td>
                    <div class="cell-main">{{ s.totalPrice === 0 ? 'FREE' : money(s.totalPrice) }}</div>
                    <div class="cell-sub">
                      @if (s.isPaid || s.totalPrice === 0) {
                        <span style="color:var(--green);font-weight:700">✓ Paid</span>
                      } @else {
                        <span style="color:var(--red);font-weight:700">Unpaid</span>
                      }
                    </div>
                  </td>
                  <td>
                    <kc-badge [value]="badgeForStatus(s.status)"></kc-badge>
                    @if (s.rejectionReason) {
                      <div class="cell-sub" style="color:var(--red);font-size:11px">Reason: {{ s.rejectionReason }}</div>
                    }
                  </td>
                  <td class="right">
                    <div class="cell-actions">
                      @if (s.status === 'PENDING_APPROVAL' || s.status === 'REJECTED') {
                        <button class="btn btn-sm btn-primary" (click)="approve(s._id)">Approve</button>
                      }
                      @if (s.status === 'APPROVED') {
                        <button class="btn btn-sm" (click)="reject(s._id)">Pause</button>
                      } @else if (s.status !== 'REJECTED') {
                        <button class="btn btn-sm" style="color:var(--red)" (click)="reject(s._id)">Reject</button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }

    <!-- ============ TAB 2: SEASONAL CAMPAIGNS ============ -->
    @if (tab() === 'campaigns') {
      <div class="card">
        @if (campaignsLoading()) {
          <kc-state mode="loading" message="Loading promotional campaigns…"></kc-state>
        } @else if (!campaigns().length) {
          <kc-state mode="empty" message="No event campaigns created yet. Click 'Drop Seasonal Event' to start."></kc-state>
        } @else {
          <table class="tbl">
            <thead>
              <tr>
                <th>Event Campaign</th>
                <th>Theme Style</th>
                <th>Dates & Window</th>
                <th>Seller Cost</th>
                <th>Status</th>
                <th class="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (c of campaigns(); track c._id) {
                <tr>
                  <td>
                    <div class="cell-main" style="font-weight:700;font-size:14px">{{ c.title }}</div>
                    <div class="cell-sub" style="max-width:320px">{{ c.description }}</div>
                  </td>
                  <td>
                    <span class="theme-pill-tag" [attr.data-theme]="c.theme">{{ c.theme }}</span>
                    <div class="cell-sub" style="margin-top:4px">Kicker: {{ c.kicker }}</div>
                  </td>
                  <td>
                    <div class="cell-main">{{ dstr(c.startDate) }} → {{ dstr(c.endDate) }}</div>
                  </td>
                  <td>
                    @if (c.isFree) {
                      <kc-badge value="free"></kc-badge>
                      <span class="cell-sub" style="margin-left:6px">Free to participate</span>
                    } @else {
                      <div class="cell-main">{{ money(c.dailyRate) }} / day</div>
                    }
                  </td>
                  <td>
                    <kc-badge [value]="c.status === 'ACTIVE' ? 'active' : 'archived'"></kc-badge>
                  </td>
                  <td class="right">
                    <button class="btn btn-sm" (click)="toggleCampaign(c)">
                      {{ c.status === 'ACTIVE' ? 'Archive' : 'Activate' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }

    <!-- ============ CREATE EVENT CAMPAIGN MODAL ============ -->
    @if (showCreateCampaign()) {
      <div class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Drop New Seasonal Event Theme</h3>
            <button class="icon-btn" (click)="showCreateCampaign.set(false)"><kc-icon name="x" [size]="16"></kc-icon></button>
          </div>
          <div class="form-body">
            <div class="form-row">
              <label>Event Name *</label>
              <input class="input" placeholder="e.g. Pchum Ben Festival Special 2026" [(ngModel)]="newCampTitle" />
            </div>
            <div class="form-row">
              <label>Design Theme Template *</label>
              <select class="input" [(ngModel)]="newCampTheme">
                <option value="pchum-ben">Pchum Ben (Gold & Terracotta Offerings)</option>
                <option value="water-festival">Water Festival (Bon Om Touk)</option>
                <option value="khmer-new-year">Khmer New Year (Traditional Joy)</option>
                <option value="local-pride">Made in Cambodia / Local Pride</option>
                <option value="general">General Marketplace Curated</option>
              </select>
            </div>
            <div class="form-row">
              <label>Banner Kicker / Badge</label>
              <input class="input" placeholder="e.g. PCHUM BEN CELEBRATION" [(ngModel)]="newCampKicker" />
            </div>
            <div class="form-row">
              <label>Event Description for Sellers *</label>
              <textarea
                class="input"
                style="height:68px;resize:vertical"
                placeholder="Explain the promotion theme, offerings, and recommendations for sellers."
                [(ngModel)]="newCampDesc"
              ></textarea>
            </div>
            <div class="grid half">
              <div class="form-row">
                <label>Start Date *</label>
                <input class="input" type="date" [(ngModel)]="newCampStart" />
              </div>
              <div class="form-row">
                <label>End Date *</label>
                <input class="input" type="date" [(ngModel)]="newCampEnd" />
              </div>
            </div>
            <div class="form-row" style="margin-top:8px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" [(ngModel)]="newCampIsFree" />
                <span style="font-weight:600">Free participation for sellers (No payment required)</span>
              </label>
            </div>
            @if (!newCampIsFree) {
              <div class="form-row">
                <label>Daily Rate ($ USD per day)</label>
                <input class="input" type="number" min="1" [(ngModel)]="newCampRate" />
              </div>
            }
          </div>
          <div class="modal-actions">
            <button class="btn" (click)="showCreateCampaign.set(false)">Cancel</button>
            <button
              class="btn btn-primary"
              [disabled]="!newCampTitle.trim() || !newCampDesc.trim() || !newCampStart || !newCampEnd"
              (click)="saveCampaign()"
            >
              Publish Event Theme
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .theme-pill-tag {
        display: inline-block;
        padding: 3px 9px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        background: #f2ede4;
        color: #594f43;
      }
      .theme-pill-tag[data-theme='pchum-ben'] {
        background: #fdf3d8;
        color: #8c5b05;
        border: 1px solid #f2db9d;
      }
      .theme-pill-tag[data-theme='water-festival'] {
        background: #e1f5fe;
        color: #0277bd;
        border: 1px solid #b3e5fc;
      }
      .theme-pill-tag[data-theme='khmer-new-year'] {
        background: #ffebee;
        color: #c62828;
        border: 1px solid #ffcdd2;
      }
      .theme-pill-tag[data-theme='local-pride'] {
        background: #e8f5e9;
        color: #2e7d32;
        border: 1px solid #c8e6c9;
      }
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(18, 16, 14, 0.55);
        backdrop-filter: blur(4px);
        display: grid;
        place-items: center;
        z-index: 1000;
        padding: 16px;
      }
      .modal-card {
        background: #fff;
        border-radius: 14px;
        width: min(100%, 540px);
        padding: 24px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      }
      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }
      .modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
      }
      .form-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .form-row {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .form-row label {
        font-size: 12px;
        font-weight: 600;
        color: var(--muted);
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
      }
    `,
  ],
})
export class PromotionsComponent {
  private readonly api = inject(AdminApiService);

  tab = signal<'slides' | 'campaigns'>('slides');
  slideFilter = signal<string>('ALL');

  slides = signal<any[]>([]);
  campaigns = signal<any[]>([]);

  loading = signal(true);
  campaignsLoading = signal(true);
  error = signal('');

  showCreateCampaign = signal(false);
  newCampTitle = '';
  newCampTheme: any = 'pchum-ben';
  newCampKicker = 'PCHUM BEN CELEBRATION';
  newCampDesc = '';
  newCampStart = '';
  newCampEnd = '';
  newCampIsFree = true;
  newCampRate = 3;

  dstr = dstr;
  money = money;

  activeCampaignCount = () => this.campaigns().filter((c) => c.status === 'ACTIVE').length;
  pendingSlideCount = () => this.slides().filter((s) => s.status === 'PENDING_APPROVAL').length;
  approvedSlideCount = () => this.slides().filter((s) => s.status === 'APPROVED').length;

  filteredSlides = () => {
    const f = this.slideFilter();
    if (f === 'ALL') return this.slides();
    return this.slides().filter((s) => s.status === f);
  };

  constructor() {
    this.refresh();
  }

  refresh() {
    this.loadSlides();
    this.loadCampaigns();
  }

  onFilterChange(val: string) {
    this.slideFilter.set(val);
    this.loadSlides();
  }

  loadSlides() {
    this.loading.set(true);
    this.error.set('');
    this.api.getAdminPromotionSlides(this.slideFilter()).subscribe({
      next: (list) => {
        this.slides.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load slides from the server.');
        this.loading.set(false);
      },
    });
  }

  loadCampaigns() {
    this.campaignsLoading.set(true);
    this.api.getPromotionCampaigns().subscribe({
      next: (list) => {
        this.campaigns.set(list);
        this.campaignsLoading.set(false);
      },
      error: () => {
        this.campaignsLoading.set(false);
      },
    });
  }

  approve(slideId: string) {
    this.api.reviewPromotionSlide(slideId, 'APPROVED').subscribe({
      next: () => this.loadSlides(),
      error: () => alert('Could not approve slide.'),
    });
  }

  reject(slideId: string) {
    const reason = prompt('Reason for rejection or pause (shown to seller):', 'Does not meet seasonal guidelines');
    if (reason === null) return;
    this.api.reviewPromotionSlide(slideId, 'REJECTED', reason).subscribe({
      next: () => this.loadSlides(),
      error: () => alert('Could not reject slide.'),
    });
  }

  toggleCampaign(c: any) {
    const nextStatus = c.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    this.api.updatePromotionCampaign(c._id, { status: nextStatus }).subscribe({
      next: () => this.loadCampaigns(),
      error: () => alert('Could not update campaign status.'),
    });
  }

  openCreateCampaign() {
    const today = new Date().toISOString().split('T')[0];
    const monthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    this.newCampTitle = '';
    this.newCampTheme = 'pchum-ben';
    this.newCampKicker = 'PCHUM BEN CELEBRATION';
    this.newCampDesc = '';
    this.newCampStart = today;
    this.newCampEnd = monthLater;
    this.newCampIsFree = true;
    this.newCampRate = 3;
    this.showCreateCampaign.set(true);
  }

  saveCampaign() {
    this.api
      .createPromotionCampaign({
        title: this.newCampTitle.trim(),
        theme: this.newCampTheme,
        kicker: this.newCampKicker.trim() || 'SEASONAL SPECIAL',
        description: this.newCampDesc.trim(),
        startDate: this.newCampStart,
        endDate: this.newCampEnd,
        isFree: this.newCampIsFree,
        dailyRate: this.newCampIsFree ? 0 : Number(this.newCampRate) || 3,
      })
      .subscribe({
        next: () => {
          this.showCreateCampaign.set(false);
          this.loadCampaigns();
        },
        error: () => alert('Could not save seasonal campaign.'),
      });
  }

  badgeForStatus(st: string): string {
    if (st === 'APPROVED') return 'active';
    if (st === 'PENDING_APPROVAL') return 'pending';
    if (st === 'REJECTED') return 'rejected';
    return 'inactive';
  }
}
