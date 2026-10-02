import { DestroyRef, computed, inject, signal } from '@angular/core';
import { ApiPaywayQr } from '../api/api.models';

/**
 * Polling cadence. Fast while the payer is most likely mid-payment, then
 * slower so a QR left open in a tab for its full lifetime cannot eat the
 * API's own rate limit (300 requests / 15 min) on its own: this works out
 * around 136 requests over 30 minutes instead of 360 at a flat 5s.
 */
const POLL_FAST_MS = 5_000;
const POLL_SLOW_MS = 15_000;
const POLL_FAST_WINDOW_MS = 2 * 60_000;

export interface PaymentCheck {
  paid: boolean;
  failed: boolean;
}

export interface PaymentPollerConfig<T extends ApiPaywayQr> {
  /** Opens a transaction and returns the QR to show. */
  open: () => Promise<T>;
  /** Asks the server (which asks ABA) whether it cleared. */
  check: () => Promise<PaymentCheck>;
  onPaid: () => void | Promise<void>;
  /** Called when `open` reports the thing is already paid for. */
  onAlreadySettled?: () => void | Promise<void>;
  /** Non-empty when there is nothing to pay for, e.g. a missing route param. */
  missingTarget?: string;
  pendingMessage: string;
  failedMessage: string;
}

/**
 * Drives a KHQR payment: opens the transaction, shows a countdown, polls for
 * the result and hands off when it clears.
 *
 * Shared by the order and seller-plan payment pages, because the interesting
 * parts — the back-off schedule, "an expired QR stops polling", "a failed
 * background poll is noise but a failed button press is not" — are payment
 * behaviour, not page behaviour, and two copies would drift.
 *
 * Constructed as a field initialiser so `inject(DestroyRef)` runs inside the
 * component's injection context.
 */
export class PaymentPoller<T extends ApiPaywayQr> {
  readonly session = signal<T | null>(null);
  readonly loading = signal(true);
  readonly checking = signal(false);
  /** Stops the flow entirely — no QR to show. */
  readonly fatal = signal('');
  /** A failed status poll, which is recoverable: the QR is still payable. */
  readonly checkError = signal('');
  readonly now = signal(Date.now());

  readonly expired = computed(() => {
    const qr = this.session();
    return qr ? this.now() >= Date.parse(qr.expiresAt) : false;
  });

  private startedAt = Date.now();
  private pollTimer?: ReturnType<typeof setTimeout>;
  private tickTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly config: PaymentPollerConfig<T>) {
    if (config.missingTarget) {
      this.fatal.set(config.missingTarget);
      this.loading.set(false);
    } else {
      void this.start();
    }

    // Drives the countdown only; the payment result never comes from a clock.
    this.tickTimer = setInterval(() => this.now.set(Date.now()), 1000);

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.pollTimer);
      clearInterval(this.tickTimer);
    });
  }

  /** Opens a fresh transaction. Also the "try again" and "new QR" path. */
  start = async (): Promise<void> => {
    clearTimeout(this.pollTimer);
    this.loading.set(true);
    this.fatal.set('');
    this.checkError.set('');

    try {
      this.session.set(await this.config.open());
      this.startedAt = Date.now();
      this.now.set(Date.now());
      this.schedulePoll();
    } catch (error: unknown) {
      if (
        this.errorCode(error) === 'ALREADY_PAID' &&
        this.config.onAlreadySettled
      ) {
        await this.config.onAlreadySettled();
        return;
      }
      this.fatal.set(this.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  };

  checkNow = async (): Promise<void> => {
    await this.check(true);
  };

  private schedulePoll(): void {
    clearTimeout(this.pollTimer);
    if (this.expired()) {
      return;
    }
    const elapsed = Date.now() - this.startedAt;
    const delay = elapsed < POLL_FAST_WINDOW_MS ? POLL_FAST_MS : POLL_SLOW_MS;
    this.pollTimer = setTimeout(() => void this.poll(), delay);
  }

  private async poll(): Promise<void> {
    await this.check(false);
    this.schedulePoll();
  }

  /**
   * The single place the payment result is read. `manual` only changes how
   * loudly a failure is reported — a background poll that fails is noise the
   * next poll will clear, while a button press the payer just made deserves
   * an answer.
   */
  private async check(manual: boolean): Promise<void> {
    if (this.checking()) {
      return;
    }
    this.checking.set(true);
    try {
      const result = await this.config.check();
      this.checkError.set('');

      if (result.paid) {
        clearTimeout(this.pollTimer);
        await this.config.onPaid();
        return;
      }

      if (manual) {
        this.checkError.set(
          result.failed ? this.config.failedMessage : this.config.pendingMessage,
        );
      }
    } catch (error: unknown) {
      if (manual) {
        this.checkError.set(this.errorMessage(error));
      }
    } finally {
      this.checking.set(false);
    }
  }

  private errorCode(error: unknown): string {
    const body = (error as { error?: { error?: { code?: string } } })?.error;
    return body?.error?.code ?? '';
  }

  private errorMessage(error: unknown): string {
    const body = (error as { error?: { error?: { message?: string } } })?.error;
    return (
      body?.error?.message ??
      'Could not reach the payment service. Check your connection and try again.'
    );
  }
}
