import { Component, input } from '@angular/core';

const GREEN = ['active', 'approved', 'completed', 'verified', 'resolved', 'visible', 'paid', 'available'];
const AMBER = ['pending', 'processing', 'investigating', 'refunded', 'refund requested', 'submitted', 'under review'];
const RED = ['suspended', 'rejected', 'failed', 'cancelled', 'hidden', 'open', 'deactivated', 'unavailable'];

@Component({ selector: 'kc-badge', standalone: true,
  template: `<span [class]="'badge t-' + tone">{{value()}}</span>` })
export class BadgeComponent {
  value = input.required<string>();
  get tone() { const v = this.value().toLowerCase();
    return GREEN.includes(v) ? 'green' : AMBER.includes(v) ? 'amber' : RED.includes(v) ? 'red' : 'gray'; }
}
