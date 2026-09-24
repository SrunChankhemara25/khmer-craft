import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage } from '../../../core/auth/auth.service';
import { SellerService, Warehouse, WarehouseType } from '../../../core/api/seller.service';
import { IconComponent } from '../../../components/shared/ui/icon/icon.component';

const TYPE_LABELS: Record<WarehouseType, string> = {
  SHOP: 'Shop',
  STORAGE: 'Storage',
  HOME: 'Home',
  PICKUP_POINT: 'Pickup point',
};

/**
 * Where a seller keeps stock.
 *
 * Most sellers here have one place — the shop or room they already work from
 * — so the empty state creates that first, and everything else stays out of
 * the way until a second location genuinely exists.
 */
@Component({
  selector: 'app-warehouses-manager',
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    <section class="wh">
      <header class="wh-head">
        <div>
          <h3>Stock locations</h3>
          <p>Where your products are kept, so you know where to pick an order from.</p>
        </div>
        @if (!showForm() && warehouses().length) {
          <button type="button" class="btn-primary" (click)="startCreate()">
            <ui-icon name="plus" [size]="15" /> Add location
          </button>
        }
      </header>

      @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
      @if (saved()) { <div class="notice success" role="status">{{ saved() }}</div> }

      @if (loading()) {
        <p class="muted">Loading locations…</p>
      } @else if (!warehouses().length && !showForm()) {
        <div class="empty">
          <ui-icon name="store" [size]="26" />
          <p>No locations yet. Add the place you keep your products — your shop, a storeroom, or home.</p>
          <button type="button" class="btn-primary" (click)="startCreate()">Add your first location</button>
        </div>
      }

      @if (warehouses().length && !showForm()) {
        <ul class="wh-list">
          @for (w of warehouses(); track w.id) {
            <li [class.inactive]="!w.isActive">
              <div class="wh-main">
                <div class="wh-title">
                  <strong>{{ w.name }}</strong>
                  <span class="tag">{{ typeLabel(w.type) }}</span>
                  @if (w.isDefault) { <span class="tag default">Default</span> }
                  @if (!w.isActive) { <span class="tag off">Closed</span> }
                </div>
                <p class="wh-addr">
                  <ui-icon name="map-pin" [size]="13" />
                  {{ addressOf(w) }}
                </p>
                @if (w.phoneNumber || w.openingHours) {
                  <p class="wh-meta">
                    @if (w.phoneNumber) { <span><ui-icon name="phone" [size]="12" /> {{ w.phoneNumber }}</span> }
                    @if (w.openingHours) { <span><ui-icon name="clock" [size]="12" /> {{ w.openingHours }}</span> }
                  </p>
                }
              </div>
              <div class="wh-actions">
                @if (!w.isDefault) {
                  <button type="button" class="link" (click)="makeDefault(w)">Make default</button>
                }
                <button type="button" class="icon" (click)="startEdit(w)" aria-label="Edit location">
                  <ui-icon name="edit" [size]="15" />
                </button>
                <button type="button" class="icon danger" (click)="remove(w)" aria-label="Delete location">
                  <ui-icon name="trash" [size]="15" />
                </button>
              </div>
            </li>
          }
        </ul>
      }

      @if (showForm()) {
        <form class="wh-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <h4>{{ editing() ? 'Edit location' : 'New location' }}</h4>

          <div class="row">
            <label>
              <span>Name <i>*</i></span>
              <input formControlName="name" placeholder="Main shop" />
              @if (submitted() && form.controls.name.invalid) { <small>Give this location a name.</small> }
            </label>
            <label>
              <span>Type</span>
              <select formControlName="type">
                @for (t of types; track t) { <option [value]="t">{{ typeLabel(t) }}</option> }
              </select>
            </label>
          </div>

          <div class="row">
            <label>
              <span>Province <i>*</i></span>
              <input formControlName="province" placeholder="Phnom Penh" />
              @if (submitted() && form.controls.province.invalid) { <small>Province is required.</small> }
            </label>
            <label><span>District</span><input formControlName="district" placeholder="Toul Kork" /></label>
          </div>

          <div class="row">
            <label><span>Commune</span><input formControlName="commune" /></label>
            <label><span>Street / building</span><input formControlName="addressLine" /></label>
          </div>

          <div class="row">
            <label><span>Contact name</span><input formControlName="contactName" /></label>
            <label><span>Phone</span><input formControlName="phoneNumber" placeholder="012 345 678" /></label>
          </div>

          <div class="row">
            <label><span>Opening hours</span><input formControlName="openingHours" placeholder="Mon–Sat, 8am–6pm" /></label>
            <label>
              <span>Landmark / directions</span>
              <input formControlName="notes" placeholder="Opposite the white pagoda" />
            </label>
          </div>

          @if (editing()) {
            <label class="check">
              <input type="checkbox" formControlName="isActive" />
              <span>Open — uncheck to close this location without deleting it</span>
            </label>
          }

          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="saving()">
              {{ saving() ? 'Saving…' : editing() ? 'Save changes' : 'Add location' }}
            </button>
            <button type="button" class="link" (click)="cancel()">Cancel</button>
          </div>
        </form>
      }
    </section>
  `,
  styles: [`
    .wh { display: block; }
    .wh-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
    .wh-head h3 { font-size: 17px; margin: 0; }
    .wh-head p { margin: 4px 0 0; color: var(--color-muted); font-size: 12.5px; }
    .muted { color: var(--color-muted); font-size: 13px; }
    .empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px 16px; border: 1px dashed var(--color-border-strong); border-radius: var(--radius-lg); text-align: center; }
    .empty ui-icon { color: var(--color-muted-2); }
    .empty p { margin: 0; max-width: 42ch; color: var(--color-muted); font-size: 13px; }
    .wh-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .wh-list li { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 14px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
    .wh-list li.inactive { opacity: .62; }
    .wh-title { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
    .wh-title strong { font-size: 14px; }
    .tag { padding: 2px 7px; border-radius: var(--radius-full); background: var(--color-bg-alt); font-size: 10.5px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--color-muted); }
    .tag.default { background: var(--color-forest); color: #fff; }
    .tag.off { background: var(--color-danger-soft); color: var(--color-danger); }
    .wh-addr, .wh-meta { display: flex; align-items: center; gap: 6px; margin: 6px 0 0; color: var(--color-text-secondary); font-size: 12.5px; }
    .wh-meta { gap: 14px; color: var(--color-muted); font-size: 12px; }
    .wh-meta span { display: inline-flex; align-items: center; gap: 5px; }
    .wh-actions { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
    .icon { display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-muted); cursor: pointer; }
    .icon:hover { color: var(--color-text); border-color: var(--color-border-strong); }
    .icon.danger:hover { color: var(--color-danger); border-color: var(--color-danger); }
    .link { border: 0; background: none; color: var(--color-accent); font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 4px 6px; }
    .btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border: 0; border-radius: var(--radius-full); background: var(--color-accent); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-primary:disabled { opacity: .6; cursor: default; }
    .wh-form { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); padding: 16px; }
    .wh-form h4 { margin: 0 0 12px; font-size: 15px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .wh-form label { display: grid; gap: 5px; font-size: 12.5px; }
    .wh-form label > span { color: var(--color-text-secondary); font-weight: 600; }
    .wh-form i { color: var(--color-danger); font-style: normal; }
    .wh-form input, .wh-form select { padding: 9px 11px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); font: inherit; font-size: 13px; }
    .wh-form small { color: var(--color-danger); font-size: 11.5px; }
    .check { display: flex !important; align-items: center; gap: 8px; margin-bottom: 12px; }
    .check input { width: auto; }
    .form-actions { display: flex; align-items: center; gap: 10px; }
    @media (max-width: 700px) {
      .row { grid-template-columns: 1fr; }
      .wh-list li { flex-direction: column; }
      .wh-actions { align-self: flex-end; }
    }
  `],
})
export class WarehousesManagerComponent implements OnInit {
  /**
   * Read in ngOnInit, not the constructor: a required input is not populated
   * until after construction, so loading there fires a request with an empty
   * id and silently returns nothing.
   */
  readonly storeId = input.required<string>();

  private readonly sellers = inject(SellerService);

  protected readonly types: WarehouseType[] = ['SHOP', 'STORAGE', 'HOME', 'PICKUP_POINT'];
  protected readonly warehouses = signal<Warehouse[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editing = signal<Warehouse | null>(null);
  protected readonly error = signal('');
  protected readonly saved = signal('');

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl<WarehouseType>('SHOP', { nonNullable: true }),
    province: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    district: new FormControl('', { nonNullable: true }),
    commune: new FormControl('', { nonNullable: true }),
    addressLine: new FormControl('', { nonNullable: true }),
    contactName: new FormControl('', { nonNullable: true }),
    phoneNumber: new FormControl('', { nonNullable: true }),
    openingHours: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.load();
  }

  protected typeLabel(type: WarehouseType): string {
    return TYPE_LABELS[type];
  }

  protected addressOf(w: Warehouse): string {
    return [w.addressLine, w.commune, w.district, w.province].filter(Boolean).join(', ');
  }

  private load(): void {
    this.loading.set(true);
    this.sellers.listWarehouses(this.storeId()).subscribe({
      next: ({ warehouses }) => {
        this.warehouses.set(warehouses);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Could not load your locations.'));
        this.loading.set(false);
      },
    });
  }

  protected startCreate(): void {
    this.editing.set(null);
    this.submitted.set(false);
    this.form.reset({ type: 'SHOP', isActive: true });
    this.showForm.set(true);
  }

  protected startEdit(w: Warehouse): void {
    this.editing.set(w);
    this.submitted.set(false);
    this.form.reset({ ...w });
    this.showForm.set(true);
  }

  protected cancel(): void {
    this.showForm.set(false);
    this.error.set('');
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) return;

    this.saving.set(true);
    this.error.set('');
    const target = this.editing();
    const value = this.form.getRawValue();
    // isActive only exists on the edit form; sending it on create would be
    // rejected by the .strict() schema.
    const payload = target ? value : { ...value, isActive: undefined };

    const request$ = target
      ? this.sellers.updateWarehouse(this.storeId(), target.id, payload)
      : this.sellers.createWarehouse(this.storeId(), payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.saved.set(target ? 'Location updated.' : 'Location added.');
        setTimeout(() => this.saved.set(''), 2500);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Could not save this location.'));
      },
    });
  }

  protected makeDefault(w: Warehouse): void {
    this.sellers.updateWarehouse(this.storeId(), w.id, { isDefault: true }).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(apiErrorMessage(err, 'Could not change the default.')),
    });
  }

  protected remove(w: Warehouse): void {
    // The server refuses when products are still kept here and says how many,
    // so the confirm stays short and the real guard lives on the server.
    if (!confirm(`Delete "${w.name}"?`)) return;
    this.sellers.deleteWarehouse(this.storeId(), w.id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(apiErrorMessage(err, 'Could not delete this location.')),
    });
  }
}
