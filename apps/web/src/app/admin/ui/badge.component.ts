import { Component, input } from '@angular/core';

const GREEN = ['active', 'approved', 'completed', 'verified', 'resolved', 'visible', 'paid', 'available', 'paying', 'live'];
const AMBER = ['pending', 'processing', 'investigating', 'refunded', 'refund requested', 'submitted', 'under review', 'expiring', 'paused', 'pending approval', 'due'];
const RED = ['suspended', 'rejected', 'failed', 'cancelled', 'hidden', 'open', 'deactivated', 'unavailable', 'lapsed'];

@Component({ selector: 'kc-badge', standalone: true,
  template: `<span [class]="'badge t-' + tone">{{value()}}</span>` })
export class BadgeComponent {
  value = input.required<string>();
  get tone() { const v = this.value().toLowerCase();
    return GREEN.includes(v) ? 'green' : AMBER.includes(v) ? 'amber' : RED.includes(v) ? 'red' : 'gray'; }
}
