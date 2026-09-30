import { Component, computed, input, output, signal } from '@angular/core';
import { IconComponent } from './icon.component';

interface DayCell { iso: string; day: number; current: boolean }

@Component({
  selector: 'kc-date-range', standalone: true, imports: [IconComponent],
  template: `
    <div class="range-picker">
      <button class="range-trigger" type="button" [class.has-value]="!!start() || !!end()" (click)="toggle()">
        <kc-icon name="clock" [size]="15"></kc-icon>
        <span>{{summary()}}</span>
        <kc-icon name="chevrons-right" [size]="13"></kc-icon>
      </button>
      @if (open()) {
        <button class="range-backdrop" type="button" aria-label="Close date picker" (click)="cancel()"></button>
        <div class="range-popover" role="dialog" aria-label="Select date range">
          <div class="range-head">
            <button class="calendar-nav" type="button" aria-label="Previous month" (click)="shift(-1)"><kc-icon name="chevrons-left" [size]="16"></kc-icon></button>
            <strong>{{monthLabel()}}</strong>
            <button class="calendar-nav" type="button" aria-label="Next month" (click)="shift(1)"><kc-icon name="chevrons-right" [size]="16"></kc-icon></button>
          </div>
          <div class="weekday-row">@for (day of weekdays; track day) { <span>{{day}}</span> }</div>
          <div class="calendar-grid">
            @for (cell of days(); track cell.iso) {
              <button type="button" class="day" [class.muted-day]="!cell.current" [class.selected]="isSelected(cell.iso)" [class.in-range]="isInRange(cell.iso)" [class.range-start]="cell.iso === draftStart()" [class.range-end]="cell.iso === draftEnd()" (click)="pick(cell.iso)">{{cell.day}}</button>
            }
          </div>
          <div class="range-footer"><button class="range-cancel" type="button" (click)="cancel()">Cancel</button><button class="range-apply" type="button" [disabled]="!draftStart() || !draftEnd()" (click)="applyRange()">Apply</button></div>
        </div>
      }
    </div>`,
  styles: [`
    :host{display:block;position:relative}
    .range-trigger{width:100%;min-height:38px;display:flex;align-items:center;gap:9px;padding:8px 11px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--muted);font:inherit;text-align:left;cursor:pointer;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}
    .range-trigger kc-icon{flex-shrink:0}
    .range-trigger:hover,.range-trigger:focus-visible{border-color:var(--line-2);background:var(--gray)}
    .range-trigger.has-value{color:var(--ink)}
    .range-trigger span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .range-backdrop{display:none}
    .range-popover{position:relative;z-index:2;width:min(380px,100%);margin-top:12px;padding:20px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:0 12px 32px rgb(20 26 35 / .12);animation:calendar-rise .18s cubic-bezier(.16,1,.3,1)}
    .range-head{display:grid;grid-template-columns:34px 1fr 34px;align-items:center;gap:8px;margin-bottom:18px;text-align:center;font-size:14px}
    .calendar-nav{width:32px;height:32px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;color:var(--muted);cursor:pointer;transition:background .16s ease,color .16s ease}
    .calendar-nav:hover{background:var(--gray);color:var(--ink)}
    .weekday-row,.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);text-align:center}
    .weekday-row{margin-bottom:7px;color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
    .day{position:relative;z-index:1;width:38px;height:38px;margin:2px auto;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;color:var(--ink);font:500 12.5px var(--font);cursor:pointer;transition:color .16s ease,background .16s ease,transform .16s ease}
    .day:hover{background:var(--accent-050);color:var(--accent);transform:scale(1.05)}
    .muted-day{color:#b8bdc5}
    .in-range:before{content:'';position:absolute;z-index:-1;left:-3px;right:-3px;height:30px;background:var(--accent-050)}
    .range-start:before{left:50%;border-radius:14px 0 0 14px}
    .range-end:before{right:50%;border-radius:0 14px 14px 0}
    .selected{background:var(--accent);color:#fff;box-shadow:0 4px 10px rgb(138 30 44 / .22)}
    .selected:hover{background:var(--accent-2);color:#fff}
    .range-footer{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
    .range-cancel,.range-apply{min-height:36px;border:0;border-radius:18px;font:600 12px var(--font);cursor:pointer;transition:background .16s ease,transform .16s ease}
    .range-cancel{background:var(--gray);color:var(--muted)}
    .range-apply{background:var(--accent-050);color:var(--accent)}
    .range-cancel:hover,.range-apply:hover:not(:disabled){transform:translateY(-1px)}
    .range-apply:disabled{opacity:.45;cursor:not-allowed}
    @keyframes calendar-rise{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
    @media (max-width:480px){.range-popover{width:100%;padding:16px}}
  `],
})
export class DateRangePickerComponent {
  start = input(''); end = input(''); apply = output<{ start: string; end: string }>();
  open = signal(false); draftStart = signal(''); draftEnd = signal(''); cursor = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  monthLabel = computed(() => this.cursor().toLocaleString('en', { month: 'long', year: 'numeric' }));
  days = computed<DayCell[]>(() => {
    const month = this.cursor(); const first = new Date(month.getFullYear(), month.getMonth(), 1); const offset = (first.getDay() + 6) % 7;
    const out: DayCell[] = []; const start = new Date(month.getFullYear(), month.getMonth(), 1 - offset);
    for (let i = 0; i < 42; i++) { const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i); out.push({ iso: this.iso(d), day: d.getDate(), current: d.getMonth() === month.getMonth() }); }
    return out;
  });
  summary = computed(() => this.start() && this.end() ? `${this.display(this.start())} - ${this.display(this.end())}` : this.start() ? `${this.display(this.start())} - Select end date` : 'Select campaign dates');
  shift(amount: number) { const d = this.cursor(); this.cursor.set(new Date(d.getFullYear(), d.getMonth() + amount, 1)); }
  toggle() {
    const next = !this.open();
    if (next) {
      this.draftStart.set(this.start()); this.draftEnd.set(this.end());
      if (this.start()) { const [y, m] = this.start().split('-').map(Number); this.cursor.set(new Date(y, m - 1, 1)); }
    }
    this.open.set(next);
  }
  pick(iso: string) { if (!this.draftStart() || this.draftEnd() || iso < this.draftStart()) { this.draftStart.set(iso); this.draftEnd.set(''); } else this.draftEnd.set(iso); }
  isSelected(iso: string) { return iso === this.draftStart() || iso === this.draftEnd(); }
  isInRange(iso: string) { return !!this.draftStart() && !!this.draftEnd() && iso >= this.draftStart() && iso <= this.draftEnd(); }
  cancel() { this.open.set(false); this.draftStart.set(this.start()); this.draftEnd.set(this.end()); }
  applyRange() { if (!this.draftStart() || !this.draftEnd()) return; this.apply.emit({ start: this.draftStart(), end: this.draftEnd() }); this.open.set(false); }
  private iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  private display(value: string) { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }); }
}
