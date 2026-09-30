import { Component, input, output, signal } from '@angular/core';

/**
 * Confirmation dialog for destructive / sensitive actions.
 * When requireReason is true the action cannot be confirmed until a written
 * reason (≥ 5 chars) is provided — the reason is emitted with the confirm
 * event so callers can store it in the audit log.
 */
@Component({
  selector: 'kc-confirm',
  standalone: true,
  imports: [],
  host: { '(document:keydown.escape)': 'cancel.emit()' },
  template: `
  <div class="modal-back" (click)="cancel.emit()">
    <div class="modal" (click)="$event.stopPropagation()">
      <h3>{{title()}}</h3>
      <p>{{message()}}</p>
      @if (requireReason()) {
        <div class="form-row">
          <label>Reason <span class="req">*</span></label>
          <textarea class="input reason" rows="3"
            placeholder="Why is this action being taken? It is stored in the audit log."
            [value]="reason()" (input)="reason.set($any($event.target).value)"></textarea>
          @if (showReasonError()) { <small class="reason-error">A reason of at least 5 characters is required.</small> }
        </div>
      }
      <div class="modal-actions">
        <button class="btn" (click)="cancel.emit()">Cancel</button>
        <button class="btn btn-primary" (click)="tryConfirm()">{{confirmLabel()}}</button>
      </div>
    </div>
  </div>`,
  styles: [`
    .req{color:var(--red)}
    .reason{width:100%;resize:vertical;font:inherit;padding:8px 10px}
    .reason-error{color:var(--red);font-size:11.5px;font-weight:600;margin-top:4px;display:block}
  `],
})
export class ConfirmComponent {
  title = input.required<string>();
  message = input.required<string>();
  confirmLabel = input('Confirm');
  requireReason = input(false);
  /** Emits the written reason ('' when no reason is required). */
  confirm = output<string>();
  cancel = output();
  protected readonly reason = signal('');
  protected readonly showReasonError = signal(false);

  protected tryConfirm(): void {
    if (this.requireReason() && this.reason().trim().length < 5) {
      this.showReasonError.set(true);
      return;
    }
    const written = this.reason().trim();
    this.reason.set('');
    this.showReasonError.set(false);
    this.confirm.emit(written);
  }
}