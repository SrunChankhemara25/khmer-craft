import { Component, computed, input, output, signal } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon.component';
import { ApiPaywayQr } from '../../../../core/api/api.models';

/**
 * The KHQR panel: the code, its countdown, the ABA deeplink and a copy
 * button.
 *
 * Purely presentational — it knows how to show a QR and nothing about what is
 * being paid for. Both payment pages (an order, a seller plan) render this,
 * so the two can never drift into showing the same thing differently.
 */
@Component({
  selector: 'app-payway-qr',
  imports: [IconComponent],
  template: `
    <div class="card qr-card">
      @if (expired()) {
        <div class="qr-wrap expired">
          <img [src]="qr().qrImage" alt="" aria-hidden="true" />
          <div class="veil">
            <ui-icon name="clock" [size]="22" />
            <strong>This QR has expired</strong>
            <button class="btn btn-primary" (click)="renew.emit()">
              <ui-icon name="refresh-cw" [size]="14" color="#fff" /> Get a new QR
            </button>
          </div>
        </div>
      } @else {
        <div class="qr-wrap">
          <img [src]="qr().qrImage" [alt]="alt()" />
        </div>

        <p class="expiry">
          <ui-icon name="clock" [size]="13" />
          Expires in {{ remainingLabel() }}
        </p>

        @if (qr().deeplink; as link) {
          <a class="btn btn-primary btn-block" [href]="link">
            <ui-icon name="smartphone" [size]="16" color="#fff" />
            Open in ABA Mobile
          </a>
        }

        <button class="btn btn-ghost btn-block" (click)="copy()">
          <ui-icon [name]="copied() ? 'check' : 'box'" [size]="14" />
          {{ copied() ? 'Copied' : 'Copy KHQR string' }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .qr-card {
        padding: 22px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .qr-wrap {
        position: relative;
        background: #fff;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 12px;
        display: grid;
        place-items: center;
      }
      .qr-wrap img {
        width: 100%;
        max-width: 268px;
        height: auto;
        display: block;
        /* The PNG from ABA is the payable artefact — never let a theme or a
           container filter alter its contrast, or a scanner may miss it. */
        image-rendering: pixelated;
      }
      .qr-wrap.expired img {
        opacity: 0.12;
      }
      .veil {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        text-align: center;
        color: var(--color-muted);
        font-size: 13px;
      }
      .expiry {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        color: var(--color-muted);
        font-size: 12.5px;
      }
    `,
  ],
})
export class PaywayQrComponent {
  readonly qr = input.required<ApiPaywayQr>();
  /** What this QR pays for, for the image's alt text. */
  readonly label = input<string>('this payment');
  /** Ticks once a second from the parent, which owns the clock. */
  readonly now = input.required<number>();

  readonly renew = output<void>();

  protected readonly copied = signal(false);

  protected readonly expired = computed(
    () => this.now() >= Date.parse(this.qr().expiresAt),
  );

  protected readonly alt = computed(
    () =>
      `ABA KHQR code to pay $${this.qr().amount.toFixed(2)} for ${this.label()}`,
  );

  protected readonly remainingLabel = computed(() => {
    const seconds = Math.max(
      0,
      Math.round((Date.parse(this.qr().expiresAt) - this.now()) / 1000),
    );
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.qr().qrString);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard access is denied in some browsers/contexts; the QR itself
      // is still on screen, which is the actual way to pay.
    }
  }
}
