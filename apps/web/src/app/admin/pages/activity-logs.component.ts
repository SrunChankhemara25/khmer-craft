import { Component, computed, inject, signal } from '@angular/core';
import { AdminService } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { dstr } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><span class="eyebrow">System · Audit</span><h1 class="page-title">Activity log</h1><p class="page-sub">Audit trail of admin and system events, newest first · stored on this device until the admin API exists</p></div></div>
    <div class="toolbar">
      <select class="input" [value]="kind()" (change)="kind.set($any($event.target).value)">
        <option value="all">All events</option><option value="active">Registrations</option>
        <option value="approved">Approvals</option><option value="suspended">Suspensions</option>
        <option value="failed">Failures</option><option value="resolved">Resolutions</option>
      </select>
      <input class="input input-search" placeholder="Search action, actor, target or reason" [value]="q()" (input)="q.set($any($event.target).value)"/>
      <span class="grow"></span>
      <span class="muted">{{rows().length}} entries</span>
    </div>
    <div class="card card-pad">
      @for (l of rows(); track l.id) {
        <div class="list-item"><span class="pulse-dot"></span>
          <div style="flex:1">
            <div>{{l.action}}</div>
            @if (l.target) { <div class="cell-sub">Target: {{l.target}}</div> }
            @if (l.reason) { <div class="cell-sub" style="font-style:italic">Reason: {{l.reason}}</div> }
            <div class="cell-sub">{{l.actor}} · {{dstr(l.date)}}</div>
          </div>
          <kc-badge [value]="l.kind"></kc-badge>
        </div>
      } @empty { <div class="empty">No log entries match this view.</div> }
    </div>
  } @else { <div class="skel" style="height:300px"></div> }`,
})
export class ActivityLogsComponent {
  d = inject(AdminService);
  kind = signal('all');
  q = signal('');
  dstr = dstr;
  rows = computed(() => {
    const needle = this.q().trim().toLowerCase();
    return this.d.logs().filter(l =>
      (this.kind() === 'all' || l.kind === this.kind()) &&
      (!needle || [l.action, l.actor, l.target ?? '', l.reason ?? ''].join(' ').toLowerCase().includes(needle)));
  });
}
