import { Component, booleanAttribute, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

/**
 * One shared loading / error / empty block so every page handles states
 * identically. `compact` uses a boolean transform so it can be written as a
 * plain attribute (<kc-state compact>) or bound ([compact]="expr").
 */
@Component({
  selector: 'kc-state',
  standalone: true,
  imports: [IconComponent],
  template: `
  <div class="state" [class.compact]="compact()">
    @if (mode() === 'loading') {
      <span class="spin"><kc-icon name="refresh" [size]="22"></kc-icon></span>
      <p>{{ message() || 'Loading…' }}</p>
    } @else if (mode() === 'error') {
      <kc-icon name="alert" [size]="26"></kc-icon>
      <p>{{ message() || 'Something went wrong.' }}</p>
      <button class="btn btn-sm" (click)="retry.emit()">Try again</button>
    } @else {
      <kc-icon name="box" [size]="26"></kc-icon>
      <p>{{ message() || 'Nothing here yet.' }}</p>
    }
  </div>`,
  styles: [`
    .state{display:flex;flex-direction:column;align-items:center;gap:10px;padding:44px 20px;text-align:center;color:var(--muted)}
    .state.compact{padding:22px}
    .state p{margin:0;font-size:13px;max-width:420px;line-height:1.5}
    .spin{display:inline-flex;animation:kc-spin .9s linear infinite;color:var(--accent)}
    @keyframes kc-spin{to{transform:rotate(360deg)}}
    @media (prefers-reduced-motion: reduce){ .spin{animation:none} }
  `],
})
export class StateComponent {
  mode = input<'loading' | 'error' | 'empty'>('loading');
  message = input('');
  compact = input(false, { transform: booleanAttribute });
  retry = output();
}