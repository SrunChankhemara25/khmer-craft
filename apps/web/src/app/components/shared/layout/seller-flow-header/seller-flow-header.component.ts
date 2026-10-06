import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../ui/icon/icon.component';

/**
 * A focused header for the store setup flow (details → payment → store
 * live), in place of the full site navbar: no category menu, search or cart
 * to wander off into halfway through paying.
 */
@Component({
  selector: 'app-seller-flow-header',
  imports: [RouterLink, IconComponent],
  template: `
    <header class="flow-header">
      <a class="brand" routerLink="/" aria-label="KhmerCraft Seller home">
        <span class="brand-mark"><ui-icon name="leaf" [size]="17" /></span>
        <span>KhmerCraft <small>Seller</small></span>
      </a>

      @if (step(); as current) {
        <ol class="flow-steps" aria-label="Store setup progress">
          @for (item of steps; track item.n) {
            <li [class.done]="current > item.n" [class.current]="current === item.n">
              <span class="dot">
                @if (current > item.n) { <ui-icon name="check" [size]="12" /> } @else { {{ item.n }} }
              </span>
              <span class="label">{{ item.label }}</span>
            </li>
          }
        </ol>
      } @else {
        <span></span>
      }

      <span class="secure"><ui-icon name="lock" [size]="13" /> Secure checkout</span>
    </header>
  `,
  styles: [`
    .flow-header {
      position: sticky; top: 0; z-index: 30;
      display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px;
      height: 68px; padding: 0 clamp(18px, 4vw, 64px);
      background: rgba(255, 253, 250, .94); border-bottom: 1px solid rgba(53, 43, 34, .1);
      backdrop-filter: blur(16px);
    }
    .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--color-text); text-decoration: none; font: 700 22px/1 Georgia, serif; }
    .brand small { color: var(--color-accent); font: 800 10px/1 var(--font-body); letter-spacing: .1em; text-transform: uppercase; }
    .brand-mark { width: 34px; height: 34px; display: grid; place-items: center; color: #fff; background: var(--color-accent); border-radius: 10px; }
    .flow-steps { display: flex; align-items: center; gap: 10px; margin: 0; padding: 0; list-style: none; }
    .flow-steps li { display: flex; align-items: center; gap: 7px; color: var(--color-muted); font-size: 12.5px; font-weight: 600; }
    .flow-steps li + li::before { content: ''; width: 28px; height: 1px; margin-right: 3px; background: var(--color-border-strong); }
    .dot { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--color-border-strong); font-size: 11px; }
    .current { color: var(--color-text); }
    .current .dot { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
    .done .dot { background: var(--color-success); border-color: var(--color-success); color: #fff; }
    .secure { justify-self: end; display: inline-flex; align-items: center; gap: 6px; color: var(--color-muted); font-size: 12.5px; }
    @media (max-width: 760px) {
      .flow-header { grid-template-columns: 1fr auto; }
      .flow-steps .label, .secure { display: none; }
      .brand { font-size: 19px; }
    }
  `],
})
export class SellerFlowHeaderComponent {
  /** 1 = store details, 2 = payment, 3 = store live; null hides the step bar (e.g. a plan renewal). */
  readonly step = input<1 | 2 | 3 | null>(null);

  protected readonly steps = [
    { n: 1, label: 'Store details' },
    { n: 2, label: 'Payment' },
    { n: 3, label: 'Store live' },
  ];
}
