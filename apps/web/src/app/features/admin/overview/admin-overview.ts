import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../../core/catalog/catalog.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SellerApplication, SellerService } from '../../../core/api/seller.service';
import { NavbarComponent } from '../../../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../../../components/shared/layout/footer/footer.component';
import { IconComponent } from '../../../components/shared/ui/icon/icon.component';

/**
 * Marketplace administration.
 *
 * Deliberately small: it shows what the API can actually answer for today.
 * The only ADMIN-gated endpoints are the seller application queue, so that is
 * the one action here; the figures beside it come from the same public
 * catalogue the storefront reads. Nothing on this page is estimated — if a
 * number cannot be sourced from a real endpoint it is not shown.
 */
@Component({
  selector: 'app-admin-overview',
  imports: [RouterLink, NavbarComponent, FooterComponent, IconComponent],
  template: `
    <app-navbar />

    <main class="container admin">
      <header class="admin-head">
        <span class="eyebrow">Administration</span>
        <h1>Marketplace overview</h1>
        <p>Signed in as {{ auth.user()?.email }}</p>
      </header>

      <section class="stat-row" aria-label="Marketplace totals">
        <div class="stat">
          <span class="stat-value">{{ storeCount() }}</span>
          <span class="stat-label"><ui-icon name="store" [size]="13" /> Stores</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ productCount() }}</span>
          <span class="stat-label"><ui-icon name="box" [size]="13" /> Live products</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ pendingCount() }}</span>
          <span class="stat-label"><ui-icon name="clock" [size]="13" /> Applications to review</span>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Seller applications</h2>
          @if (loading()) { <span class="muted">Loading…</span> }
        </div>

        @if (error()) {
          <div class="notice error" role="alert">{{ error() }}</div>
        } @else if (!loading() && !applications().length) {
          <div class="empty">
            <ui-icon name="check-circle" [size]="26" />
            <p>No applications waiting. New requests to open a store appear here.</p>
          </div>
        } @else {
          <ul class="app-list">
            @for (application of applications(); track application.id) {
              <li>
                <div>
                  <strong>{{ application.storeName }}</strong>
                  <span class="muted">{{ application.email || application.contactName }}</span>
                </div>
                <span class="badge">{{ application.status }}</span>
              </li>
            }
          </ul>
        }
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Stores</h2>
          <a class="see-all" routerLink="/stores">View storefronts <ui-icon name="arrow-right" [size]="13" /></a>
        </div>
        <ul class="store-list">
          @for (store of stores(); track store.id) {
            <li>
              <a [routerLink]="['/stores', store.id]">{{ store.name }}</a>
              <span class="muted">{{ store.location || '—' }}</span>
            </li>
          }
        </ul>
      </section>
    </main>

    <app-footer />
  `,
  styles: [`
    .admin { padding-block: clamp(20px, 3vw, 34px) 48px; }
    .admin-head { margin-bottom: 22px; }
    .eyebrow { color: var(--color-accent); font-size: 10.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .admin-head h1 { font-size: clamp(24px, 3vw, 32px); margin: 6px 0 4px; }
    .admin-head p { color: var(--color-muted); font-size: 13px; }
    .stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 26px; }
    .stat { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); padding: 16px 18px; }
    .stat-value { display: block; font-family: var(--font-heading); font-size: 30px; line-height: 1; color: var(--color-text); }
    .stat-label { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; color: var(--color-muted); font-size: 12px; }
    .panel { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); padding: 18px; margin-bottom: 18px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .panel-head h2 { font-size: 17px; }
    .see-all { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: var(--color-text-secondary); }
    .muted { color: var(--color-muted); font-size: 12.5px; }
    .empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 26px 12px; color: var(--color-muted); text-align: center; }
    .empty ui-icon { color: var(--color-success); }
    .app-list, .store-list { list-style: none; margin: 0; padding: 0; }
    .app-list li, .store-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid var(--color-border); }
    .app-list li:first-child, .store-list li:first-child { border-top: 0; }
    .app-list strong { display: block; font-size: 13.5px; }
    .badge { padding: 3px 9px; border-radius: var(--radius-full); background: var(--color-bg-alt); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
  `],
})
export class AdminOverviewComponent {
  protected readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  private readonly sellers = inject(SellerService);

  protected readonly applications = signal<SellerApplication[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly stores = computed(() => this.catalog.allStores());
  protected readonly storeCount = computed(() => this.stores().length);
  protected readonly productCount = computed(() => this.catalog.allProducts().length);
  protected readonly pendingCount = computed(() => this.applications().length);

  constructor() {
    this.sellers.listSellerApplications().subscribe({
      next: (applications) => {
        this.applications.set(applications ?? []);
        this.loading.set(false);
      },
      error: () => {
        // The endpoint is ADMIN-only; a 403 here means the session is not what
        // the guard thought it was, which is worth saying rather than showing
        // an empty queue that looks like "nothing to do".
        this.error.set('Could not load seller applications.');
        this.loading.set(false);
      },
    });
  }
}
