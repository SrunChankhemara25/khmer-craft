import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminService } from './admin-data.service';
import { IconComponent } from './ui/icon.component';
import { ConfirmComponent } from './ui/confirm.component';

@Component({
  standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ConfirmComponent],
  template: `
    <div class="admin">
      @if (sidebarOpen()) { <button class="sidebar-back" aria-label="Close navigation" (click)="sidebarOpen.set(false)"></button> }
      <aside class="sidebar" [class.open]="sidebarOpen()" [class.collapsed]="sidebarCollapsed()">
        <div class="brand"><span class="logo"><kc-icon name="tag" [size]="14"></kc-icon></span><span class="brand-txt">KhmerCraft</span><small>ADMIN</small></div>
        @for (g of nav; track g.label) {
          <div class="nav-group">
            <div class="nav-label-row">
              <div class="nav-label">{{g.label}}</div>
              @if (g.label === 'Overview') {
                <button class="sidebar-toggle" [attr.aria-label]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
                  [attr.data-tip]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'" (click)="toggleSidebar()">
                  <kc-icon [name]="sidebarCollapsed() ? 'sidebar-expand' : 'sidebar-collapse'" [size]="18"></kc-icon>
                </button>
              }
            </div>
            <nav class="nav">
              @for (i of g.items; track i.path) {
                <a [routerLink]="i.path" routerLinkActive="active" (click)="sidebarOpen.set(false)">
                  <kc-icon [name]="i.icon" [size]="sidebarCollapsed() ? 19 : 15"></kc-icon><span class="txt">{{i.label}}</span>
                  @if (count(i.path); as c) { <span class="nav-count">{{c}}</span> }
                </a>
              }
            </nav>
          </div>
        }
        <div class="sidebar-foot">
          <div class="foot-user">
            <span class="avatar">AD</span>
            <div style="flex:1;min-width:0"><div style="font-weight:600">Admin</div><div class="cell-sub">Administrator</div></div>
            <button class="icon-btn" aria-label="Sign out" data-tip="Sign out" (click)="logoutOpen.set(true)"><kc-icon name="logout" [size]="14"></kc-icon></button>
          </div>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn menu-toggle" [attr.aria-label]="sidebarOpen() ? 'Close navigation' : 'Open navigation'"
            [attr.data-tip]="sidebarOpen() ? 'Close navigation' : 'Open navigation'"
            [attr.aria-expanded]="sidebarOpen()" (click)="sidebarOpen.set(!sidebarOpen())">
            <kc-icon [name]="sidebarOpen() ? 'sidebar-collapse' : 'sidebar-expand'" [size]="18"></kc-icon>
          </button>
          <div class="search-wrap">
            <div class="search-box"><kc-icon name="search" [size]="14"></kc-icon>
              <input placeholder="Search buyers, sellers, products, orders…" (input)="q.set($any($event.target).value)" (blur)="clearSoon()"/>
            </div>
            @if (results().length) {
              <div class="results">
                @for (r of results(); track r.label) {
                  <div class="result" (mousedown)="go(r)">
                    <span class="thumb">{{r.label[0]}}</span>{{r.label}}<span class="kind">{{r.kind}}</span>
                  </div>
                }
              </div>
            }
          </div>
          <span class="spacer"></span>
          <a class="icon-btn" aria-label="Notifications" routerLink="/admin/notifications"><kc-icon name="bell" [size]="15"></kc-icon>@if (data.notices().length) {<span class="dot"></span>}</a>
          <div class="who"><span class="avatar">AD</span>Admin</div>
        </header>
        <div class="content"><router-outlet></router-outlet></div>
      </div>
      @if (data.toastMsg(); as t) { <div class="toast">{{t}}</div> }
      @if (logoutOpen()) {
        <kc-confirm title="Sign out of Admin?" message="You will need to sign in again to return to the Admin workspace."
          confirmLabel="Sign out" (confirm)="logout()" (cancel)="logoutOpen.set(false)"></kc-confirm>
      }
    </div>`,
})
export class AdminLayoutComponent {
  data = inject(AdminService); router = inject(Router);
  q = signal('');
  sidebarOpen = signal(false);
  sidebarCollapsed = signal(false);
  logoutOpen = signal(false);
  constructor() {
    try { this.sidebarCollapsed.set(localStorage.getItem('khmercraft.admin.sidebar') === '1'); } catch { /* browser storage is optional */ }
  }
  toggleSidebar() {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    try { localStorage.setItem('khmercraft.admin.sidebar', next ? '1' : '0'); } catch { /* browser storage is optional */ }
  }
  nav = [
    { label: 'Overview', items: [{ path: '/admin/dashboard', icon: 'grid', label: 'Dashboard' }] },
    { label: 'User Management', items: [{ path: '/admin/buyers', icon: 'users', label: 'Buyers' }, { path: '/admin/sellers', icon: 'store', label: 'Sellers' }] },
    { label: 'Marketplace', items: [{ path: '/admin/products', icon: 'box', label: 'Products' }, { path: '/admin/categories', icon: 'tag', label: 'Categories' }, { path: '/admin/reviews', icon: 'star', label: 'Reviews' }] },
    { label: 'Channels', items: [{ path: '/admin/stores', icon: 'store', label: 'Stores' }, { path: '/admin/websites', icon: 'globe', label: 'Storefront Websites' }, { path: '/admin/pos', icon: 'terminal', label: 'POS Operations' }] },
    { label: 'Finance', items: [{ path: '/admin/payments', icon: 'card', label: 'Payments' }, { path: '/admin/transactions', icon: 'swap', label: 'Transactions' }, { path: '/admin/payouts', icon: 'wallet', label: 'Seller Payouts' }] },
    { label: 'Commercial', items: [{ path: '/admin/promotions', icon: 'megaphone', label: 'Promotions & Ads' }, { path: '/admin/analytics', icon: 'chart', label: 'Analytics' }] },
    { label: 'Monitoring', items: [{ path: '/admin/reports', icon: 'flag', label: 'Reports' }, { path: '/admin/complaints', icon: 'message', label: 'Complaints' }, { path: '/admin/activity-logs', icon: 'pulse', label: 'Activity Logs' }] },
    { label: 'System', items: [{ path: '/admin/notifications', icon: 'bell', label: 'Notifications' }, { path: '/admin/settings', icon: 'sliders', label: 'Settings' }] },
  ];
  count(path: string): number | null {
    const d = this.data;
    const m: Record<string, number> = {
      '/admin/sellers': d.sellers().filter(s => s.status === 'pending').length,
      '/admin/products': d.products().filter(p => p.status === 'pending').length,
      '/admin/reports': d.reports().filter(r => r.status === 'open').length,
      '/admin/complaints': d.complaints().filter(c => c.status === 'open').length,
    };
    return m[path] || null;
  }
  results = computed(() => {
    const s = this.q().toLowerCase(); if (s.length < 2) return [];
    const d = this.data; const out: { kind: string; label: string; path: string }[] = [];
    d.buyers().forEach(b => b.name.toLowerCase().includes(s) && out.push({ kind: 'Buyer', label: b.name, path: '/admin/buyers' }));
    d.sellers().forEach(x => x.store.toLowerCase().includes(s) && out.push({ kind: 'Seller', label: x.store, path: '/admin/sellers' }));
    d.products().forEach(p => p.name.toLowerCase().includes(s) && out.push({ kind: 'Product', label: p.name, path: '/admin/products' }));
    return out.slice(0, 7);
  });
  go(r: { label: string; path: string }) { this.router.navigate([r.path], { queryParams: { q: r.label } }); this.q.set(''); }
  clearSoon() { setTimeout(() => this.q.set(''), 150); }
  logout() { this.logoutOpen.set(false); this.data.log('Admin signed out', 'active'); this.router.navigate(['/']); }
}
