import { Component, computed, input, output, signal } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon.component';
import { ApiPaywayQr } from '../../../../core/api/api.models';

/**
 * The KHQR payment card: amount, what it pays for, the code, a live status
 * line and the few actions a payer needs.
 *
 * Purely presentational — the page owns the polling and passes the state in.
 * Both payment pages (an order, a seller plan) render this, so the two can
 * never drift into showing the same thing differently.
 */
@Component({
  selector: 'app-payway-qr',
  imports: [IconComponent],
  template: `
    <div class="pay-card">
      <p class="eyebrow">{{ eyebrow() }}</p>
      <p class="amount">\${{ qr().amount.toFixed(2) }} <span>{{ qr().currency }}</span></p>
      <p class="caption">{{ caption() }}</p>

      <div class="qr" [class.expired]="expired()">
        <img [src]="qr().qrImage" [alt]="expired() ? '' : alt()" [attr.aria-hidden]="expired() || null" />
        @if (expired()) {
          <div class="veil">
            <strong>QR expired</strong>
            <button class="btn btn-primary btn-sm" (click)="renew.emit()">Get a new QR</button>
          </div>
        }
      </div>

      @if (!expired()) {
        <p class="status" role="status">
          <span class="dot" [class.busy]="checking()"></span>
          {{ checking() ? 'Checking with ABA…' : 'Waiting for payment' }}
          <span class="sep">·</span>
          <span class="timer">{{ remainingLabel() }}</span>
        </p>
      } @else {
        <p class="status muted" role="status">{{ expiredNote() }}</p>
      }

      @if (checkError(); as message) {
        <p class="note">{{ message }}</p>
      }

      @if (!expired()) {
        @if (qr().deeplink; as link) {
          <a class="btn btn-primary btn-block" [href]="link">Open in ABA Mobile</a>
        }
        <div class="links">
          <button type="button" class="link" [disabled]="checking()" (click)="check.emit()">I've paid — check now</button>
          <span class="sep">·</span>
          <button type="button" class="link" (click)="copy()">{{ copied() ? 'Copied' : 'Copy KHQR' }}</button>
        </div>
      }

      <p class="fine"><ui-icon name="lock" [size]="11" /> Scan with ABA, ACLEDA, Wing or any KHQR banking app. Confirmed automatically.</p>
    </div>
  `,
  styles: [
    `
      .pay-card {
        width: min(100%, 400px);
        margin: 0 auto;
        padding: 28px 28px 22px;
        background: var(--color-surface, #fff);
        border: 1px solid var(--color-border);
        border-radius: 20px;
        box-shadow: var(--shadow-sm);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .eyebrow {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--color-muted);
        margin: 0;
      }
      .amount {
        font-size: 40px;
        font-weight: 650;
        letter-spacing: -0.03em;
        line-height: 1.1;
        margin: 6px 0 2px;
        color: var(--color-text);
        font-variant-numeric: tabular-nums;
      }
      .amount span {
        font-size: 14px;
        font-weight: 500;
        color: var(--color-muted);
        letter-spacing: 0;
      }
      .caption {
        font-size: 13.5px;
        color: var(--color-muted);
        margin: 0 0 20px;
      }
      .qr {
        position: relative;
        width: 100%;
        max-width: 260px;
        aspect-ratio: 1;
        padding: 10px;
        background: #fff;
        border: 1px solid var(--color-border);
        border-radius: 14px;
      }
      .qr img {
        width: 100%;
        height: 100%;
        display: block;
        /* The PNG from ABA is the payable artefact — never let a theme or a
           container filter alter its contrast, or a scanner may miss it. */
        image-rendering: pixelated;
      }
      .qr.expired img {
        opacity: 0.08;
      }
      .veil {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-size: 14px;
      }
      .status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        margin: 16px 0 0;
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .status.muted {
        color: var(--color-muted);
        max-width: 300px;
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--color-success);
        animation: pulse 1.6s ease-in-out infinite;
      }
      .dot.busy {
        background: var(--color-gold);
      }
      @keyframes pulse {
        50% { opacity: 0.3; }
      }
      @media (prefers-reduced-motion: reduce) {
        .dot { animation: none; }
      }
      .sep {
        color: var(--color-border-strong);
      }
      .timer {
        font-variant-numeric: tabular-nums;
        color: var(--color-muted);
      }
      .note {
        margin: 10px 0 0;
        font-size: 12.5px;
        color: var(--color-muted);
        max-width: 320px;
      }
      .btn-block {
        width: 100%;
        margin-top: 20px;
        justify-content: center;
      }
      .links {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 14px;
        font-size: 13px;
      }
      .link {
        border: 0;
        background: none;
        padding: 0;
        font: inherit;
        color: var(--color-text-secondary);
        cursor: pointer;
        text-decoration: underline;
        text-decoration-color: var(--color-border-strong);
        text-underline-offset: 3px;
      }
      .link:hover:not(:disabled) {
        color: var(--color-accent);
      }
      .link:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .fine {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 20px 0 0;
        padding-top: 16px;
        border-top: 1px solid var(--color-border);
        width: 100%;
        justify-content: center;
        font-size: 11.5px;
        color: var(--color-muted);
      }
    `,
  ],
})
export class PaywayQrComponent {
  readonly qr = input.required<ApiPaywayQr>();
  /** Small heading above the amount, e.g. "Pay KhmerCraft". */
  readonly eyebrow = input<string>('Pay with KHQR');
  /** One line under the amount: what this pays for. */
  readonly caption = input<string>('');
  /** What this QR pays for, for the image's alt text. */
  readonly label = input<string>('this payment');
  /** Shown in place of the status once the QR has expired. */
  readonly expiredNote = input<string>('Nothing was charged. Get a new QR to try again.');
  /** Ticks once a second from the parent, which owns the clock. */
  readonly now = input.required<number>();
  readonly checking = input<boolean>(false);
  readonly checkError = input<string | null>(null);

  readonly renew = output<void>();
  readonly check = output<void>();

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
