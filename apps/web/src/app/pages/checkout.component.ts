import { Component, computed, effect, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CommerceApiService } from '../core/api/commerce-api.service';
import { PaymentMethod } from '../core/api/api.models';
import { AuthService } from '../core/auth/auth.service';
import { CartService, cartErrorMessage } from '../core/cart/cart.service';
import { CartLine } from '../core/catalog/catalog.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

interface PaymentOption {
  value: PaymentMethod;
  label: string;
  hint: string;
  icon: string;
}

export interface SavedDeliveryLocation {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  note?: string;
  updatedAt: number;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    value: 'COD',
    label: 'Cash on delivery',
    hint: 'Pay the courier on arrival',
    icon: 'banknote',
  },
  {
    value: 'ABA_PAYWAY',
    label: 'ABA KHQR',
    hint: 'Scan to pay after placing the order',
    icon: 'credit-card',
  },
];

/**
 * Single-page checkout.
 *
 * Replaces the four-step mock flow: delivery, payment and review on one page,
 * because there is nothing to defer — the server prices the order, so there is
 * no intermediate state worth three extra navigations.
 *
 * The totals shown here come from the cart, which is itself server-priced when
 * signed in, so what is displayed is what will be charged.
 */
@Component({
  selector: 'app-checkout',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
  ],
  template: `
    <app-navbar />

    <section class="checkout">
      @if (cart.isEmpty()) {
        <div class="empty">
          <ui-icon name="cart" [size]="28" />
          <h1>Your cart is empty</h1>
          <p>Add something before checking out.</p>
          <a class="btn btn-primary" routerLink="/products">Browse products</a>
        </div>
      } @else {
        <header class="head">
          <a class="back" routerLink="/cart"><ui-icon name="arrow-left" [size]="14" /> Cart</a>
          <h1>Checkout</h1>
        </header>

        <div class="layout">
          <form class="panel" [formGroup]="form" (ngSubmit)="placeOrder()">
            <section>
              <h2>Delivery</h2>

              @if (savedLocations().length > 0) {
                <div class="saved-locations-box">
                  <div class="saved-locations-header">
                    <span><ui-icon name="map-pin" [size]="14" /> Saved Delivery Locations</span>
                    <button type="button" class="btn-new-loc" [class.active]="selectedLocationId() === 'NEW'" (click)="startNewLocation()">
                      + Enter New Address
                    </button>
                  </div>
                  <div class="location-cards-grid">
                    @for (loc of savedLocations(); track loc.id) {
                      <div
                        class="location-card"
                        [class.selected]="selectedLocationId() === loc.id"
                        (click)="selectLocation(loc)"
                      >
                        <div class="loc-card-top">
                          <span class="loc-tag">{{ loc.label || 'Saved Location' }}</span>
                          <button
                            type="button"
                            class="btn-delete-loc"
                            (click)="removeSavedLocation(loc.id, $event)"
                            title="Remove saved location"
                          >
                            ×
                          </button>
                        </div>
                        <strong class="loc-name">{{ loc.fullName }} · {{ loc.phone }}</strong>
                        <p class="loc-address">{{ loc.address }}, {{ loc.city }}, {{ loc.province }}</p>
                      </div>
                    }
                  </div>
                </div>
              }

              <div class="grid">
                <label>
                  <span>Full name</span>
                  <input formControlName="fullName" autocomplete="name" />
                  @if (invalid('fullName')) { <small>Enter the recipient's name</small> }
                </label>
                <label>
                  <span>Phone</span>
                  <input formControlName="phone" autocomplete="tel" inputmode="tel" placeholder="012 345 678" />
                  @if (invalid('phone')) { <small>Enter a number the courier can call</small> }
                </label>
                <label>
                  <span>Province</span>
                  <input formControlName="province" placeholder="Phnom Penh" />
                  @if (invalid('province')) { <small>Required</small> }
                </label>
                <label>
                  <span>City / district</span>
                  <input formControlName="city" placeholder="Chamkarmon" />
                  @if (invalid('city')) { <small>Required</small> }
                </label>
                <label class="wide">
                  <span>Address</span>
                  <input formControlName="address" autocomplete="street-address" placeholder="House 12, Street 240" />
                  @if (invalid('address')) { <small>Enter a street address</small> }
                </label>
                <label class="wide">
                  <span>Note for the courier <em>optional</em></span>
                  <input formControlName="note" placeholder="Landmark, gate code, best time to call" />
                </label>
                <div class="wide save-location-control">
                  <label class="save-checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="saveLocationForLater()"
                      (change)="saveLocationForLater.set(!saveLocationForLater())"
                    />
                    <span><strong>Save this delivery location for later</strong> (auto-fills future checkouts)</span>
                  </label>
                  @if (saveLocationForLater()) {
                    <div class="loc-tags-selector">
                      <span class="tags-hint">Label as:</span>
                      <button
                        type="button"
                        class="tag-pill"
                        [class.selected]="locationLabel() === 'Home'"
                        (click)="locationLabel.set('Home')"
                      >
                        🏠 Home
                      </button>
                      <button
                        type="button"
                        class="tag-pill"
                        [class.selected]="locationLabel() === 'Work'"
                        (click)="locationLabel.set('Work')"
                      >
                        💼 Work
                      </button>
                      <button
                        type="button"
                        class="tag-pill"
                        [class.selected]="locationLabel() === 'Other'"
                        (click)="locationLabel.set('Other')"
                      >
                        📍 Other
                      </button>
                    </div>
                  }
                </div>
              </div>
            </section>

            <section>
              <h2>Payment</h2>
              <div class="payments" role="radiogroup" aria-label="Payment method">
                @for (option of paymentOptions; track option.value) {
                  <label class="payment" [class.selected]="method() === option.value">
                    <input
                      type="radio"
                      name="paymentMethod"
                      [value]="option.value"
                      [checked]="method() === option.value"
                      (change)="method.set(option.value)"
                    />
                    <span class="radio" aria-hidden="true"></span>
                    <span class="payment-text">
                      <strong>{{ option.label }}</strong>
                      <small>{{ option.hint }}</small>
                    </span>
                  </label>
                }
              </div>
            </section>
          </form>

          <aside class="summary">
            <h2>Summary</h2>

            <div class="items">
              @for (group of shipmentGroups(); track group.storeId) {
                @if (shipmentGroups().length > 1) { <p class="store">{{ group.sellerName }}</p> }
                @for (line of group.lines; track line.product.id) {
                  <div class="line">
                    <span class="name">{{ line.product.name }} <em>× {{ line.quantity }}</em></span>
                    <span>\${{ line.lineTotal.toFixed(2) }}</span>
                  </div>
                }
              }
            </div>

            <div class="row"><span>Subtotal</span><span>\${{ cart.subtotal().toFixed(2) }}</span></div>
            <div class="row">
              <span>Delivery</span>
              <span>{{ cart.shipping() === 0 ? 'Free' : '$' + cart.shipping().toFixed(2) }}</span>
            </div>
            <div class="row total"><span>Total</span><span>\${{ cart.total().toFixed(2) }}</span></div>

            @if (shipmentGroups().length > 1) {
              <p class="fine">Items from {{ shipmentGroups().length }} stores arrive in separate deliveries.</p>
            }

            @if (error(); as message) {
              <p class="error" role="alert">{{ message }}</p>
            }

            <button class="btn btn-primary btn-block btn-lg" (click)="placeOrder()" [disabled]="submitting()">
              {{ submitting() ? 'Placing order…' : (method() === 'ABA_PAYWAY' ? 'Continue to payment' : 'Place order') }}
            </button>
            <p class="fine center"><ui-icon name="lock" [size]="11" /> Secure checkout</p>
          </aside>
        </div>
      }
    </section>

    <app-footer />
  `,
  styles: [
    `
      .checkout {
        width: min(100%, 1040px);
        margin: 0 auto;
        padding: 28px 20px 72px;
      }
      .head {
        margin-bottom: 24px;
      }
      .back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--color-muted);
      }
      .back:hover {
        color: var(--color-accent);
      }
      h1 {
        font-size: 28px;
        margin-top: 6px;
      }
      h2 {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 14px;
      }
      .saved-locations-box {
        margin-bottom: 20px;
        padding: 14px 16px;
        background: var(--color-surface, #fff);
        border: 1px solid var(--color-border);
        border-radius: 14px;
      }
      .saved-locations-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        font-weight: 650;
        color: var(--color-text-secondary);
      }
      .saved-locations-header span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .btn-new-loc {
        background: none;
        border: none;
        color: var(--color-accent);
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
      }
      .btn-new-loc:hover {
        background: var(--color-accent-soft);
      }
      .location-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: 10px;
        margin-top: 12px;
      }
      .location-card {
        padding: 10px 12px;
        border: 1.5px solid var(--color-border);
        border-radius: 10px;
        background: #fff;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .location-card:hover {
        border-color: var(--color-border-strong);
      }
      .location-card.selected {
        border-color: var(--color-accent);
        background: var(--color-accent-soft, #f4faf6);
        box-shadow: 0 0 0 1px var(--color-accent);
      }
      .loc-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .loc-tag {
        font-size: 11px;
        font-weight: 700;
        color: var(--color-accent);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .btn-delete-loc {
        background: none;
        border: none;
        color: var(--color-muted);
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        padding: 0 4px;
        border-radius: 4px;
      }
      .btn-delete-loc:hover {
        color: var(--color-danger, #e11d48);
      }
      .loc-name {
        display: block;
        font-size: 12.5px;
        margin-top: 5px;
        color: var(--color-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .loc-address {
        margin: 2px 0 0;
        font-size: 12px;
        color: var(--color-text-secondary);
        line-height: 1.35;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .save-location-control {
        margin-top: 4px;
        padding: 12px 14px;
        background: var(--color-bg-alt, #f9fafb);
        border: 1px solid var(--color-border);
        border-radius: 10px;
      }
      .save-checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--color-text);
        cursor: pointer;
        user-select: none;
      }
      .save-checkbox-label input[type='checkbox'] {
        width: 16px;
        height: 16px;
        accent-color: var(--color-accent);
        cursor: pointer;
      }
      .loc-tags-selector {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px dashed var(--color-border);
      }
      .tags-hint {
        font-size: 12px;
        color: var(--color-muted);
      }
      .tag-pill {
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 600;
        border-radius: 14px;
        border: 1px solid var(--color-border);
        background: #fff;
        color: var(--color-text);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .tag-pill:hover {
        border-color: var(--color-accent);
      }
      .tag-pill.selected {
        border-color: var(--color-accent);
        background: var(--color-accent);
        color: #fff;
      }
      .layout {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 40px;
        align-items: start;
      }
      .panel {
        display: grid;
        gap: 32px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px 16px;
      }
      .wide {
        grid-column: 1 / -1;
      }
      label {
        display: grid;
        gap: 6px;
      }
      label > span {
        font-size: 12.5px;
        font-weight: 500;
        color: var(--color-text-secondary);
      }
      label em {
        color: var(--color-muted);
        font-style: normal;
        font-weight: 400;
      }
      .grid input {
        width: 100%;
        height: 44px;
        padding: 0 14px;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        background: var(--color-surface, #fff);
        font-size: 14px;
        transition: border-color var(--dur-fast), box-shadow var(--dur-fast);
      }
      .grid input:focus {
        outline: none;
        border-color: var(--color-accent);
        box-shadow: var(--shadow-focus);
      }
      label small {
        color: var(--color-danger);
        font-size: 12px;
      }
      .payments {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .payment {
        position: relative;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        cursor: pointer;
        transition: border-color var(--dur-fast), background var(--dur-fast);
      }
      .payment:hover {
        border-color: var(--color-border-strong);
      }
      .payment.selected {
        border-color: var(--color-accent);
        background: var(--color-accent-soft);
      }
      .payment input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }
      .payment:focus-within {
        box-shadow: var(--shadow-focus);
      }
      .radio {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        border-radius: 50%;
        border: 1.5px solid var(--color-border-strong);
      }
      .payment.selected .radio {
        border: 5px solid var(--color-accent);
      }
      .payment-text {
        display: grid;
        gap: 2px;
      }
      .payment strong {
        font-size: 14px;
        font-weight: 600;
      }
      .payment small {
        color: var(--color-muted);
        font-size: 12px;
      }
      .summary {
        position: sticky;
        top: 96px;
        padding: 22px;
        border-radius: 16px;
        background: var(--color-bg-alt);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .summary h2 {
        margin-bottom: 4px;
      }
      .items {
        display: grid;
        gap: 8px;
        padding-bottom: 12px;
        margin-bottom: 2px;
        border-bottom: 1px solid var(--color-border);
      }
      .store {
        font-size: 11.5px;
        color: var(--color-muted);
        margin-top: 4px;
      }
      .line,
      .row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 13.5px;
        color: var(--color-text-secondary);
      }
      .line .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .line em {
        font-style: normal;
        color: var(--color-muted);
      }
      .row.total {
        margin-top: 4px;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
        color: var(--color-text);
        font-size: 17px;
        font-weight: 650;
      }
      .error {
        color: var(--color-danger);
        font-size: 13px;
      }
      .btn-block {
        width: 100%;
        margin-top: 6px;
        justify-content: center;
      }
      .fine {
        color: var(--color-muted);
        font-size: 12px;
      }
      .fine.center {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
      }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 80px 24px;
        text-align: center;
        color: var(--color-muted);
      }
      .empty h1 {
        font-size: 22px;
        color: var(--color-text);
      }
      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
          gap: 28px;
        }
        .summary {
          position: static;
        }
      }
      @media (max-width: 560px) {
        .grid,
        .payments {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CheckoutComponent {
  protected readonly cart = inject(CartService);
  private readonly api = inject(CommerceApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly paymentOptions = PAYMENT_OPTIONS;
  protected readonly method = signal<PaymentMethod>('COD');
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly shipmentGroups = computed(() => {
    const groups = new Map<string, { storeId: string; sellerName: string; lines: CartLine[] }>();
    for (const line of this.cart.lines()) {
      const key = line.product.storeId;
      const existing = groups.get(key);
      if (existing) {
        existing.lines.push(line);
      } else {
        groups.set(key, { storeId: key, sellerName: line.product.sellerName, lines: [line] });
      }
    }
    return [...groups.values()];
  });

  protected readonly savedLocations = signal<SavedDeliveryLocation[]>([]);
  protected readonly selectedLocationId = signal<string | null>(null);
  protected readonly saveLocationForLater = signal<boolean>(true);
  protected readonly locationLabel = signal<string>('Home');

  private initSavedLocations(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('khmercraft_saved_locations');
      if (raw) {
        const parsed = JSON.parse(raw) as SavedDeliveryLocation[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.savedLocations.set(parsed);
          this.selectedLocationId.set(parsed[0].id);
          this.locationLabel.set(parsed[0].label || 'Home');
          return;
        }
      }
      const oldRaw = localStorage.getItem('khmercraft_delivery_address');
      if (oldRaw) {
        const oldAddr = JSON.parse(oldRaw);
        if (oldAddr && oldAddr.address) {
          const migrated: SavedDeliveryLocation = {
            id: 'loc_default',
            label: 'Home',
            fullName: oldAddr.fullName || '',
            phone: oldAddr.phone || '',
            province: oldAddr.province || '',
            city: oldAddr.city || '',
            address: oldAddr.address || '',
            updatedAt: Date.now(),
          };
          this.savedLocations.set([migrated]);
          this.selectedLocationId.set('loc_default');
          this.locationLabel.set('Home');
          localStorage.setItem('khmercraft_saved_locations', JSON.stringify([migrated]));
        }
      }
    } catch {
      // ignore parsing error
    }
  }

  protected readonly form = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    province: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    city: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4)],
    }),
    note: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.initSavedLocations();
    const activeSaved = this.savedLocations().find((l) => l.id === this.selectedLocationId());
    if (activeSaved) {
      this.form.patchValue({
        fullName: activeSaved.fullName,
        phone: activeSaved.phone,
        province: activeSaved.province,
        city: activeSaved.city,
        address: activeSaved.address,
        note: activeSaved.note || '',
      });
    }

    effect(() => {
      const u = this.auth.user();
      if (!u) return;
      if (!this.form.get('fullName')?.value) {
        this.form.patchValue({ fullName: u.name });
      }
      if (!this.form.get('phone')?.value && u.phone) {
        this.form.patchValue({ phone: u.phone });
      }
    });
  }

  protected selectLocation(loc: SavedDeliveryLocation): void {
    this.selectedLocationId.set(loc.id);
    this.locationLabel.set(loc.label || 'Home');
    this.form.patchValue({
      fullName: loc.fullName,
      phone: loc.phone,
      province: loc.province,
      city: loc.city,
      address: loc.address,
      note: loc.note || '',
    });
  }

  protected startNewLocation(): void {
    this.selectedLocationId.set('NEW');
    this.locationLabel.set('Other');
    const u = this.auth.user();
    this.form.patchValue({
      fullName: u?.name || this.form.get('fullName')?.value || '',
      phone: u?.phone || this.form.get('phone')?.value || '',
      province: '',
      city: '',
      address: '',
      note: '',
    });
    this.saveLocationForLater.set(true);
  }

  protected removeSavedLocation(id: string, event: Event): void {
    event.stopPropagation();
    const updated = this.savedLocations().filter((loc) => loc.id !== id);
    this.savedLocations.set(updated);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('khmercraft_saved_locations', JSON.stringify(updated));
    }
    if (this.selectedLocationId() === id) {
      if (updated.length > 0) {
        this.selectLocation(updated[0]);
      } else {
        this.startNewLocation();
      }
    }
  }

  protected invalid(field: string): boolean {
    const control = this.form.get(field);
    return Boolean(control && control.touched && control.invalid);
  }

  protected async placeOrder(): Promise<void> {
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please complete the delivery details.');
      return;
    }

    this.submitting.set(true);
    const { note, ...rest } = this.form.getRawValue();

    // Save/update delivery location if selected
    if (this.saveLocationForLater() && typeof localStorage !== 'undefined') {
      try {
        const currentList = this.savedLocations();
        const existingId = this.selectedLocationId();
        const targetId = existingId && existingId !== 'NEW' ? existingId : `loc_${Date.now()}`;

        const locToSave: SavedDeliveryLocation = {
          id: targetId,
          label: this.locationLabel() || 'Home',
          fullName: rest.fullName,
          phone: rest.phone,
          province: rest.province,
          city: rest.city,
          address: rest.address,
          note: note?.trim() || undefined,
          updatedAt: Date.now(),
        };

        const updated = [locToSave, ...currentList.filter((l) => l.id !== targetId)];
        this.savedLocations.set(updated);
        this.selectedLocationId.set(targetId);
        localStorage.setItem('khmercraft_saved_locations', JSON.stringify(updated));
        localStorage.setItem(
          'khmercraft_delivery_address',
          JSON.stringify({
            fullName: rest.fullName,
            phone: rest.phone,
            province: rest.province,
            city: rest.city,
            address: rest.address,
          }),
        );
      } catch (err) {
        console.warn('Failed to save delivery location:', err);
      }
    }

    try {
      const created = await firstValueFrom(
        this.api.createOrder(
          { ...rest, ...(note.trim() ? { note: note.trim() } : {}) },
          this.method(),
        ),
      );

      // The server empties the cart as part of checkout; mirror that locally
      // so the badge does not keep showing items that are already ordered.
      this.cart.markEmptied();

      if (this.method() === 'ABA_PAYWAY') {
        // The order exists but is unpaid; the payment page opens the ABA
        // transaction and shows the KHQR to pay it with.
        await this.router.navigate([
          '/checkout/pay',
          created.orderNumber,
        ]);
        return;
      }

      await this.router.navigate(['/order-success'], {
        queryParams: { order: created.orderNumber },
      });
    } catch (error: unknown) {
      // Surfaces the real reason — an item selling out between cart and
      // checkout is the common one.
      this.error.set(cartErrorMessage(error));
      await this.cart.refresh();
    } finally {
      this.submitting.set(false);
    }
  }
}
