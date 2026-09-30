import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../admin-api.service';
import { IconComponent } from './icon.component';

/**
 * Dashboard honesty strip: proves whether the live API is reachable and shows
 * real marketplace counts. Never shows a number it could not fetch.
 */
@Component({
  selector: 'kc-live-strip',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
  <div class="strip" [class.down]="state() === 'error'">
    @if (state() === 'loading') {
      <span class="spin"><kc-icon name="refresh" [size]="14"></kc-icon></span>
      Checking live marketplace API…
    } @else if (state() === 'error') {
      <kc-icon name="alert" [size]="14"></kc-icon>
      Marketplace API unreachable — live counts unavailable.
      <button class="link" (click)="load()">Retry</button>
    } @else {
      <kc-icon name="pulse" [size]="14"></kc-icon>
      Live marketplace:
      <a routerLink="/admin/products"><b>{{ products() }}</b> products</a>
      <span class="sep">·</span>
      <a routerLink="/admin/sellers"><b>{{ stores() }}</b> stores</a>
      <span class="tag">read from API</span>
    }
  </div>`,
  styles: [`
    .strip{display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:9px 14px;
      border:1px solid var(--line);border-radius:10px;background:var(--surface);
      color:var(--muted);font-size:12px;font-weight:500;animation:rise .3s ease both}
    .strip a{color:var(--ink);text-decoration:none;font-weight:600}
    .strip a:hover{color:var(--accent);text-decoration:underline}
    .strip b{color:var(--accent)}
    .strip .sep{opacity:.5}
    .strip .tag{margin-left:auto;background:var(--green-050);color:var(--green);border-radius:99px;padding:2px 8px;font-size:10.5px;font-weight:700}
    .strip.down{background:var(--red-050);border-color:transparent;color:var(--red)}
    .strip .link{border:0;background:none;color:var(--red);font:600 12px var(--font);cursor:pointer;text-decoration:underline;padding:0}
    .spin{display:inline-flex;animation:kc-spin .9s linear infinite;color:var(--accent)}
    @keyframes kc-spin{to{transform:rotate(360deg)}}
    @keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @media (prefers-reduced-motion: reduce){ .spin{animation:none} }
  `],
})
export class LiveStripComponent {
  private readonly api = inject(AdminApiService);
  state = signal<'loading' | 'ok' | 'error'>('loading');
  products = signal(0);
  stores = signal(0);

  constructor() { this.load(); }

  load() {
    this.state.set('loading');
    this.api.products({ limit: 1 }).subscribe({
      next: (p) => this.api.stores(1, 1).subscribe({
        next: (s) => { this.products.set(p.total); this.stores.set(s.pagination.total); this.state.set('ok'); },
        error: () => this.state.set('error'),
      }),
      error: () => this.state.set('error'),
    });
  }
}