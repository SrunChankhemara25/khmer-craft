import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import { API_URL } from '../../core/api/api.config';
import { KcIcon } from '../../components/shared/ui/kc-icon/kc-icon';
import { ShareDialogComponent, ShareItem } from '../../components/shared/share-dialog/share-dialog.component';
import { productShareUrl, storeShareUrl } from '../../core/share/share-links';
import { StoreCategoriesManagerComponent } from '../../features/seller/store-categories/store-categories-manager.component';
import { WarehousesManagerComponent } from '../../features/seller/warehouses/warehouses-manager.component';
import { SellerBillingComponent } from '../seller-billing.component';
import { PayoutMethod, PayoutSettings, PosKhqrSettings, SellerPayoutRecord, SellerPayoutSummary, SellerService, Warehouse, StoreCollectionDTO } from '../../core/api/seller.service';
import { AuthService } from '../../core/auth/auth.service';
import { CommerceApiService } from '../../core/api/commerce-api.service';
import { CatalogService } from '../../core/catalog/catalog.service';
import { OrderStatus } from '../../core/api/api.models';
import { cartErrorMessage } from '../../core/cart/cart.service';
import { SELLER_CATEGORY_OPTIONS, SELLER_LOCATION_OPTIONS } from '../../core/data/seller-form-options.data';
import { marketplaceUrl } from '../../core/portal/portal';

export type DashboardView =
  | 'dashboard'
  | 'products'
  | 'store-categories'
  | 'collections'
  | 'inventory'
  | 'warehouses'
  | 'orders'
  | 'pos'
  | 'customers'
  | 'reviews'
  | 'promotions'
  | 'advertisements'
  | 'storefront'
  | 'sales'
  | 'payments'
  | 'transactions'
  | 'analytics'
  | 'reports'
  | 'support'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'billing'
  | 'add';

export type PosSubArea =
  | 'checkout'
  | 'orders'
  | 'products'
  | 'customers'
  | 'registers'
  | 'shifts'
  | 'payments'
  | 'returns'
  | 'discounts'
  | 'reports'
  | 'settings';

type OrderStatusClass = 'pending' | 'shipped' | 'delivered';

interface SellerOrder {
  id: string;
  buyer: string;
  initials: string;
  color: string;
  product: string;
  qty: number;
  total: string;
  address: string;
  date: string;
  status: string;
  statusClass: OrderStatusClass;
  phone: string;
  note: string;
  paymentMethod: string;
  paymentStatus: string;
  items: {
    name: string;
    image: string | null;
    qty: number;
    price: number;
    subtotal: number;
  }[];
}

interface DashboardMetric {
  label: string;
  value: string;
  icon: string;
  note?: string;
  warn?: boolean;
  gold?: boolean;
}

@Component({
  selector: 'app-seller-dashboard',
  imports: [KcIcon, ShareDialogComponent, RouterLink, FormsModule, CurrencyPipe, DatePipe, StoreCategoriesManagerComponent, WarehousesManagerComponent, SellerBillingComponent],
  styles: [`
    /* ==========================================================
       KhmerCraft seller console - design tokens
       ========================================================== */
    :host {
      --brand-900: #0e3a28;
      --brand-800: #124a33;
      --brand-700: #176242;
      --brand-600: #1f7d55;
      --brand-100: #d9eee2;
      --brand-50:  #eff8f3;

      --ink-900: #14201b;
      --ink-700: #3b4943;
      --ink-500: #697871;
      --ink-400: #93a09a;
      --line:      #e2e8e5;
      --line-soft: #eef2f0;

      --surface: #fff;
      --canvas:  #f5f8f6;
      --raised:  #fbfcfb;

      --ok:     #1f7d55;  --ok-bg:     #e6f4ec;
      --warn:   #a9700f;  --warn-bg:   #fdf4e3;
      --danger: #b5372a;  --danger-bg: #fcece9;
      --info:   #2a6099;  --info-bg:   #eaf1f9;

      --r-sm: 7px;
      --r-md: 10px;
      --r-lg: 14px;
      --r-pill: 999px;

      --sh-sm: 0 1px 2px rgba(20, 32, 27, .05);
      --sh-md: 0 1px 3px rgba(20, 32, 27, .06), 0 6px 16px -8px rgba(20, 32, 27, .10);
      --sh-lg: 0 18px 48px -16px rgba(20, 32, 27, .28);

      --sidebar-w: 244px;
      --topbar-h: 64px;

      background: var(--canvas);
      color: var(--ink-700);
      display: block;
      min-height: 100vh;
      font-variant-numeric: tabular-nums;
      -webkit-font-smoothing: antialiased;
    }

    .portal { display: grid; grid-template-columns: var(--sidebar-w) 1fr; min-height: 100vh; }

    /* ============================ Grouped Sidebar ============================ */
    .sidebar {
      background: var(--brand-900);
      border-right: 0;
      color: #cfe3d8;
      display: flex;
      flex-direction: column;
      height: 100vh;
      min-height: 100vh;
      overflow-y: hidden;
      padding: 16px 0 12px;
      position: sticky;
      top: 0;
    }
    .sidebar-head { flex: none; padding: 0 18px 10px; border-bottom: 1px solid rgba(255,255,255,.07); }
    .logo {
      color: #fff; display: block; font-family: var(--font-heading, Georgia, serif);
      font-size: 20px; font-weight: 700; letter-spacing: -.02em; line-height: 1.1; margin: 0;
    }
    .portal-label {
      color: #7fae95; display: block; font-size: 10px; font-weight: 700;
      letter-spacing: .12em; margin-top: 3px; text-transform: uppercase;
    }
    .store-control { margin-top: 8px; }
    .store-control label { color: #8cbba2; display: block; font-size: 9.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
    .store-control select {
      appearance: none; -webkit-appearance: none; -moz-appearance: none;
      background: rgba(255,255,255,.08);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 14px;
      border: 1px solid rgba(255,255,255,.14); border-radius: var(--r-sm);
      box-sizing: border-box; color: #fff; cursor: pointer;
      font-size: 13px; font-weight: 600; height: 38px; min-height: 38px;
      margin-top: 4px; outline: none; padding: 0 34px 0 12px; width: 100%;
    }
    .store-control select::-ms-expand { display: none; }
    .store-control select option { background: var(--brand-900); color: #fff; }
    .new-store {
      background: none; border: 0; color: #9edcc0; cursor: pointer; font-size: 10.5px; font-weight: 600;
      margin-top: 3px; padding: 0; text-align: left;
    }
    .new-store:hover { text-decoration: underline; color: #fff; }

    .sidebar-nav-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 8px 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sidebar-nav-scroll::-webkit-scrollbar { width: 4px; }
    .sidebar-nav-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 4px; }

    .nav-group { display: flex; flex-direction: column; gap: 1px; }
    .nav-group-title {
      color: #7fae95; font-size: 9px; font-weight: 700; letter-spacing: .13em;
      padding: 3px 10px 2px; text-transform: uppercase; user-select: none;
    }
    .nav-item {
      align-items: center; background: none; border: 0; border-radius: var(--r-md);
      color: #b9d3c6; cursor: pointer; display: flex; font: inherit; font-size: 12.5px;
      font-weight: 550; gap: 9px; padding: 6px 10px; position: relative; text-align: left;
      transition: background .14s ease, color .14s ease; width: 100%;
    }
    .nav-item kc-icon { flex: none; opacity: .85; }
    .nav-item:hover { background: rgba(255, 255, 255, .08); color: #fff; }
    .nav-item.active { background: #fff; box-shadow: var(--sh-sm); color: var(--brand-900); font-weight: 700; }
    .nav-item.active kc-icon { opacity: 1; }

    .logout {
      align-items: center; background: none; border: 0; border-top: 1px solid rgba(255, 255, 255, .1);
      color: #e8a99f; cursor: pointer; display: flex; flex: none; font: inherit; font-size: 12px; font-weight: 650;
      gap: 8px; margin: 0 12px; padding: 10px 8px 2px; width: calc(100% - 24px);
    }
    .logout:hover { color: #ffc9c0; }

    /* ============================ topbar ============================ */
    .content { display: flex; flex-direction: column; min-width: 0; }
    .topbar {
      align-items: center; backdrop-filter: saturate(180%) blur(12px);
      background: rgba(255, 255, 255, .88); border-bottom: 1px solid var(--line);
      display: flex; gap: 16px; height: var(--topbar-h); padding: 0 24px;
      position: sticky; top: 0; z-index: 30;
    }
    .search {
      align-items: center; background: var(--canvas); border: 1px solid var(--line);
      border-radius: var(--r-md); display: flex; flex: 1; gap: 9px; height: 38px;
      max-width: 420px; padding: 0 12px;
      transition: background .15s ease, border-color .15s ease, box-shadow .15s ease;
    }
    .search:focus-within { background: var(--surface); border-color: var(--brand-600); box-shadow: 0 0 0 3px var(--brand-50); }
    .search kc-icon { color: var(--ink-400); flex: none; }
    .search input { background: none; border: 0; color: var(--ink-900); font: inherit; font-size: 13px; outline: none; width: 100%; }
    .search input::placeholder { color: var(--ink-400); }
    .top-actions { align-items: center; display: flex; gap: 14px; margin-left: auto; }
    .view-store {
      align-items: center; background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-md); color: var(--ink-700); cursor: pointer; display: inline-flex;
      font: inherit; font-size: 12.5px; font-weight: 650; gap: 7px; padding: 7px 12px;
      text-decoration: none; transition: border-color .15s ease, color .15s ease;
    }
    .view-store:hover { border-color: var(--brand-600); color: var(--brand-700); }
    .seller-mini { align-items: center; border-left: 1px solid var(--line); display: flex; gap: 10px; padding-left: 14px; }
    .seller-mini strong {
      color: var(--ink-900); display: block; font-size: 12.5px; font-weight: 700; line-height: 1.25;
      max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .seller-mini span { color: var(--ink-500); font-size: 11px; }
    .avatar {
      align-items: center; background: var(--brand-700); border-radius: 50%; color: #fff;
      display: flex; flex: none; font-size: 13px; font-weight: 700; height: 34px; justify-content: center; width: 34px;
      overflow: hidden;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }

    /* ======================= store cover & profile picture ======================= */
    .store-hero { margin-bottom: 20px; overflow: hidden; background: #fff; border: 1px solid var(--line); border-radius: 18px; }
    .store-hero-cover { position: relative; height: 180px; background: linear-gradient(120deg, #e3efe8, #cfe2d6 55%, #f0e6d6); }
    .store-hero-cover img { width: 100%; height: 100%; display: block; object-fit: cover; }
    .store-hero-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--ink-500); font-size: 13px; font-weight: 600; }
    .store-hero-body { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 16px; padding: 0 22px 18px; }
    .store-hero-logo { position: relative; z-index: 2; width: 92px; height: 92px; margin-top: -46px; flex: none; display: grid; place-items: center; overflow: hidden; color: #fff; background: var(--brand-700); border: 4px solid #fff; border-radius: 50%; font-size: 30px; font-weight: 800; box-shadow: 0 8px 20px rgba(20, 60, 40, .18); }
    .store-hero-logo img { width: 100%; height: 100%; object-fit: cover; }
    .store-hero-info { flex: 1; min-width: 200px; padding-bottom: 2px; }
    .store-hero-info h2 { margin: 0; color: var(--ink-900); font-family: var(--font-heading, Georgia, serif); font-size: 22px; }
    .store-hero-info p { margin: 4px 0 0; color: var(--ink-500); font-size: 13px; }
    .store-hero-actions { display: flex; flex-wrap: wrap; gap: 8px; }

    .brand-editor { margin-bottom: 16px; padding: 18px; }
    .brand-editor-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
    .brand-editor-head h2 { margin: 0; font-size: 15px; }
    .brand-editor-head p { margin: 4px 0 0; color: var(--ink-500); font-size: 12.5px; }
    .brand-cover { position: relative; height: 200px; overflow: hidden; background: linear-gradient(120deg, #e3efe8, #cfe2d6 55%, #f0e6d6); border: 1px dashed var(--line); border-radius: 14px; }
    .brand-cover img { width: 100%; height: 100%; display: block; object-fit: cover; }
    .brand-cover .btn { position: absolute; right: 12px; bottom: 12px; background: rgba(255,255,255,.94); }
    .brand-logo-row { display: flex; align-items: center; gap: 16px; padding: 0 16px; }
    .brand-logo { position: relative; z-index: 2; width: 104px; height: 104px; margin-top: -52px; flex: none; display: grid; place-items: center; overflow: hidden; color: #fff; background: var(--brand-700); border: 4px solid #fff; border-radius: 50%; font-size: 34px; font-weight: 800; box-shadow: 0 8px 20px rgba(20, 60, 40, .18); }
    .brand-logo img { width: 100%; height: 100%; object-fit: cover; }
    .brand-logo-row > div { padding-top: 12px; }
    .brand-logo-row strong { display: block; color: var(--ink-900); font-size: 14px; }
    .brand-logo-row span { display: block; margin: 3px 0 8px; color: var(--ink-500); font-size: 12px; }
    .brand-note { margin: 14px 0 0; color: var(--ink-500); font-size: 12px; }
    .brand-note.error { color: #b42318; font-weight: 600; }
    .brand-note.pending { color: #8a5a10; font-weight: 600; }

    /* ============================ page frame ============================ */
    .page { margin: 0 auto; max-width: 1360px; padding: 22px 22px 64px; width: 100%; }
    .page > h1, .page-header h1 {
      color: var(--ink-900); font-family: var(--font-heading, Georgia, serif); font-size: 26px;
      font-weight: 700; letter-spacing: -.02em; line-height: 1.15; margin: 0;
    }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 20px; }
    .muted { color: var(--ink-500); font-size: 13px; margin-top: 4px; }

    /* ============================ buttons ============================ */
    .btn {
      align-items: center; border: 1px solid transparent; border-radius: var(--r-md); cursor: pointer;
      display: inline-flex; font: inherit; font-size: 13px; font-weight: 650; gap: 7px;
      justify-content: center; padding: 8px 15px; text-decoration: none; white-space: nowrap;
      transition: background .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease;
    }
    .btn-primary { background: var(--brand-700); border-color: var(--brand-700); box-shadow: var(--sh-sm); color: #fff; }
    .btn-primary:hover { background: var(--brand-600); border-color: var(--brand-600); }
    .btn-ghost { background: var(--surface); border-color: var(--line); color: var(--ink-700); }
    .btn-ghost:hover { border-color: var(--ink-400); color: var(--ink-900); }
    .btn-danger { background: var(--danger-bg); border-color: #fecaca; color: var(--danger); }
    .btn-danger:hover { background: #fee2e2; }
    .btn-sm { padding: 5px 11px; font-size: 12px; }
    .btn[disabled] { cursor: not-allowed; opacity: .55; }
    .icon-btn {
      align-items: center; background: none; border: 1px solid transparent; border-radius: var(--r-sm);
      color: var(--ink-500); cursor: pointer; display: inline-flex; height: 30px; justify-content: center;
      transition: background .14s ease, border-color .14s ease, color .14s ease; width: 30px;
    }
    .icon-btn:hover { background: var(--canvas); border-color: var(--line); color: var(--ink-900); }

    /* ============================ metric cards ============================ */
    .metrics { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-top: 18px; }
    .metric {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg);
      box-shadow: var(--sh-sm); display: flex; flex-direction: column; gap: 3px;
      padding: 15px 16px; position: relative; transition: border-color .18s ease, box-shadow .18s ease;
    }
    .metric:hover { border-color: #d3ded8; box-shadow: var(--sh-md); }
    .metric-icon {
      align-items: center; background: var(--brand-50); border-radius: 9px; color: var(--brand-700);
      display: flex; height: 32px; justify-content: center; margin-bottom: 8px; width: 32px;
    }
    .metric.warn .metric-icon, .metric.gold .metric-icon { background: var(--warn-bg); color: var(--warn); }
    .metric-label { color: var(--ink-500); font-size: 10.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
    .metric strong { color: var(--ink-900); font-size: 24px; font-weight: 700; letter-spacing: -.02em; line-height: 1.15; }
    .metric-note { color: var(--ink-500); font-size: 11.5px; margin-top: 2px; }
    .metric.warn .metric-note { color: var(--warn); font-weight: 650; }

    /* ============================ tables and panels ============================ */
    .table-card, .form-card, .info-card {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg);
      box-shadow: var(--sh-sm); overflow: hidden;
    }
    .table-card { margin-top: 18px; }
    .table-card > header, .payout-head {
      align-items: center; border-bottom: 1px solid var(--line-soft);
      display: flex; justify-content: space-between; padding: 13px 18px;
    }
    .table-card > header h2, .payout-head h2 {
      color: var(--ink-900); font-family: var(--font-heading, Georgia, serif);
      font-size: 15px; font-weight: 700; letter-spacing: -.01em; margin: 0;
    }
    table { border-collapse: collapse; font-size: 13px; width: 100%; }
    th {
      background: var(--raised); border-bottom: 1px solid var(--line); color: var(--ink-500);
      font-size: 10.5px; font-weight: 700; letter-spacing: .07em; padding: 10px 16px;
      text-align: left; text-transform: uppercase; white-space: nowrap;
    }
    td { border-bottom: 1px solid var(--line-soft); color: var(--ink-700); padding: 12px 16px; vertical-align: middle; }
    tbody tr:hover { background: var(--brand-50); }
    tbody tr:last-child td { border-bottom: 0; }
    .order-id { color: var(--brand-700); font-weight: 700; }

    /* ============================ status pills ============================ */
    .status, .pill {
      align-items: center; border-radius: var(--r-pill); display: inline-flex; font-size: 10px;
      font-weight: 700; gap: 5px; letter-spacing: .05em; padding: 3px 9px;
      text-transform: uppercase; white-space: nowrap;
    }
    .status::before { background: currentColor; border-radius: 50%; content: ''; height: 5px; width: 5px; }
    .status.pending, .pending { background: var(--warn-bg); color: var(--warn); }
    .status.shipped, .shipped { background: var(--info-bg); color: var(--info); }
    .status.delivered, .delivered, .status.completed, .paid { background: var(--ok-bg); color: var(--ok); }
    .status.cancelled, .cancelled, .out-of-stock { background: var(--danger-bg); color: var(--danger); }
    /* ---- Payouts (minimal) ---- */
    .payouts-min { max-width: 760px; }
    .pm-error { color: var(--danger); background: var(--danger-bg); font-size: 13px; padding: 10px 12px; border-radius: 10px; margin: 0 0 14px; }
    .pm-hero { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 20px; padding: 24px; border-radius: 16px; background: var(--canvas, #f6f3ec); margin-bottom: 14px; }
    .pm-label { display: block; font-size: 12.5px; color: var(--ink-500, #777); }
    .pm-amount { display: block; font-size: 38px; font-weight: 650; letter-spacing: -0.03em; line-height: 1.15; font-variant-numeric: tabular-nums; }
    .pm-sub { display: block; font-size: 13px; color: var(--ink-600, #555); margin-top: 2px; }
    .pm-stats { display: flex; gap: 26px; margin: 0; }
    .pm-stats dt { font-size: 12px; color: var(--ink-500, #777); }
    .pm-stats dd { margin: 2px 0 0; font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .pm-card { border: 1px solid var(--line, #e7e1d6); border-radius: 16px; padding: 18px 20px; margin-bottom: 14px; background: #fff; }
    .pm-card.pm-flush { padding: 0; overflow: hidden; }
    .pm-h2 { font-size: 15px; margin: 0 0 14px; }
    .pm-account { display: flex; align-items: center; gap: 12px; }
    .pm-account-text { flex: 1; min-width: 0; display: grid; }
    .pm-account-text strong { font-size: 14px; font-weight: 600; }
    .pm-account-text span { font-size: 12.5px; color: var(--ink-500, #777); }
    .pm-pill { font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 999px; background: var(--warn-bg); color: var(--warn); white-space: nowrap; }
    .pm-pill.ok { background: var(--ok-bg); color: var(--ok); }
    .pm-pill.bad { background: var(--danger-bg); color: var(--danger); }
    .pm-link { border: 0; background: none; padding: 0; font: inherit; font-size: 13px; color: var(--ink-700, #333); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--line, #ccc); cursor: pointer; white-space: nowrap; }
    .pm-link:hover { color: var(--brand-700, #8e3021); }
    .pm-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .pm-form label { display: grid; gap: 5px; font-size: 12.5px; color: var(--ink-600, #555); }
    .pm-khqr { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
    .pm-khqr img { width: 44px; height: 44px; border-radius: 8px; border: 1px solid var(--line, #e7e1d6); }
    .pm-upload { position: relative; overflow: hidden; }
    .pm-upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .pm-actions { display: flex; gap: 8px; margin-top: 16px; }
    .pm-fine { font-size: 12px; color: var(--ink-500, #777); margin: 10px 0 0; }
    .pm-tabs { display: flex; gap: 4px; padding: 6px; border-bottom: 1px solid var(--line, #e7e1d6); }
    .pm-tabs button { border: 0; background: none; padding: 8px 12px; border-radius: 8px; font: inherit; font-size: 13px; color: var(--ink-500, #777); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .pm-tabs button.active { background: var(--canvas, #f6f3ec); color: var(--ink-900, #111); font-weight: 600; }
    .pm-count { font-size: 11px; padding: 0 6px; border-radius: 999px; background: var(--line, #e7e1d6); }
    .pm-row { display: flex; align-items: center; gap: 12px; padding: 13px 20px; border-bottom: 1px solid var(--line, #eee8dd); }
    .pm-row:last-child { border-bottom: 0; }
    .pm-row-main { flex: 1; min-width: 0; display: grid; }
    .pm-row-main strong { font-size: 14.5px; font-variant-numeric: tabular-nums; }
    .pm-row-main span { font-size: 12.5px; color: var(--ink-500, #777); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pm-empty { margin: 0; padding: 22px 20px; font-size: 13px; color: var(--ink-500, #777); }
    .pm-how { font-size: 13px; color: var(--ink-600, #555); padding: 4px 2px; }
    .pm-how summary { cursor: pointer; color: var(--ink-700, #333); font-weight: 500; }
    .pm-how ul { margin: 10px 0 0; padding-left: 18px; display: grid; gap: 6px; line-height: 1.5; }
    @media (max-width: 640px) { .pm-hero { padding: 20px; } .pm-stats { gap: 18px; } .pm-amount { font-size: 32px; } }

    .in-stock { background: var(--ok-bg); color: var(--ok); }
    .low-stock { background: var(--warn-bg); color: var(--warn); }

    /* ============================ filters ============================ */
    .filter-bar {
      align-items: center; background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-lg); display: flex; flex-wrap: wrap; gap: 12px;
      margin-top: 16px; padding: 12px 16px;
    }
    .filter-input {
      align-items: center; background: var(--canvas); border: 1px solid var(--line);
      border-radius: var(--r-md); display: flex; flex: 1 1 220px; gap: 8px; height: 42px; min-height: 42px; padding: 0 12px;
      box-sizing: border-box;
    }
    .filter-input input { background: none; border: 0; color: var(--ink-900); font: inherit; font-size: 13.5px; outline: none; width: 100%; }
    .filter-select {
      appearance: none; -webkit-appearance: none; -moz-appearance: none;
      background: var(--surface);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      background-size: 16px;
      border: 1px solid var(--line); border-radius: var(--r-md);
      box-sizing: border-box; color: var(--ink-900); cursor: pointer;
      font: inherit; font-size: 13.5px; height: 42px; min-height: 42px;
      outline: none; padding: 0 40px 0 14px;
    }
    .filter-select::-ms-expand { display: none; }
    .tab-pills { display: flex; gap: 6px; }
    .tab-pill {
      background: var(--canvas); border: 1px solid var(--line); border-radius: var(--r-pill);
      color: var(--ink-700); cursor: pointer; font: inherit; font-size: 12px; font-weight: 650;
      padding: 6px 14px; transition: all .14s ease;
    }
    .tab-pill.active { background: var(--brand-700); border-color: var(--brand-700); color: #fff; }

    /* ============================ empty states ============================ */
    .empty-state {
      align-items: center; display: flex; flex-direction: column; gap: 6px;
      padding: 44px 20px; text-align: center;
    }
    .empty-state kc-icon {
      align-items: center; background: var(--canvas); border-radius: 50%; color: var(--ink-400);
      display: flex; height: 48px; justify-content: center; margin-bottom: 6px; width: 48px;
    }
    .empty-state h3 { color: var(--ink-900); font-family: var(--font-heading, Georgia, serif); font-size: 16px; font-weight: 700; margin: 0; }
    .empty-state p { color: var(--ink-500); font-size: 13px; max-width: 400px; margin: 0; }

    /* ============================ Complete Production POS ============================ */
    .pos-top-bar {
      align-items: center; background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-lg); display: flex; flex-wrap: wrap; gap: 16px;
      justify-content: space-between; padding: 12px 18px; margin-bottom: 12px;
    }
    .pos-meta-item { display: flex; flex-direction: column; gap: 2px; }
    .pos-meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--ink-400); letter-spacing: .08em; }
    .pos-meta-val { font-size: 13px; font-weight: 700; color: var(--ink-900); }

    .pos-subnav {
      display: flex; gap: 6px; overflow-x: auto; padding: 4px 0 12px;
      border-bottom: 1px solid var(--line-soft); margin-bottom: 14px;
    }
    .pos-subnav::-webkit-scrollbar { height: 4px; }
    .pos-subnav::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }
    .pos-subnav-btn {
      align-items: center; background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-pill); color: var(--ink-700); cursor: pointer; display: inline-flex;
      font: inherit; font-size: 12px; font-weight: 650; gap: 6px; padding: 6px 13px; white-space: nowrap;
      transition: all .14s ease;
    }
    .pos-subnav-btn:hover { border-color: var(--brand-600); color: var(--brand-700); }
    .pos-subnav-btn.active { background: var(--brand-700); border-color: var(--brand-700); color: #fff; }

    .pos-checkout-grid {
      display: grid; gap: 16px; grid-template-columns: 1.4fr 1.1fr 1fr; align-items: start;
    }
    .pos-catalog-panel, .pos-cart-panel, .pos-summary-panel {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg);
      padding: 14px; display: flex; flex-direction: column; min-height: 560px; box-shadow: var(--sh-sm);
    }
    .pos-product-grid {
      display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      max-height: calc(100vh - 340px); overflow-y: auto; padding-right: 4px; margin-top: 10px;
    }
    .pos-tile {
      background: var(--canvas); border: 1px solid var(--line-soft); border-radius: var(--r-md);
      cursor: pointer; display: flex; flex-direction: column; padding: 8px; text-align: left;
      transition: all .14s ease; position: relative;
    }
    .pos-tile:hover { border-color: var(--brand-600); transform: translateY(-2px); box-shadow: var(--sh-md); }
    .pos-tile img { aspect-ratio: 1; border-radius: 6px; object-fit: cover; width: 100%; background: #eef2f0; }
    .pos-tile strong { font-size: 12px; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink-900); }
    .pos-tile-price { color: var(--brand-700); font-weight: 700; font-size: 13px; margin-top: 2px; }
    .pos-tile-stock { font-size: 10.5px; color: var(--ink-400); }

    .pos-cart-lines { flex: 1; max-height: calc(100vh - 390px); overflow-y: auto; margin: 10px 0; }
    .pos-cart-row {
      display: flex; justify-content: space-between; align-items: center; gap: 8px;
      padding: 8px 0; border-bottom: 1px solid var(--line-soft);
    }
    .pos-customer-banner {
      background: var(--brand-50); border: 1px solid var(--brand-100); border-radius: var(--r-md);
      padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;
    }
    .qty-controls { align-items: center; display: flex; gap: 6px; }
    .qty-btn {
      align-items: center; background: var(--canvas); border: 1px solid var(--line);
      border-radius: 4px; cursor: pointer; display: flex; font-weight: bold;
      height: 24px; justify-content: center; width: 24px;
    }

    .cash-presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 8px 0; }
    .cash-preset-btn {
      background: var(--canvas); border: 1px solid var(--line); border-radius: var(--r-sm);
      color: var(--ink-900); font-weight: 700; font-size: 11.5px; padding: 6px 0; cursor: pointer; text-align: center;
    }
    .cash-preset-btn:hover { background: var(--brand-50); border-color: var(--brand-600); }
    .total-display-card {
      background: var(--brand-900); color: #fff; border-radius: var(--r-md); padding: 12px; text-align: center; margin: 10px 0;
    }
    .total-display-val { font-size: 26px; font-weight: 800; letter-spacing: -.02em; }

    /* ============================ modals ============================ */
    .backdrop {
      align-items: center; background: rgba(14, 32, 24, .45); backdrop-filter: blur(4px);
      bottom: 0; display: flex; justify-content: center; left: 0; padding: 20px;
      position: fixed; right: 0; top: 0; z-index: 50;
    }
    .modal {
      background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--sh-lg);
      max-height: 90vh; max-width: 600px; overflow-y: auto; width: 100%;
    }
    .modal-lg { max-width: 840px; }
    .modal-head {
      align-items: center; border-bottom: 1px solid var(--line-soft); display: flex;
      justify-content: space-between; padding: 16px 20px; position: sticky; top: 0; background: var(--surface); z-index: 2;
    }
    .modal-head h2 { color: var(--ink-900); font-family: var(--font-heading, Georgia, serif); font-size: 17px; font-weight: 700; margin: 0; }
    .modal-head .close { background: none; border: 0; color: var(--ink-400); cursor: pointer; font-size: 22px; line-height: 1; }
    .modal-body { padding: 20px; }
    .modal-actions { border-top: 1px solid var(--line-soft); display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; padding-top: 16px; }

    /* ============================ form fields ============================ */
    .field-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
    .field-group label { color: var(--ink-700); font-size: 12px; font-weight: 650; }
    .dash-input, .dash-textarea, .dash-select {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md);
      box-sizing: border-box; color: var(--ink-900); font: inherit; font-size: 13.5px;
      line-height: 1.4; outline: none; padding: 10px 14px; width: 100%;
    }
    .dash-input, .dash-select {
      height: 44px;
      min-height: 44px;
    }
    .dash-select {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      background-size: 16px;
      padding-right: 40px !important;
      cursor: pointer;
    }
    .dash-select::-ms-expand { display: none; }
    .dash-input:focus, .dash-textarea:focus, .dash-select:focus {
      border-color: var(--brand-600); box-shadow: 0 0 0 3px var(--brand-50);
    }
    .dash-textarea { line-height: 1.5; min-height: 90px; resize: vertical; }
    .two-cols { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }

    /* ============================ dashboard home ============================ */
    .dashboard-grid { align-items: start; display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr) 320px; margin-top: 18px; }
    .quick-actions { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); margin-top: 16px; }
    .quick-action {
      align-items: center; background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-lg); box-shadow: var(--sh-sm); color: var(--ink-900); cursor: pointer;
      display: flex; flex-direction: column; font: inherit; font-size: 12px; font-weight: 650;
      gap: 8px; padding: 14px 10px; text-align: center; transition: all .16s ease;
    }
    .quick-action:hover { border-color: var(--brand-600); box-shadow: var(--sh-md); transform: translateY(-2px); }
    .quick-action kc-icon {
      align-items: center; background: var(--brand-50); border-radius: 9px; color: var(--brand-700);
      display: flex; height: 34px; justify-content: center; width: 34px;
    }
    .stock-item {
      align-items: center; border-top: 1px solid var(--line-soft); display: grid; gap: 12px;
      grid-template-columns: 44px minmax(0, 1fr); padding: 10px 0;
    }
    .stock-item img { aspect-ratio: 1; border-radius: var(--r-sm); object-fit: cover; width: 44px; }
    .small-green {
      background: var(--brand-700); border: 0; border-radius: var(--r-sm); color: #fff;
      cursor: pointer; font-size: 11px; font-weight: 650; margin-top: 4px; padding: 4px 10px;
    }

    /* ============================ campaigns & ads ============================ */
    .campaigns-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); margin-top: 14px; }
    .campaign-card {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg);
      box-shadow: var(--sh-sm); display: flex; flex-direction: column; justify-content: space-between; padding: 16px;
    }
    .campaign-rate { background: #eef7f2; border-radius: var(--r-pill); color: var(--brand-700); font-size: 11px; font-weight: 700; padding: 3px 8px; }

    /* ============================ support thread ============================ */
    .thread-messages { display: flex; flex-direction: column; gap: 12px; max-height: 340px; overflow-y: auto; padding: 10px 0; }
    .msg-bubble { border-radius: var(--r-md); max-width: 80%; padding: 10px 14px; font-size: 13px; line-height: 1.45; }
    .msg-bubble.seller { align-self: flex-end; background: var(--brand-700); color: #fff; }
    .msg-bubble.support { align-self: flex-start; background: var(--canvas); border: 1px solid var(--line); color: var(--ink-900); }
    .msg-meta { font-size: 10.5px; opacity: .75; margin-top: 4px; }

    /* ============================ responsive ============================ */
    @media (max-width: 1260px) {
      .pos-checkout-grid { grid-template-columns: 1fr 1fr; }
      .pos-summary-panel { grid-column: span 2; min-height: auto; }
    }
    @media (max-width: 960px) {
      :host { --sidebar-w: 70px; }
      .sidebar-head { padding: 0 10px 10px; text-align: center; }
      .logo { font-size: 14px; }
      .portal-label, .store-control, .nav-group-title, .nav-item span, .logout span { display: none; }
      .nav-item { justify-content: center; padding: 10px 0; }
      .seller-mini { display: none; }
      .pos-checkout-grid { grid-template-columns: 1fr; }
      .pos-summary-panel { grid-column: span 1; }
    }
    @media (max-width: 720px) {
      .page { padding: 16px 14px 48px; }
      .topbar { padding: 0 14px; }
      .two-cols { grid-template-columns: 1fr; }
      table { min-width: 650px; }
      .table-card { overflow-x: auto; }
    }

    img[src=''], img:not([src]) { visibility: hidden; }
  `],
  template: `
    <div class="portal">
      <aside class="sidebar">
        <div class="sidebar-head">
          <h1 class="logo">KhmerCraft</h1>
          <p class="portal-label">Seller Portal</p>
          <div class="store-control">
            <label for="active-store">Working in</label>
            <select id="active-store" [ngModel]="myStoreId()" (ngModelChange)="switchStore($event)">
              @for (store of stores(); track store.id || store._id) {
                <option [value]="store.id || store._id">{{ store.storeName }}</option>
              }
            </select>
            <button class="new-store" type="button" (click)="createAnotherStore()">+ Create another store</button>
          </div>
        </div>

        <nav class="sidebar-nav-scroll">
          <!-- OVERVIEW -->
          <div class="nav-group">
            <span class="nav-group-title">Overview</span>
            <button type="button" class="nav-item" [class.active]="view() === 'dashboard'" (click)="setView('dashboard')">
              <kc-icon name="grid" [size]="16" />
              <span>Dashboard</span>
            </button>
          </div>

          <!-- CATALOG -->
          <div class="nav-group">
            <span class="nav-group-title">Catalog</span>
            <button type="button" class="nav-item" [class.active]="view() === 'products' || view() === 'add'" (click)="setView('products')">
              <kc-icon name="box" [size]="16" />
              <span>Products</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'store-categories'" (click)="setView('store-categories')">
              <kc-icon name="grid" [size]="16" />
              <span>Categories</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'collections'" (click)="setView('collections')">
              <kc-icon name="layers" [size]="16" />
              <span>Collections</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'inventory'" (click)="setView('inventory')">
              <kc-icon name="package" [size]="16" />
              <span>Inventory</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'warehouses'" (click)="setView('warehouses')">
              <kc-icon name="store" [size]="16" />
              <span>Stock Locations</span>
            </button>
          </div>

          <!-- SALES -->
          <div class="nav-group">
            <span class="nav-group-title">Sales</span>
            <button type="button" class="nav-item" [class.active]="view() === 'orders'" (click)="setView('orders')">
              <kc-icon name="cart" [size]="16" />
              <span>Orders</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'pos'" (click)="setView('pos')">
              <kc-icon name="clipboard" [size]="16" />
              <span>POS</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'customers'" (click)="setView('customers')">
              <kc-icon name="user" [size]="16" />
              <span>Customers</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'reviews'" (click)="setView('reviews')">
              <kc-icon name="review" [size]="16" />
              <span>Reviews</span>
            </button>
          </div>

          <!-- MARKETING -->
          <div class="nav-group">
            <span class="nav-group-title">Marketing</span>
            <button type="button" class="nav-item" [class.active]="view() === 'promotions'" (click)="setView('promotions')">
              <kc-icon name="percent" [size]="16" />
              <span>Promotions</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'advertisements'" (click)="setView('advertisements')">
              <kc-icon name="sparkles" [size]="16" />
              <span>Advertisements</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'storefront'" (click)="setView('storefront')">
              <kc-icon name="globe" [size]="16" />
              <span>Storefront</span>
            </button>
          </div>

          <!-- FINANCE -->
          <div class="nav-group">
            <span class="nav-group-title">Finance</span>
            <button type="button" class="nav-item" [class.active]="view() === 'sales'" (click)="setView('sales')">
              <kc-icon name="wallet" [size]="16" />
              <span>Sales &amp; Payouts</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'payments'" (click)="setView('payments')">
              <kc-icon name="check" [size]="16" />
              <span>Payments</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'transactions'" (click)="setView('transactions')">
              <kc-icon name="file" [size]="16" />
              <span>Transactions</span>
            </button>
          </div>

          <!-- INSIGHTS -->
          <div class="nav-group">
            <span class="nav-group-title">Insights</span>
            <button type="button" class="nav-item" [class.active]="view() === 'analytics'" (click)="setView('analytics')">
              <kc-icon name="chart" [size]="16" />
              <span>Analytics</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'reports'" (click)="setView('reports')">
              <kc-icon name="download" [size]="16" />
              <span>Reports</span>
            </button>
          </div>

          <!-- SUPPORT -->
          <div class="nav-group">
            <span class="nav-group-title">Support</span>
            <button type="button" class="nav-item" [class.active]="view() === 'support'" (click)="setView('support')">
              <kc-icon name="info" [size]="16" />
              <span>Support Cases</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'notifications'" (click)="setView('notifications')">
              <kc-icon name="bell" [size]="16" />
              <span>Notifications</span>
            </button>
          </div>

          <!-- STORE -->
          <div class="nav-group">
            <span class="nav-group-title">Store</span>
            <button type="button" class="nav-item" [class.active]="view() === 'profile'" (click)="setView('profile')">
              <kc-icon name="store" [size]="16" />
              <span>Store Profile</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'settings'" (click)="setView('settings')">
              <kc-icon name="settings" [size]="16" />
              <span>Settings</span>
            </button>
            <button type="button" class="nav-item" [class.active]="view() === 'billing'" (click)="setView('billing')">
              <kc-icon name="lock" [size]="16" />
              <span>Plan &amp; Billing</span>
            </button>
          </div>
        </nav>

        <button type="button" class="logout" (click)="logout()">
          <kc-icon name="logout" [size]="15" />
          <span>Logout</span>
        </button>
      </aside>

      <section class="content">
        <header class="topbar">
          <div class="search">
            <kc-icon name="search" [size]="17" />
            <input 
              [placeholder]="view() === 'reviews' ? 'Search reviews...' : (view() === 'products' ? 'Search products...' : 'Search orders, ID, or customers...')"
              [ngModel]="globalSearchQuery()" 
              (ngModelChange)="globalSearchQuery.set($event)" 
            />
          </div>
          <div class="top-actions">
            <a class="view-store" [href]="activeStorefrontUrl()" target="_blank">
              View Store
              <kc-icon name="external" [size]="14" />
            </a>
            <button type="button" class="icon-btn" (click)="setView('notifications')" title="Notifications">
              <kc-icon name="bell" [size]="18" style="color:#146242" />
            </button>
            <div class="seller-mini">
              <div>
                <strong>{{ storeProfile().storeName || 'Your Store' }}</strong>
                <span>{{ currentPlanBadge() }} Seller</span>
              </div>
              <div class="avatar">
                @if (storeProfile().logoUrl) { <img [src]="storeProfile().logoUrl" alt="" /> } @else { {{ storeInitials() }} }
              </div>
            </div>
          </div>
        </header>

        <!-- ======================= 1. DASHBOARD ======================= -->
        @if (view() === 'dashboard') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Seller Dashboard</h1>
                <p class="muted">Operational overview of your orders, sales, catalog, and store health.</p>
              </div>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-primary" type="button" (click)="startNewProduct()"><kc-icon name="plus" [size]="14" /> Add Product</button>
                <button class="btn btn-ghost" type="button" (click)="setView('pos')"><kc-icon name="clipboard" [size]="14" /> Open POS</button>
              </div>
            </div>

            <!-- The store as buyers see it: cover image and profile picture. -->
            <section class="store-hero">
              <div class="store-hero-cover">
                @if (storeProfile().bannerUrl) {
                  <img [src]="storeProfile().bannerUrl" alt="Store cover" />
                } @else {
                  <span class="store-hero-empty"><kc-icon name="image" [size]="16" /> Add a cover image so buyers recognise your store</span>
                }
              </div>
              <div class="store-hero-body">
                <div class="store-hero-logo">
                  @if (storeProfile().logoUrl) { <img [src]="storeProfile().logoUrl" alt="Store profile picture" /> } @else { {{ storeInitials() }} }
                </div>
                <div class="store-hero-info">
                  <h2>{{ storeProfile().storeName || 'Your store' }}</h2>
                  <p>{{ storeProfile().storeTagline || ((activeStore()?.category || 'Your store') + (storeProfile().location ? ' · ' + storeProfile().location : '')) }} · {{ currentPlanBadge() }} plan</p>
                </div>
                <div class="store-hero-actions">
                  <button class="btn btn-ghost" type="button" (click)="setView('profile')"><kc-icon name="image" [size]="14" /> Edit cover &amp; picture</button>
                  <a class="btn btn-primary" [href]="activeStorefrontUrl()" target="_blank" rel="noopener"><kc-icon name="external" [size]="14" /> View store</a>
                </div>
              </div>
            </section>

            <section class="metrics">
              @for (metric of dashboardMetrics(); track metric.label) {
                <article class="metric" [class.warn]="metric.warn" [class.gold]="metric.gold">
                  <div class="metric-icon"><kc-icon [name]="metric.icon" [size]="18" /></div>
                  <span class="metric-label">{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                  @if (metric.note) { <span class="metric-note">{{ metric.note }}</span> }
                </article>
              }
            </section>

            <section class="dashboard-grid">
              <div style="display:flex;flex-direction:column;gap:18px;">
                <article class="table-card">
                  <div class="payout-head">
                    <h2>Recent Orders</h2>
                    <button class="btn btn-ghost btn-sm" type="button" (click)="setView('orders')">View All</button>
                  </div>
                  @if (dashboardOrders().length) {
                    <table>
                      <thead>
                        <tr><th>Order ID</th><th>Buyer</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        @for (order of dashboardOrders(); track order.id) {
                          <tr style="cursor:pointer" (click)="openOrder(order)">
                            <td class="order-id">{{ order.id }}</td>
                            <td>{{ order.buyer }}</td>
                            <td>{{ order.product }}</td>
                            <td>{{ order.qty }}</td>
                            <td><strong>{{ order.total }}</strong></td>
                            <td><span class="status" [class.pending]="order.status === 'PENDING'" [class.shipped]="order.status === 'SHIPPED'" [class.delivered]="order.status === 'DELIVERED'">{{ order.status }}</span></td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  } @else {
                    <div class="empty-state">
                      <kc-icon name="package" [size]="22" />
                      <h3>No orders yet</h3>
                      <p>When a buyer checks out on the marketplace or POS, the order lands here for fulfillment.</p>
                    </div>
                  }
                </article>

                <div class="quick-actions">
                  <button class="quick-action" type="button" (click)="startNewProduct()"><kc-icon name="plus-square" [size]="20" /> Add Product</button>
                  <button class="quick-action" type="button" (click)="setView('orders')"><kc-icon name="cart" [size]="20" /> Manage Orders</button>
                  <button class="quick-action" type="button" (click)="setView('pos')"><kc-icon name="clipboard" [size]="20" /> In-Store POS</button>
                  <button class="quick-action" type="button" (click)="setView('promotions')"><kc-icon name="percent" [size]="20" /> Promotions</button>
                  <button class="quick-action" type="button" (click)="setView('advertisements')"><kc-icon name="sparkles" [size]="20" /> Request Ads</button>
                </div>
              </div>

              <aside style="display:flex;flex-direction:column;gap:16px;">
                <article class="info-card" style="padding:16px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <h2 style="font-size:15px;margin:0;">Low Stock Alerts</h2>
                    @if (lowStock().length > 0) {
                      <span class="status cancelled">{{ lowStock().length }} Critical</span>
                    }
                  </div>
                  @if (lowStock().length > 0) {
                    @for (item of lowStock(); track item.id) {
                      <div class="stock-item">
                        <img [src]="img(item.image)" [alt]="item.name" (error)="imgFallback($event)" />
                        <div>
                          <strong>{{ item.name }}</strong>
                          <span style="color:var(--danger);font-size:12px;font-weight:600;">{{ item.stock }} left in stock</span>
                          <button class="small-green" type="button" (click)="editProduct(item)">Update Stock</button>
                        </div>
                      </div>
                    }
                  } @else {
                    <p class="muted" style="margin:0;font-size:12.5px;">All product inventory levels are healthy.</p>
                  }
                </article>

                <article class="info-card" style="padding:16px;">
                  <h2 style="font-size:15px;margin:0 0 10px;">Recent Activity</h2>
                  @if (notifications().length > 0) {
                    <div style="display:flex;flex-direction:column;gap:8px;">
                      @for (n of notifications().slice(0, 4); track n.id) {
                        <div style="font-size:12px;border-bottom:1px solid var(--line-soft);padding-bottom:6px;">
                          <strong>{{ n.title }}</strong>
                          <p style="margin:2px 0 0;color:var(--ink-500)">{{ n.message }}</p>
                        </div>
                      }
                    </div>
                  } @else {
                    <p class="muted" style="margin:0;font-size:12.5px;">No new alerts.</p>
                  }
                </article>
              </aside>
            </section>
          </main>
        }

        <!-- ======================= 2. PRODUCTS ======================= -->
        @else if (view() === 'products') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Products</h1>
                <p class="muted">Manage and publish handcrafted items in your store catalogue.</p>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-ghost" type="button" (click)="openCatalogShare()"><kc-icon name="share" [size]="15" /> Share store &amp; categories</button>
                <button class="btn btn-primary" type="button" (click)="startNewProduct()"><kc-icon name="plus" [size]="15" /> Add Product</button>
              </div>
            </div>

            <div class="filter-bar">
              <div class="filter-input">
                <kc-icon name="search" [size]="15" />
                <input placeholder="Search products by title or SKU..." [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" />
              </div>
            </div>

            <article class="table-card">
              <table>
                <thead>
                  <tr><th>Image</th><th>Product Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th style="text-align:right">Actions</th></tr>
                </thead>
                <tbody>
                  @for (product of filteredProducts(); track product.id) {
                    <tr>
                      <td style="width:60px;">
                        <img [src]="img(product.image)" [alt]="product.name" (error)="imgFallback($event)" style="width:40px;height:40px;border-radius:6px;object-fit:cover;" />
                      </td>
                      <td>
                        <strong>{{ product.name }}</strong>
                        @if (product.material) { <div style="color:var(--ink-400);font-size:11px">{{ product.material }}</div> }
                      </td>
                      <td>{{ product.category || 'General' }}</td>
                      <td><strong>\${{ product.price }}</strong></td>
                      <td>
                        <span class="status" [class.in-stock]="product.stock > 5" [class.low-stock]="product.stock > 0 && product.stock <= 5" [class.cancelled]="product.stock === 0">
                          {{ product.stock }} units
                        </span>
                      </td>
                      <td>
                        <span class="status" [class.delivered]="product.status === 'ACTIVE'" [class.cancelled]="product.status !== 'ACTIVE'">
                          {{ product.status }}
                        </span>
                      </td>
                      <td style="text-align:right;">
                        <button class="icon-btn" type="button" (click)="openProductShare(product)" title="Copy link / share" aria-label="Share link"><kc-icon name="share" [size]="14" /></button>
                        <button class="icon-btn" type="button" (click)="editProduct(product)" title="Edit"><kc-icon name="edit" [size]="14" /></button>
                        <button class="icon-btn" type="button" (click)="toggleProductStatus(product)" [title]="product.status === 'ACTIVE' ? 'Archive' : 'Activate'"><kc-icon [name]="product.status === 'ACTIVE' ? 'eye-off' : 'eye'" [size]="14" /></button>
                        <button class="icon-btn" type="button" (click)="deleteProduct(product.id)" title="Delete"><kc-icon name="trash" [size]="14" /></button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </article>
          </main>
        }

        <!-- ======================= 3. CATEGORIES ======================= -->
        @else if (view() === 'store-categories') {
          <main class="page">
            @if (myStoreId(); as storeId) {
              <app-store-categories-manager [storeId]="storeId" />
            } @else {
              <p class="muted">Select a store first.</p>
            }
          </main>
        }

        <!-- ======================= 3b. COLLECTIONS ======================= -->
        @else if (view() === 'collections') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Store Collections</h1>
                <p class="muted">Group your products into curated showcases (e.g. Festival Specials, Silk Heritage, Gift Sets) for your storefront.</p>
              </div>
              <button class="btn btn-primary" type="button" (click)="openCreateCollectionModal()">
                <kc-icon name="plus" [size]="16" /> Create Collection
              </button>
            </div>

            @if (loadingCollections()) {
              <div style="padding:40px;text-align:center;color:var(--ink-500);">
                Loading your store collections...
              </div>
            } @else if (!collections().length) {
              <div class="card empty-state">
                <div class="empty-icon"><kc-icon name="layers" [size]="32" /></div>
                <h3>No Collections Created Yet</h3>
                <p class="muted" style="max-width:440px;margin:8px auto 20px;">
                  Curate themed collections to highlight seasonal specials, new creations, or matching craft sets directly on your store page.
                </p>
                <button class="btn btn-primary" type="button" (click)="openCreateCollectionModal()">
                  <kc-icon name="plus" [size]="16" /> Create Your First Collection
                </button>
              </div>
            } @else {
              <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:20px;">
                @for (col of collections(); track col.id) {
                  <div class="card" style="overflow:hidden;display:flex;flex-direction:column;border:1px solid var(--line);">
                    <div style="height:140px;background:#24322b;position:relative;overflow:hidden;">
                      @if (col.coverImage) {
                        <img [src]="col.coverImage" style="width:100%;height:100%;object-fit:cover;display:block;" alt="{{ col.name }}" />
                      } @else {
                        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #176242 0%, #0e3a28 100%);color:#fff;font-size:20px;font-weight:700;text-align:center;padding:12px;">
                          {{ col.name }}
                        </div>
                      }
                      <span class="pill" [style.background]="col.visible ? '#dcfce7' : '#f1f5f9'" [style.color]="col.visible ? '#15803d' : '#64748b'" style="position:absolute;top:10px;right:10px;font-weight:700;">
                        {{ col.visible ? 'Visible' : 'Hidden' }}
                      </span>
                    </div>
                    <div style="padding:16px;flex:1;display:flex;flex-direction:column;">
                      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
                        <h3 style="font-size:16px;font-weight:700;margin:0;color:var(--ink-900);">{{ col.name }}</h3>
                        <span class="pill" style="font-size:11px;background:var(--canvas);">{{ col.productCount }} {{ col.productCount === 1 ? 'item' : 'items' }}</span>
                      </div>
                      @if (col.description) {
                        <p style="font-size:12.5px;color:var(--ink-600);margin:0 0 12px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                          {{ col.description }}
                        </p>
                      }
                      <div style="margin-top:auto;padding-top:14px;border-top:1px solid var(--line-soft);display:flex;justify-content:space-between;align-items:center;gap:8px;">
                        <a [routerLink]="['/stores', myStoreId()]" [queryParams]="{ collection: col.slug }" target="_blank" class="btn btn-ghost btn-sm" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--brand-700);">
                          <span>Preview on Store</span> ↗
                        </a>
                        <div style="display:flex;gap:6px;">
                          <button type="button" class="btn btn-secondary btn-sm" (click)="editCollection(col)">
                            Edit
                          </button>
                          <button type="button" class="btn btn-ghost btn-sm" style="color:var(--danger);" (click)="deleteCollection(col)">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </main>
        }

        <!-- ======================= 4. INVENTORY ======================= -->
        @else if (view() === 'inventory') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Inventory Management</h1>
                <p class="muted">Live stock tracking, alert levels, and direct inline quantity adjustments.</p>
              </div>
            </div>

            <div class="filter-bar">
              <div class="tab-pills">
                <button type="button" class="tab-pill" [class.active]="inventoryFilter() === 'ALL'" (click)="inventoryFilter.set('ALL')">All Stock ({{ products().length }})</button>
                <button type="button" class="tab-pill" [class.active]="inventoryFilter() === 'LOW'" (click)="inventoryFilter.set('LOW')">Low Stock (<= 5)</button>
                <button type="button" class="tab-pill" [class.active]="inventoryFilter() === 'OUT'" (click)="inventoryFilter.set('OUT')">Out of Stock</button>
              </div>
            </div>

            <article class="table-card">
              <table>
                <thead>
                  <tr><th>Product</th><th>Category</th><th>Price</th><th>Stock Status</th><th>Current Units</th><th style="text-align:right">Update Stock</th></tr>
                </thead>
                <tbody>
                  @for (p of filteredInventory(); track p.id) {
                    <tr>
                      <td>
                        <div style="display:flex;align-items:center;gap:10px;">
                          <img [src]="img(p.image)" [alt]="p.name" (error)="imgFallback($event)" style="width:36px;height:36px;border-radius:6px;object-fit:cover;" />
                          <strong>{{ p.name }}</strong>
                        </div>
                      </td>
                      <td>{{ p.category || 'Craft' }}</td>
                      <td>\${{ p.price }}</td>
                      <td>
                        <span class="status" [class.in-stock]="p.stock > 5" [class.low-stock]="p.stock > 0 && p.stock <= 5" [class.cancelled]="p.stock === 0">
                          {{ p.stock === 0 ? 'Out of Stock' : (p.stock <= 5 ? 'Low Stock' : 'In Stock') }}
                        </span>
                      </td>
                      <td><strong style="font-size:14px;">{{ p.stock }}</strong></td>
                      <td style="text-align:right;">
                        <div style="display:inline-flex;align-items:center;gap:6px;">
                          <button class="btn btn-ghost btn-sm" type="button" (click)="adjustStockInline(p, -1)" [disabled]="p.stock <= 0">-1</button>
                          <button class="btn btn-ghost btn-sm" type="button" (click)="adjustStockInline(p, 1)">+1</button>
                          <button class="btn btn-ghost btn-sm" type="button" (click)="adjustStockInline(p, 10)">+10</button>
                          <button class="btn btn-primary btn-sm" type="button" (click)="editProduct(p)">Edit</button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </article>
          </main>
        }

        <!-- ======================= 5. WAREHOUSES / STOCK LOCATIONS ======================= -->
        @else if (view() === 'warehouses') {
          <main class="page">
            @if (myStoreId(); as storeId) {
              <app-warehouses-manager [storeId]="storeId" />
            } @else {
              <p class="muted">Select a store first.</p>
            }
          </main>
        }

        <!-- ======================= 6. ORDERS ======================= -->
        @else if (view() === 'orders') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Orders</h1>
                <p class="muted">Track customer orders, payments, and fulfillment across marketplace &amp; in-store.</p>
              </div>
            </div>

            <div class="filter-bar">
              <div class="filter-input">
                <kc-icon name="search" [size]="15" />
                <input placeholder="Search orders by ID or customer..." [ngModel]="globalSearchQuery()" (ngModelChange)="globalSearchQuery.set($event)" />
              </div>
              <div class="tab-pills">
                <button type="button" class="tab-pill" [class.active]="orderStatusFilter() === 'ALL'" (click)="orderStatusFilter.set('ALL')">All</button>
                <button type="button" class="tab-pill" [class.active]="orderStatusFilter() === 'PENDING'" (click)="orderStatusFilter.set('PENDING')">Pending</button>
                <button type="button" class="tab-pill" [class.active]="orderStatusFilter() === 'CONFIRMED'" (click)="orderStatusFilter.set('CONFIRMED')">Confirmed</button>
                <button type="button" class="tab-pill" [class.active]="orderStatusFilter() === 'SHIPPED'" (click)="orderStatusFilter.set('SHIPPED')">Shipped</button>
                <button type="button" class="tab-pill" [class.active]="orderStatusFilter() === 'DELIVERED'" (click)="orderStatusFilter.set('DELIVERED')">Delivered</button>
              </div>
            </div>

            <article class="table-card">
              <table>
                <thead>
                  <tr><th>Order ID</th><th>Buyer</th><th>Date</th><th>Method</th><th>Items</th><th>Total</th><th>Status</th><th style="text-align:right">Action</th></tr>
                </thead>
                <tbody>
                  @for (order of filteredOrders(); track order.id) {
                    <tr style="cursor:pointer;" (click)="openOrder(order)">
                      <td class="order-id">{{ order.id }}</td>
                      <td>{{ order.buyer }}</td>
                      <td>{{ order.date }}</td>
                      <td><span class="pill">{{ order.paymentMethod }}</span></td>
                      <td>{{ order.items.length }} item(s)</td>
                      <td><strong>{{ order.total }}</strong></td>
                      <td>
                        <span class="status" [class.pending]="order.status === 'PENDING'" [class.confirmed]="order.status === 'CONFIRMED'" [class.shipped]="order.status === 'SHIPPED'" [class.delivered]="order.status === 'DELIVERED'" [style.background]="order.status === 'CONFIRMED' ? '#dbeafe' : undefined" [style.color]="order.status === 'CONFIRMED' ? '#1e40af' : undefined">
                          {{ order.status }}
                        </span>
                      </td>
                      <td style="text-align:right;">
                        <div style="display:inline-flex;gap:6px;justify-content:flex-end;align-items:center;">
                          @if (order.status === 'PENDING') {
                            <button 
                              class="btn btn-primary btn-sm" 
                              style="background:#059669;border-color:#059669;padding:4px 9px;font-size:11.5px;font-weight:600;" 
                              type="button" 
                              (click)="quickConfirmOrder(order, $event)"
                              title="Confirm this order from buyer"
                            >
                              ✓ Confirm Order
                            </button>
                          } @else if (order.status === 'CONFIRMED') {
                            <button 
                              class="btn btn-primary btn-sm" 
                              style="background:#2563eb;border-color:#2563eb;padding:4px 9px;font-size:11.5px;font-weight:600;" 
                              type="button" 
                              (click)="quickShipOrder(order, $event)"
                              title="Pack and Ship items"
                            >
                              📦 Mark Shipped
                            </button>
                          }
                          <button class="btn btn-ghost btn-sm" type="button" (click)="openOrder(order); $event.stopPropagation()">View Details</button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </article>
          </main>
        }

        <!-- ======================= 7. POS (POINT OF SALE) ======================= -->
        @else if (view() === 'pos') {
          <main class="page">
            <!-- POS TOP BAR -->
            <div class="pos-top-bar">
              <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                <div class="pos-meta-item">
                  <span class="pos-meta-label">Store</span>
                  <span class="pos-meta-val">{{ storeProfile().storeName || 'Active Store' }}</span>
                </div>
                <div class="pos-meta-item">
                  <span class="pos-meta-label">Register</span>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <select class="dash-select" style="padding:2px 8px;font-size:12px;height:26px;width:auto;" [ngModel]="activeRegisterId()" (ngModelChange)="switchRegister($event)">
                      @for (reg of posRegisters(); track reg.id || reg._id) {
                        <option [value]="reg.id || reg._id">{{ reg.name }} ({{ reg.registerNumber }})</option>
                      }
                    </select>
                    <button class="btn btn-ghost btn-sm" style="padding:2px 7px;font-size:12px;" type="button" title="Add Register" (click)="newRegisterModalOpen.set(true)">+</button>
                  </div>
                </div>
                <div class="pos-meta-item">
                  <span class="pos-meta-label">Cashier</span>
                  <span class="pos-meta-val">{{ user()?.name || 'Staff' }}</span>
                </div>
                <div class="pos-meta-item">
                  <span class="pos-meta-label">Shift Status</span>
                  <span class="shift-status-pill" [class.open]="posShift()" [class.closed]="!posShift()">
                    {{ posShift() ? 'Shift Active (Open)' : 'Shift Closed' }}
                  </span>
                </div>
              </div>

              <div style="display:flex;gap:8px;align-items:center;">
                @if (posShift(); as shift) {
                  <button class="btn btn-ghost btn-sm" type="button" (click)="openCashMovementModal()">
                    <kc-icon name="wallet" [size]="14" /> Cash In / Out
                  </button>
                  <button class="btn btn-danger btn-sm" type="button" (click)="openCloseShiftModal()">
                    <kc-icon name="lock" [size]="14" /> End Shift
                  </button>
                } @else {
                  <button class="btn btn-primary btn-sm" type="button" (click)="posShiftModalOpen.set(true)">
                    <kc-icon name="plus" [size]="14" /> Open Register Shift
                  </button>
                }
              </div>
            </div>

            <!-- POS SUB-NAVIGATION (11 AREAS) -->
            <nav class="pos-subnav">
              <button type="button" class="pos-subnav-btn" [class.active]="posSubArea() === 'checkout'" (click)="setPosSubArea('checkout')">
                <kc-icon name="cart" [size]="13" /> Checkout
              </button>
              <button type="button" class="pos-subnav-btn" [class.active]="posSubArea() === 'orders'" (click)="setPosSubArea('orders')">
                <kc-icon name="clipboard" [size]="13" /> Orders ({{ posOrders().length }})
              </button>
              <button type="button" class="pos-subnav-btn" [class.active]="posSubArea() === 'products'" (click)="setPosSubArea('products')">
                <kc-icon name="box" [size]="13" /> Products
              </button>
              <button type="button" class="pos-subnav-btn" [class.active]="posSubArea() === 'customers'" (click)="setPosSubArea('customers')">
                <kc-icon name="users" [size]="13" /> Customers
              </button>
              <button type="button" class="pos-subnav-btn" [class.active]="posSubArea() === 'registers'" (click)="setPosSubArea('registers')">
                <kc-icon name="store" [size]="13" /> Registers
              </button>
              <button type="button" class="pos-subnav-btn" [class.active]="posSubArea() === 'shifts'" (click)="setPosSubArea('shifts')">
                <kc-icon name="clock" [size]="13" /> Shifts
              </button>
              <button type="button" class="pos-subnav-btn" [class.active]="posSubArea() === 'payments'" (click)="setPosSubArea('payments')">
                <kc-icon name="credit-card" [size]="13" /> Payments
              </button>
              <button type="button" class="pos-subnav-btn" [class.active]="posSubArea() === 'returns'" (click)="setPosSubArea('returns')">
                <kc-icon name="arrow-left" [size]="13" /> Returns / Refunds
              </button>
              <button type="button" class="pos-subnav-btn" [class.active]="posSubArea() === 'discounts'" (click)="setPosSubArea('discounts')">
                <kc-icon name="tag" [size]="13" /> Discounts
              </button>
              <button type="button" class="pos-subnav-btn" [class.active]="posSubArea() === 'reports'" (click)="setPosSubArea('reports')">
                <kc-icon name="bar-chart" [size]="13" /> Reports
              </button>
              <button type="button" class="pos-subnav-btn" [class.active]="posSubArea() === 'settings'" (click)="setPosSubArea('settings')">
                <kc-icon name="settings" [size]="13" /> Settings
              </button>
            </nav>

            <!-- A. POS CHECKOUT (3-COLUMN LAYOUT) -->
            @if (posSubArea() === 'checkout') {
              <div class="pos-checkout-grid">
                <!-- 1. LEFT: Product Catalog & Search -->
                <div class="pos-catalog-panel">
                  <div class="filter-bar" style="margin-top:0;margin-bottom:10px;">
                    <div class="filter-input" style="width:100%;">
                      <kc-icon name="search" [size]="14" />
                      <input placeholder="Search product name or SKU..." [ngModel]="posSearch()" (ngModelChange)="posSearch.set($event)" />
                    </div>
                  </div>

                  <!-- Category filter chips -->
                  <div style="display:flex;gap:5px;overflow-x:auto;padding-bottom:6px;margin-bottom:6px;">
                    <button type="button" class="tab-pill" [class.active]="posCategoryFilter() === 'ALL'" (click)="posCategoryFilter.set('ALL')">All</button>
                    <button type="button" class="tab-pill" [class.active]="posCategoryFilter() === 'Silk & Textiles'" (click)="posCategoryFilter.set('Silk & Textiles')">Silk</button>
                    <button type="button" class="tab-pill" [class.active]="posCategoryFilter() === 'Silver & Metalware'" (click)="posCategoryFilter.set('Silver & Metalware')">Silver</button>
                    <button type="button" class="tab-pill" [class.active]="posCategoryFilter() === 'Ceramics & Pottery'" (click)="posCategoryFilter.set('Ceramics & Pottery')">Ceramics</button>
                    <button type="button" class="tab-pill" [class.active]="posCategoryFilter() === 'Wood & Stone Carvings'" (click)="posCategoryFilter.set('Wood & Stone Carvings')">Wood</button>
                    <button type="button" class="tab-pill" [class.active]="posCategoryFilter() === 'Kampot Pepper & Spices'" (click)="posCategoryFilter.set('Kampot Pepper & Spices')">Spices</button>
                    <button type="button" class="tab-pill" [class.active]="posCategoryFilter() === 'Natural Wellness & Spa'" (click)="posCategoryFilter.set('Natural Wellness & Spa')">Wellness</button>
                  </div>

                  <div class="pos-product-grid">
                    @for (p of posFilteredProducts(); track p.id) {
                      <div class="pos-tile" (click)="addToPosCart(p)">
                        <img [src]="img(p.image)" [alt]="p.name" (error)="imgFallback($event)" />
                        <strong>{{ p.name }}</strong>
                        <div class="pos-tile-price">\${{ p.price }}</div>
                        <div class="pos-tile-stock" [style.color]="p.stock <= 3 ? 'var(--danger)' : 'var(--ink-400)'">
                          {{ p.stock > 0 ? (p.stock + ' in stock') : 'Out of Stock' }}
                        </div>
                      </div>
                    } @empty {
                      <div class="empty-state" style="grid-column:1/-1;padding:40px 0;">
                        <kc-icon name="box" [size]="24" />
                        <p>No products match your search or filter.</p>
                      </div>
                    }
                  </div>
                </div>

                <!-- 2. CENTER: Cart & Customer -->
                <div class="pos-cart-panel">
                  <!-- Customer Banner -->
                  <div class="pos-customer-banner">
                    @if (posAssignedCustomer(); as cust) {
                      <div style="min-width:0;flex:1;">
                        <span style="font-size:10px;text-transform:uppercase;color:var(--brand-700);font-weight:700;display:block;">Customer</span>
                        <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;">{{ cust.name }} {{ cust.phone ? '(' + cust.phone + ')' : '' }}</strong>
                      </div>
                      <button class="btn btn-ghost btn-sm" type="button" (click)="removeAssignedCustomer()" title="Remove customer">✕</button>
                    } @else {
                      <div>
                        <span style="color:var(--ink-500);font-size:11.5px;">Customer: <strong>Walk-in</strong></span>
                      </div>
                      <div style="display:flex;gap:4px;">
                        <button class="btn btn-ghost btn-sm" type="button" style="padding:2px 8px;font-size:11px;" (click)="quickCustomerModalOpen.set(true)">+ Quick Add</button>
                        <button class="btn btn-ghost btn-sm" type="button" style="padding:2px 8px;font-size:11px;" (click)="setPosSubArea('customers')">Select</button>
                      </div>
                    }
                  </div>

                  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
                    <h3 style="font-size:14px;margin:0;">Active Cart ({{ posCart().length }})</h3>
                    <div style="display:flex;gap:6px;">
                      <button class="btn btn-ghost btn-sm" type="button" (click)="clearPosCart()" [disabled]="posCart().length === 0">Clear</button>
                    </div>
                  </div>

                  <!-- Cart Lines -->
                  <div class="pos-cart-lines">
                    @for (item of posCart(); track item.product.id; let idx = $index) {
                      <div class="pos-cart-row">
                        <div style="min-width:0;flex:1;">
                          <strong style="display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ item.product.name }}</strong>
                          <span style="font-size:11px;color:var(--brand-700);">\${{ item.price.toFixed(2) }} ea</span>
                        </div>
                        <div class="qty-controls">
                          <button type="button" class="qty-btn" (click)="updatePosCartQty(idx, -1)">-</button>
                          <span style="font-weight:700;font-size:12px;min-width:18px;text-align:center;">{{ item.quantity }}</span>
                          <button type="button" class="qty-btn" (click)="updatePosCartQty(idx, 1)">+</button>
                          <span style="font-weight:700;font-size:12px;min-width:48px;text-align:right;">\${{ (item.price * item.quantity).toFixed(2) }}</span>
                          <button class="icon-btn" type="button" (click)="removeFromPosCart(idx)" title="Remove item"><kc-icon name="trash" [size]="12" /></button>
                        </div>
                      </div>
                    } @empty {
                      <div class="empty-state" style="padding:60px 0;">
                        <kc-icon name="cart" [size]="24" />
                        <p>No items in cart yet. Select products on the left to start checkout.</p>
                      </div>
                    }
                  </div>
                </div>

                <!-- 3. RIGHT: Summary & Tender -->
                <div class="pos-summary-panel">
                  <h3 style="font-size:14px;margin:0 0 10px;">Order Summary</h3>
                  
                  <div class="pos-summary-line">
                    <span>Subtotal</span>
                    <strong>\${{ posSubtotal().toFixed(2) }}</strong>
                  </div>
                  <div class="pos-summary-line">
                    <span>Discount ($)</span>
                    <input class="dash-input" style="width:75px;padding:3px 6px;height:24px;text-align:right" type="number" [ngModel]="posDiscount()" (ngModelChange)="posDiscount.set(+$event)" placeholder="0.00" />
                  </div>
                  <div class="pos-summary-line">
                    <span>Tax Rate</span>
                    <select class="dash-select" style="width:85px;padding:2px 6px;height:24px" [ngModel]="posTaxRate()" (ngModelChange)="posTaxRate.set(+$event)">
                      <option [value]="0">0% (None)</option>
                      <option [value]="10">10% (VAT)</option>
                    </select>
                  </div>
                  @if (posTaxRate() > 0) {
                    <div class="pos-summary-line">
                      <span>Tax Amount</span>
                      <span>\${{ posTaxAmount().toFixed(2) }}</span>
                    </div>
                  }

                  <div class="total-display-card">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.85;">Total Due</div>
                    <div class="total-display-val">\${{ posTotal().toFixed(2) }}</div>
                  </div>

                  <!-- Payment Method Toggle -->
                  <div style="margin:10px 0 6px;">
                    <label style="font-size:11.5px;font-weight:700;color:var(--ink-700);display:block;margin-bottom:4px;">Payment Method</label>
                    <div style="display:flex;gap:6px;">
                      <button type="button" class="tab-pill" style="flex:1;" [class.active]="posPaymentMethod() === 'CASH'" (click)="setPosPaymentMethod('CASH')">Cash Tender</button>
                      <button type="button" class="tab-pill" style="flex:1;" [class.active]="posPaymentMethod() === 'KHQR'" (click)="setPosPaymentMethod('KHQR')">Bakong KHQR</button>
                    </div>
                  </div>

                  <!-- Cash Tender Section -->
                  @if (posPaymentMethod() === 'CASH') {
                    <div style="margin-top:6px;">
                      <label style="font-size:11px;color:var(--ink-500);display:block;margin-bottom:3px;">Quick Tender Presets</label>
                      <div class="cash-presets">
                        <button type="button" class="cash-preset-btn" (click)="setCashPreset('EXACT')">Exact (\${{ posTotal().toFixed(2) }})</button>
                        <button type="button" class="cash-preset-btn" (click)="setCashPreset(5)">$5</button>
                        <button type="button" class="cash-preset-btn" (click)="setCashPreset(10)">$10</button>
                        <button type="button" class="cash-preset-btn" (click)="setCashPreset(20)">$20</button>
                        <button type="button" class="cash-preset-btn" (click)="setCashPreset(50)">$50</button>
                        <button type="button" class="cash-preset-btn" (click)="setCashPreset(100)">$100</button>
                      </div>

                      <label style="font-size:11px;color:var(--ink-500);display:block;margin-top:8px;margin-bottom:3px;">Cash Received ($)</label>
                      <input class="dash-input" type="number" [ngModel]="posCashReceived()" (ngModelChange)="posCashReceived.set(+$event)" placeholder="0.00" />
                      
                      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:13px;font-weight:700;color:var(--brand-700);background:var(--brand-50);padding:6px 10px;border-radius:var(--r-sm);">
                        <span>Change Due:</span>
                        <span>\${{ posChange().toFixed(2) }}</span>
                      </div>
                    </div>
                  } @else {
                    <!-- Bakong KHQR Section -->
                    <div style="background:#fff;border:1px solid #fecdd3;border-radius:var(--r-md);padding:12px;margin-top:8px;box-shadow:0 1px 3px rgba(225,29,72,0.08);">
                      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                        <div style="display:flex;align-items:center;gap:6px;">
                          <span style="background:#e11d48;color:#fff;font-size:10px;font-weight:900;padding:2px 6px;border-radius:4px;letter-spacing:0.5px;">BAKONG</span>
                          <span style="font-size:12.5px;font-weight:700;color:#881337;">Dynamic KHQR</span>
                        </div>
                        <span style="font-size:11px;font-weight:700;color:#e11d48;">\${{ posTotal().toFixed(2) }} USD</span>
                      </div>

                      @if (!posKhqrSession() && khqrNeedsSetup()) {
                        <!-- First-time setup: where KHQR payments should land -->
                        <p style="font-size:11.5px;color:var(--ink-600);margin:0 0 8px;line-height:1.4;">
                          Add your <strong>Bakong account ID</strong> once (find it in your ABA / ACLEDA / Wing app under "Bakong ID" or "KHQR"). Customers then pay straight into that account.
                        </p>
                        <input class="dash-input" placeholder="yourname@aba" [ngModel]="khqrForm().bakongAccountId" (ngModelChange)="khqrForm.set({...khqrForm(), bakongAccountId: $event})" />
                        <input class="dash-input" style="margin-top:6px;" maxlength="25" placeholder="Name shown to customers" [ngModel]="khqrForm().merchantName" (ngModelChange)="khqrForm.set({...khqrForm(), merchantName: $event})" />
                        <button type="button" class="btn btn-primary" style="width:100%;margin-top:8px;background:#e11d48;border-color:#e11d48;padding:8px;font-size:12.5px;"
                          [disabled]="savingKhqr() || !khqrForm().bakongAccountId.trim()" (click)="saveKhqrSettings()">
                          {{ savingKhqr() ? 'Saving…' : 'Save & turn on KHQR' }}
                        </button>
                      } @else if (!posKhqrSession()) {
                        <p style="font-size:11.5px;color:var(--ink-600);margin:0 0 10px;line-height:1.4;">
                          Shows a KHQR with the amount already filled in. The customer scans it with ABA, ACLEDA, Wing, Bakong or any Cambodian banking app.
                          @if (khqrSettings()?.configured) { <br/><span style="color:var(--ink-500);">Pays into <strong>{{ khqrSettings()!.bakongAccountId }}</strong> · <button type="button" style="border:0;background:none;padding:0;color:#e11d48;text-decoration:underline;cursor:pointer;font-size:11px;"(click)="posSubArea.set('settings')">change</button></span> }
                        </p>
                        <button
                          type="button"
                          class="btn btn-primary"
                          style="width:100%;background:#e11d48;border-color:#e11d48;padding:8px;font-size:12.5px;"
                          [disabled]="posCart().length === 0 || generatingKhqr()"
                          (click)="generatePosKhqr()"
                        >
                          @if (generatingKhqr()) {
                            <kc-icon name="loader" [size]="14" /> Generating KHQR...
                          } @else {
                            <kc-icon name="qrcode" [size]="14" /> Show KHQR for cart (\${{ posTotal().toFixed(2) }})
                          }
                        </button>

                        <!-- Quick charge: any amount, no products -->
                        <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #fecdd3;">
                          <label style="font-size:11px;color:var(--ink-500);display:block;margin-bottom:3px;">Or charge a custom amount (USD)</label>
                          <div style="display:flex;gap:6px;">
                            <input class="dash-input" style="flex:1;" type="number" min="0.01" step="0.01" placeholder="0.00"
                              [ngModel]="quickKhqrAmount()" (ngModelChange)="quickKhqrAmount.set($event === '' || $event === null ? null : +$event)"
                              (keydown.enter)="generateQuickKhqr()" />
                            <button type="button" class="btn btn-outline btn-sm" style="white-space:nowrap;"
                              [disabled]="!quickKhqrAmount() || quickKhqrAmount()! <= 0 || generatingKhqr()" (click)="generateQuickKhqr()">
                              <kc-icon name="qrcode" [size]="12" /> Show QR
                            </button>
                          </div>
                          <small style="font-size:10.5px;color:var(--ink-500);">For a deposit or a payment outside the cart. Not added to your sales records.</small>
                        </div>
                      } @else {
                        <!-- QR Display Active -->
                        <div style="background:#fff;border:1px solid #fda4af;border-radius:var(--r-sm);padding:10px;text-align:center;">
                          <div style="position:relative;display:inline-block;margin:0 auto;">
                            <img 
                              [src]="posKhqrSession()!.qrImage" 
                              alt="Bakong KHQR" 
                              style="width:190px;height:190px;display:block;margin:0 auto;border-radius:4px;image-rendering:pixelated;" 
                            />
                            @if (posKhqrPaid()) {
                              <div style="position:absolute;inset:0;background:rgba(22,101,52,0.92);border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;">
                                <kc-icon name="check-circle" [size]="40" />
                                <strong style="font-size:14px;margin-top:6px;">PAYMENT RECEIVED!</strong>
                              </div>
                            }
                          </div>

                          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:11px;color:var(--ink-500);background:#fff1f2;padding:4px 8px;border-radius:4px;">
                            <span>Ref: {{ posKhqrSession()!.tranId }}</span>
                            <span style="font-weight:700;color:#e11d48;">\${{ posKhqrSession()!.amount.toFixed(2) }}</span>
                          </div>

                          <!-- Live Status Polling Indicator -->
                          <div style="margin-top:8px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11.5px;">
                            @if (posKhqrSession()!.mode === 'BAKONG' && !posKhqrPaid()) {
                              <span style="color:var(--ink-700);font-weight:500;">Check your bank app for the payment, then confirm.</span>
                            } @else if (checkingKhqrPayment()) {
                              <kc-icon name="loader" [size]="13" />
                              <span style="color:#e11d48;font-weight:600;">Verifying with ABA PayWay...</span>
                            } @else if (posKhqrPaid()) {
                              <span style="color:var(--success);font-weight:700;">✓ Verified & Confirmed</span>
                            } @else {
                              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#e11d48;border-radius:50%;"></span>
                              <span style="color:var(--ink-700);font-weight:500;">Waiting for customer scan...</span>
                            }
                          </div>

                          <!-- Action buttons for Cashier -->
                          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px;">
                            @if (posKhqrSession()!.mode === 'PAYWAY') {
                            <button
                              type="button"
                              class="btn btn-outline btn-sm"
                              style="font-size:11px;padding:5px;"
                              [disabled]="checkingKhqrPayment() || posKhqrPaid()"
                              (click)="checkPosKhqrPayment(true)"
                            >
                              <kc-icon name="refresh" [size]="12" /> Check Status
                            </button>
                            } @else {
                            <button type="button" class="btn btn-outline btn-sm" style="font-size:11px;padding:5px;" (click)="cancelPosKhqr()">
                              <kc-icon name="x" [size]="12" /> Cancel QR
                            </button>
                            }
                            <button 
                              type="button" 
                              class="btn btn-outline btn-sm" 
                              style="font-size:11px;padding:5px;"
                              (click)="showPosCustomerQrModal.set(true)"
                            >
                              <kc-icon name="external-link" [size]="12" /> Pop-out Display
                            </button>
                          </div>

                          <div style="display:flex;gap:6px;margin-top:6px;">
                            <button 
                              type="button" 
                              class="btn btn-ghost btn-sm" 
                              style="flex:1;font-size:10.5px;color:var(--ink-500);padding:4px;"
                              (click)="posKhqrSession()!.quick ? generateQuickKhqr(posKhqrSession()!.amount) : generatePosKhqr()"
                            >
                              <kc-icon name="refresh" [size]="11" /> Refresh QR
                            </button>
                            @if (posKhqrSession()!.mode === 'PAYWAY') {
                            <button
                              type="button"
                              class="btn btn-ghost btn-sm"
                              style="flex:1;font-size:10.5px;color:#1d4ed8;padding:4px;font-weight:600;"
                              (click)="simulatePosKhqrPayment()"
                            >
                              ⚡ Simulate Scan (sandbox)
                            </button>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }

                  @if (posOrderError()) {
                    <div style="color:var(--danger);background:var(--danger-bg);font-size:11.5px;margin-top:10px;padding:8px;border-radius:var(--r-sm);">
                      {{ posOrderError() }}
                    </div>
                  }

                  <!-- Primary Checkout Button -->
                  @if (posPaymentMethod() === 'CASH') {
                    <button 
                      class="btn btn-primary" 
                      type="button" 
                      style="width:100%;margin-top:14px;padding:11px;font-size:13.5px;" 
                      [disabled]="posCart().length === 0 || posProcessingOrder()"
                      (click)="submitPosOrder()"
                    >
                      {{ posProcessingOrder() ? 'Processing Sale...' : ('Complete Cash Sale · $' + posTotal().toFixed(2)) }}
                    </button>
                  } @else {
                    @if (!posKhqrSession()) {
                      <button 
                        class="btn btn-primary" 
                        type="button" 
                        style="width:100%;margin-top:14px;padding:11px;font-size:13.5px;background:#e11d48;border-color:#e11d48;" 
                        [disabled]="posCart().length === 0 || generatingKhqr()"
                        (click)="generatePosKhqr()"
                      >
                        {{ generatingKhqr() ? 'Generating Bakong QR...' : ('Generate Bakong QR · $' + posTotal().toFixed(2)) }}
                      </button>
                    } @else {
                      <button
                        class="btn btn-primary"
                        type="button"
                        style="width:100%;margin-top:14px;padding:11px;font-size:13.5px;background:#059669;border-color:#059669;"
                        [disabled]="(!posKhqrSession()!.quick && posCart().length === 0) || posProcessingOrder() || checkingKhqrPayment()"
                        (click)="confirmKhqrPaidAndComplete()"
                      >
                        {{ posProcessingOrder() ? 'Processing Sale...' : posKhqrSession()!.quick ? ('Payment received · $' + posKhqrSession()!.amount.toFixed(2)) : ('Confirm Paid & Complete Sale · $' + posTotal().toFixed(2)) }}
                      </button>
                    }
                    @if (posKhqrNotice()) {
                      <div style="color:var(--success);background:var(--brand-50);font-size:11.5px;margin-top:10px;padding:8px;border-radius:var(--r-sm);">{{ posKhqrNotice() }}</div>
                    }
                  }
                </div>
              </div>
            }

            <!-- B. POS ORDERS LIST -->
            @else if (posSubArea() === 'orders') {
              <div class="page-header" style="margin-bottom:12px;">
                <div>
                  <h2 style="font-size:16px;margin:0;">POS Order Transactions</h2>
                  <p class="muted" style="margin:0;">Auditable ledger of in-store sales, tenders, returns, and voided orders.</p>
                </div>
                <button class="btn btn-ghost btn-sm" type="button" (click)="loadPosOrders()"><kc-icon name="refresh" [size]="13" /> Refresh</button>
              </div>

              <article class="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>Receipt / Order #</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Cashier</th>
                      <th>Register</th>
                      <th>Tender</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Refunds</th>
                      <th style="text-align:right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (po of posOrders(); track po.id || po._id) {
                      <tr>
                        <td class="order-id">{{ po.orderNumber || po.id }}</td>
                        <td>{{ po.createdAt | date:'short' }}</td>
                        <td>{{ po.buyerName || 'Walk-in' }}</td>
                        <td>{{ po.cashierName || 'Staff' }}</td>
                        <td>{{ po.registerName || 'Main' }}</td>
                        <td><span class="pill">{{ po.paymentMethod }}</span></td>
                        <td><strong>\${{ po.totalAmount || po.myTotal }}</strong></td>
                        <td>
                          <span class="status" [class.delivered]="!po.isVoided" [class.cancelled]="po.isVoided">
                            {{ po.isVoided ? 'VOIDED' : (po.orderStatus || 'COMPLETED') }}
                          </span>
                        </td>
                        <td>
                          <span class="pill" [style.color]="po.refundStatus && po.refundStatus !== 'NONE' ? 'var(--danger)' : 'inherit'">
                            {{ po.refundStatus || 'NONE' }}
                          </span>
                        </td>
                        <td style="text-align:right;white-space:nowrap;">
                          <button class="btn btn-ghost btn-sm" type="button" style="padding:3px 7px;font-size:11px;" (click)="viewPosOrderReceipt(po)">Receipt</button>
                          @if (!po.isVoided && po.refundStatus !== 'FULL') {
                            <button class="btn btn-ghost btn-sm" type="button" style="padding:3px 7px;font-size:11px;margin-left:4px;" (click)="openRefundModal(po)">Return</button>
                          }
                          @if (!po.isVoided) {
                            <button class="btn btn-danger btn-sm" type="button" style="padding:3px 7px;font-size:11px;margin-left:4px;" (click)="openVoidModal(po)">Void</button>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="10" style="text-align:center;padding:36px;color:var(--ink-400);">No POS sales completed yet.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </article>
            }

            <!-- C. PRODUCTS INVENTORY -->
            @else if (posSubArea() === 'products') {
              <div class="page-header" style="margin-bottom:12px;">
                <div>
                  <h2 style="font-size:16px;margin:0;">In-Store Catalog Lookup</h2>
                  <p class="muted" style="margin:0;">Canonical product listings, live inventory availability, and pricing.</p>
                </div>
              </div>

              <div class="filter-bar" style="margin-top:0;">
                <div class="filter-input">
                  <kc-icon name="search" [size]="14" />
                  <input placeholder="Search products or SKU..." [ngModel]="posSearch()" (ngModelChange)="posSearch.set($event)" />
                </div>
              </div>

              <article class="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Category</th>
                      <th>Unit Price</th>
                      <th>Available Stock</th>
                      <th>Status</th>
                      <th style="text-align:right;">POS Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of posFilteredProducts(); track p.id) {
                      <tr>
                        <td>
                          <div style="display:flex;align-items:center;gap:10px;">
                            <img [src]="img(p.image)" [alt]="p.name" style="width:36px;height:36px;border-radius:4px;object-fit:cover;" (error)="imgFallback($event)" />
                            <strong>{{ p.name }}</strong>
                          </div>
                        </td>
                        <td><code>{{ p.sku || 'N/A' }}</code></td>
                        <td>{{ p.category }}</td>
                        <td><strong>\${{ p.price.toFixed(2) }}</strong></td>
                        <td>
                          <span style="font-weight:700;" [style.color]="p.stock <= 3 ? 'var(--danger)' : 'var(--ok)'">
                            {{ p.stock }} units
                          </span>
                        </td>
                        <td>
                          <span class="status" [class.delivered]="p.stock > 0" [class.cancelled]="p.stock === 0">
                            {{ p.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK' }}
                          </span>
                        </td>
                        <td style="text-align:right;">
                          <button class="btn btn-primary btn-sm" type="button" [disabled]="p.stock <= 0" (click)="addToPosCart(p); setPosSubArea('checkout')">+ Add to Cart</button>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="7" style="text-align:center;padding:36px;color:var(--ink-400);">No products found in catalog.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </article>
            }

            <!-- D. CUSTOMERS DIRECTORY -->
            @else if (posSubArea() === 'customers') {
              <div class="page-header" style="margin-bottom:12px;">
                <div>
                  <h2 style="font-size:16px;margin:0;">Store Customer Directory</h2>
                  <p class="muted" style="margin:0;">Customers who have purchased or interacted with your store. Strictly isolated.</p>
                </div>
                <button class="btn btn-primary btn-sm" type="button" (click)="quickCustomerModalOpen.set(true)">
                  <kc-icon name="plus" [size]="14" /> + New Customer
                </button>
              </div>

              <div class="filter-bar" style="margin-top:0;">
                <div class="filter-input">
                  <kc-icon name="search" [size]="14" />
                  <input placeholder="Search customer name, phone, email..." [ngModel]="customerSearch()" (ngModelChange)="customerSearch.set($event)" />
                </div>
              </div>

              <article class="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Orders Count</th>
                      <th>Total Spent</th>
                      <th>Last Order</th>
                      <th style="text-align:right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (cust of filteredCustomers(); track cust.id) {
                      <tr>
                        <td><strong>{{ cust.name }}</strong></td>
                        <td>{{ cust.phone || 'N/A' }}</td>
                        <td>{{ cust.email }}</td>
                        <td>{{ cust.ordersCount }}</td>
                        <td><strong style="color:var(--brand-700)">\${{ cust.totalSpent.toFixed(2) }}</strong></td>
                        <td>{{ cust.lastOrderDate | date:'mediumDate' }}</td>
                        <td style="text-align:right;">
                          <button class="btn btn-primary btn-sm" type="button" (click)="assignCustomerToCart(cust)">Assign to Cart</button>
                          <button class="btn btn-ghost btn-sm" type="button" style="margin-left:4px;" (click)="openCustomerDetail(cust)">Profile</button>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="7" style="text-align:center;padding:36px;color:var(--ink-400);">No customers recorded yet.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </article>
            }

            <!-- E. REGISTERS MANAGEMENT -->
            @else if (posSubArea() === 'registers') {
              <div class="page-header" style="margin-bottom:12px;">
                <div>
                  <h2 style="font-size:16px;margin:0;">Physical POS Registers</h2>
                  <p class="muted" style="margin:0;">Manage cashier terminals and active checkout stations.</p>
                </div>
                <button class="btn btn-primary btn-sm" type="button" (click)="newRegisterModalOpen.set(true)">
                  <kc-icon name="plus" [size]="14" /> + Add Register
                </button>
              </div>

              <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:14px;">
                @for (reg of posRegisters(); track reg.id || reg._id) {
                  <div class="card" style="padding:16px;display:flex;flex-direction:column;justify-content:space-between;" [style.borderColor]="(reg.id || reg._id) === activeRegisterId() ? 'var(--brand-700)' : 'var(--line)'">
                    <div>
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span class="pill" style="font-size:10.5px;">{{ reg.registerNumber || 'REG-01' }}</span>
                        @if ((reg.id || reg._id) === activeRegisterId()) {
                          <span class="shift-status-pill open" style="font-size:10.5px;">Current Terminal</span>
                        }
                      </div>
                      <h3 style="margin:0 0 4px;font-size:15px;">{{ reg.name }}</h3>
                      <p style="font-size:12px;color:var(--ink-500);margin:0 0 10px;">Location: {{ reg.location || 'Main Counter' }}</p>
                      <div style="font-size:12px;background:var(--canvas);padding:8px;border-radius:var(--r-sm);">
                        <div>Status: <strong>{{ reg.status || 'ACTIVE' }}</strong></div>
                        <div>Active Shift: <strong>{{ reg.currentShiftId ? 'In Progress' : 'None' }}</strong></div>
                      </div>
                    </div>
                    <div style="margin-top:14px;">
                      @if ((reg.id || reg._id) !== activeRegisterId()) {
                        <button class="btn btn-primary btn-sm" type="button" style="width:100%;" (click)="switchRegister(reg.id || reg._id)">Set as Active Terminal</button>
                      } @else {
                        <button class="btn btn-ghost btn-sm" type="button" style="width:100%;" disabled>Active</button>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            <!-- F. SHIFTS & RECONCILIATION -->
            @else if (posSubArea() === 'shifts') {
              <div class="page-header" style="margin-bottom:12px;">
                <div>
                  <h2 style="font-size:16px;margin:0;">Register Shifts &amp; Cash Reconciliation</h2>
                  <p class="muted" style="margin:0;">Audit cash drawer movements, starting floats, and end-of-shift cash reconciliation.</p>
                </div>
                <div style="display:flex;gap:8px;">
                  @if (posShift(); as s) {
                    <button class="btn btn-ghost btn-sm" type="button" (click)="openCashMovementModal()"><kc-icon name="wallet" [size]="14" /> Cash In / Out</button>
                    <button class="btn btn-danger btn-sm" type="button" (click)="openCloseShiftModal()"><kc-icon name="lock" [size]="14" /> End Shift</button>
                  } @else {
                    <button class="btn btn-primary btn-sm" type="button" (click)="posShiftModalOpen.set(true)"><kc-icon name="plus" [size]="14" /> Open Shift</button>
                  }
                </div>
              </div>

              <!-- Current Shift Card -->
              @if (posShift(); as s) {
                <div class="card" style="padding:16px;margin-bottom:16px;background:var(--surface);">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid var(--line-soft);padding-bottom:10px;">
                    <div>
                      <span class="shift-status-pill open" style="margin-right:8px;">Active Shift</span>
                      <strong style="font-size:14px;">Cashier: {{ s.cashierName || user()?.name }}</strong>
                      <span style="font-size:12px;color:var(--ink-500);margin-left:10px;">Opened: {{ s.openedAt | date:'medium' }}</span>
                    </div>
                    <div>Register: <strong>{{ s.registerName || activeRegister()?.name || 'Main' }}</strong></div>
                  </div>

                  <div class="dash-metrics" style="grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));margin-bottom:14px;">
                    <div class="metric-card">
                      <span class="metric-label">Starting Float</span>
                      <span class="metric-val">\${{ s.startingCash.toFixed(2) }}</span>
                    </div>
                    <div class="metric-card">
                      <span class="metric-label">Cash Sales</span>
                      <span class="metric-val">\${{ s.cashSales.toFixed(2) }}</span>
                    </div>
                    <div class="metric-card">
                      <span class="metric-label">KHQR Sales</span>
                      <span class="metric-val">\${{ s.khqrSales.toFixed(2) }}</span>
                    </div>
                    <div class="metric-card">
                      <span class="metric-label">Total Sales</span>
                      <span class="metric-val" style="color:var(--brand-700)">\${{ s.totalSales.toFixed(2) }}</span>
                    </div>
                    <div class="metric-card">
                      <span class="metric-label">Cash In / Out</span>
                      <span class="metric-val">+\${{ s.cashIn }} / -\${{ s.cashOut }}</span>
                    </div>
                    <div class="metric-card" style="border-color:var(--brand-600);background:var(--brand-50);">
                      <span class="metric-label" style="color:var(--brand-700)">Expected Drawer</span>
                      <span class="metric-val" style="color:var(--brand-800)">\${{ s.expectedCash.toFixed(2) }}</span>
                    </div>
                  </div>

                  <!-- Cash Movements Audit Log -->
                  <h4 style="font-size:13px;margin:12px 0 6px;">Cash Drawer Movements During Shift</h4>
                  <table style="margin-bottom:0;">
                    <thead>
                      <tr><th>Time</th><th>Movement Type</th><th>Amount</th><th>Reason / Note</th></tr>
                    </thead>
                    <tbody>
                      @for (m of s.cashMovements; track m.createdAt || $index) {
                        <tr>
                          <td>{{ m.createdAt | date:'shortTime' }}</td>
                          <td><span class="pill" [class.delivered]="m.type === 'IN'" [class.cancelled]="m.type === 'OUT'">{{ m.type }}</span></td>
                          <td><strong>\${{ m.amount.toFixed(2) }}</strong></td>
                          <td>{{ m.reason || 'N/A' }}</td>
                        </tr>
                      } @empty {
                        <tr><td colspan="4" style="text-align:center;color:var(--ink-400);padding:14px;">No cash adjustments recorded in this shift.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state" style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:30px;margin-bottom:16px;">
                  <kc-icon name="lock" [size]="28" />
                  <h3 style="margin:8px 0 4px;">Register Shift is Closed</h3>
                  <p>Open a new shift to begin recording sales, cash float movements, and register balance.</p>
                  <button class="btn btn-primary" type="button" style="margin-top:12px;" (click)="posShiftModalOpen.set(true)">+ Open Register Shift</button>
                </div>
              }

              <!-- Past Shifts History -->
              <h3 style="font-size:15px;margin:18px 0 10px;">Closed Shift History</h3>
              <article class="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>Shift ID</th>
                      <th>Opened</th>
                      <th>Closed</th>
                      <th>Cashier</th>
                      <th>Float</th>
                      <th>Total Sales</th>
                      <th>Expected</th>
                      <th>Actual Cash</th>
                      <th>Variance</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (sh of posShiftsList(); track sh.id || sh._id) {
                      <tr>
                        <td><code>{{ (sh.id || sh._id).slice(-6) }}</code></td>
                        <td>{{ sh.openedAt | date:'short' }}</td>
                        <td>{{ sh.closedAt ? (sh.closedAt | date:'short') : 'Open' }}</td>
                        <td>{{ sh.cashierName || 'Staff' }}</td>
                        <td>\${{ sh.startingCash }}</td>
                        <td><strong>\${{ sh.totalSales }}</strong></td>
                        <td>\${{ sh.expectedCash }}</td>
                        <td>\${{ sh.actualCash || sh.expectedCash }}</td>
                        <td>
                          <span style="font-weight:700;" [style.color]="(sh.variance || 0) < 0 ? 'var(--danger)' : 'var(--ok)'">
                            \${{ (sh.variance || 0).toFixed(2) }}
                          </span>
                        </td>
                        <td>{{ sh.notes || '-' }}</td>
                      </tr>
                    } @empty {
                      <tr><td colspan="10" style="text-align:center;padding:30px;color:var(--ink-400);">No past shifts recorded yet.</td></tr>
                    }
                  </tbody>
                </table>
              </article>
            }

            <!-- G. PAYMENTS TENDER BREAKDOWN -->
            @else if (posSubArea() === 'payments') {
              <div class="page-header" style="margin-bottom:12px;">
                <div>
                  <h2 style="font-size:16px;margin:0;">POS Payment Tender Rails</h2>
                  <p class="muted" style="margin:0;">Breakdown of Cash vs Bakong KHQR volumes and transactions.</p>
                </div>
              </div>

              <div class="dash-metrics" style="grid-template-columns:1fr 1fr;margin-bottom:16px;">
                <div class="metric-card" style="border-left:4px solid var(--ok);">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span class="metric-label">Cash Tenders</span>
                    <kc-icon name="wallet" [size]="20" />
                  </div>
                  <span class="metric-val" style="margin-top:8px;">\${{ (posReportsData()?.cashVolume || 0).toFixed(2) }}</span>
                  <p style="font-size:11.5px;color:var(--ink-500);margin:4px 0 0;">Physical currency in cash drawer</p>
                </div>
                <div class="metric-card" style="border-left:4px solid var(--info);">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span class="metric-label">Bakong KHQR Tenders</span>
                    <kc-icon name="credit-card" [size]="20" />
                  </div>
                  <span class="metric-val" style="margin-top:8px;">\${{ (posReportsData()?.khqrVolume || 0).toFixed(2) }}</span>
                  <p style="font-size:11.5px;color:var(--ink-500);margin:4px 0 0;">National Bank of Cambodia digital rails</p>
                </div>
              </div>

              <h3 style="font-size:15px;margin:16px 0 10px;">Recent POS Transactions</h3>
              <article class="table-card">
                <table>
                  <thead>
                    <tr><th>Receipt #</th><th>Date</th><th>Tender Rail</th><th>Amount</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    @for (po of posOrders(); track po.id || po._id) {
                      <tr>
                        <td class="order-id">{{ po.orderNumber || po.id }}</td>
                        <td>{{ po.createdAt | date:'medium' }}</td>
                        <td><span class="pill">{{ po.paymentMethod }}</span></td>
                        <td><strong>\${{ po.totalAmount || po.myTotal }}</strong></td>
                        <td><span class="status delivered">{{ po.orderStatus || 'COMPLETED' }}</span></td>
                      </tr>
                    } @empty {
                      <tr><td colspan="5" style="text-align:center;padding:30px;color:var(--ink-400);">No transactions yet.</td></tr>
                    }
                  </tbody>
                </table>
              </article>
            }

            <!-- H. RETURNS / REFUNDS -->
            @else if (posSubArea() === 'returns') {
              <div class="page-header" style="margin-bottom:12px;">
                <div>
                  <h2 style="font-size:16px;margin:0;">In-Store Returns &amp; Refunds</h2>
                  <p class="muted" style="margin:0;">Customer returns audit log and inventory restocking status.</p>
                </div>
                <button class="btn btn-ghost btn-sm" type="button" (click)="loadPosRefundsList()"><kc-icon name="refresh" [size]="13" /> Refresh</button>
              </div>

              <div class="dash-metrics" style="grid-template-columns:1fr 1fr;margin-bottom:16px;">
                <div class="metric-card">
                  <span class="metric-label">Total Refunded Amount</span>
                  <span class="metric-val" style="color:var(--danger)">-\${{ (posReportsData()?.totalRefunds || 0).toFixed(2) }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Processed Returns</span>
                  <span class="metric-val">{{ posReportsData()?.refundsCount || posRefundsList().length }}</span>
                </div>
              </div>

              <article class="table-card">
                <table>
                  <thead>
                    <tr><th>Refund #</th><th>Original Order #</th><th>Method</th><th>Items Restocked</th><th>Amount</th><th>Reason</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    @for (ref of posRefundsList(); track ref.id || ref._id) {
                      <tr>
                        <td><code>{{ ref.refundNumber || (ref.id || ref._id).slice(-6) }}</code></td>
                        <td class="order-id">{{ ref.orderNumber || ref.orderId }}</td>
                        <td><span class="pill">{{ ref.refundMethod }}</span></td>
                        <td>{{ ref.items?.length || 1 }} line(s)</td>
                        <td><strong style="color:var(--danger)">-\${{ ref.totalRefundAmount?.toFixed(2) }}</strong></td>
                        <td>{{ ref.reason }}</td>
                        <td>{{ ref.createdAt | date:'short' }}</td>
                      </tr>
                    } @empty {
                      <tr><td colspan="7" style="text-align:center;padding:30px;color:var(--ink-400);">No return records found.</td></tr>
                    }
                  </tbody>
                </table>
              </article>
            }

            <!-- I. DISCOUNTS & PROMOTIONS -->
            @else if (posSubArea() === 'discounts') {
              <div class="page-header" style="margin-bottom:12px;">
                <div>
                  <h2 style="font-size:16px;margin:0;">In-Store Promotions &amp; Discounts</h2>
                  <p class="muted" style="margin:0;">Active promotional discounts applicable at POS checkout.</p>
                </div>
                <button class="btn btn-primary btn-sm" type="button" (click)="showCreateDiscountModal.set(true)">
                  <kc-icon name="plus" [size]="14" /> + New Discount
                </button>
              </div>

              <article class="table-card">
                <table>
                  <thead>
                    <tr><th>Promotion Name</th><th>Discount</th><th>Applies To</th><th>Period</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    @for (p of filteredDiscounts(); track p.id) {
                      <tr>
                        <td><strong>{{ p.name }}</strong></td>
                        <td><span class="pill" style="color:var(--brand-700)">{{ p.type === 'PERCENTAGE' ? (p.value + '% OFF') : ('$' + p.value + ' OFF') }}</span></td>
                        <td>{{ p.appliesTo || 'ALL' }}</td>
                        <td>{{ p.startDate | date:'mediumDate' }} - {{ p.endDate | date:'mediumDate' }}</td>
                        <td><span class="status delivered">{{ p.status || 'ACTIVE' }}</span></td>
                        <td>
                          <button class="btn btn-danger btn-sm" type="button" (click)="deleteDiscount(p.id)">Delete</button>
                        </td>
                      </tr>
                    } @empty {
                      <tr><td colspan="6" style="text-align:center;padding:30px;color:var(--ink-400);">No promotions created yet.</td></tr>
                    }
                  </tbody>
                </table>
              </article>
            }

            <!-- J. REPORTS & Z-REPORT -->
            @else if (posSubArea() === 'reports') {
              <div class="page-header" style="margin-bottom:12px;">
                <div>
                  <h2 style="font-size:16px;margin:0;">POS Daily Z-Report &amp; Analytics</h2>
                  <p class="muted" style="margin:0;">End-of-day sales auditing, register variance, and top performing products.</p>
                </div>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-ghost btn-sm" type="button" (click)="loadPosReports()"><kc-icon name="refresh" [size]="13" /> Refresh</button>
                  <button class="btn btn-primary btn-sm" type="button" (click)="exportPosReportCsv()"><kc-icon name="download" [size]="14" /> Export CSV</button>
                </div>
              </div>

              @if (posReportsData(); as rep) {
                <div class="dash-metrics" style="grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));margin-bottom:16px;">
                  <div class="metric-card">
                    <span class="metric-label">Gross Sales</span>
                    <span class="metric-val">\${{ rep.grossSales.toFixed(2) }}</span>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">Total Refunds</span>
                    <span class="metric-val" style="color:var(--danger)">-\${{ rep.totalRefunds.toFixed(2) }}</span>
                  </div>
                  <div class="metric-card" style="border-color:var(--brand-600);background:var(--brand-50);">
                    <span class="metric-label" style="color:var(--brand-700)">Net Sales</span>
                    <span class="metric-val" style="color:var(--brand-800)">\${{ rep.netSales.toFixed(2) }}</span>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">Cash Tender</span>
                    <span class="metric-val">\${{ rep.cashVolume.toFixed(2) }}</span>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">KHQR Tender</span>
                    <span class="metric-val">\${{ rep.khqrVolume.toFixed(2) }}</span>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">Transactions</span>
                    <span class="metric-val">{{ rep.totalOrders }}</span>
                  </div>
                </div>

                <div class="two-cols" style="margin-top:16px;">
                  <div class="card" style="padding:16px;">
                    <h3 style="font-size:14.5px;margin:0 0 10px;">Top Selling In-Store Items</h3>
                    <table>
                      <thead>
                        <tr><th>Product</th><th>Units</th><th>Revenue</th></tr>
                      </thead>
                      <tbody>
                        @for (prod of rep.topProducts; track prod.name) {
                          <tr>
                            <td><strong>{{ prod.name }}</strong></td>
                            <td>{{ prod.units }} units</td>
                            <td><strong>\${{ prod.revenue.toFixed(2) }}</strong></td>
                          </tr>
                        } @empty {
                          <tr><td colspan="3" style="text-align:center;color:var(--ink-400);padding:20px;">No sales data available.</td></tr>
                        }
                      </tbody>
                    </table>
                  </div>

                  <div class="card" style="padding:16px;">
                    <h3 style="font-size:14.5px;margin:0 0 10px;">Z-Report Audit Summary</h3>
                    <div style="display:flex;flex-direction:column;gap:10px;font-size:13px;">
                      <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--line-soft);padding-bottom:6px;">
                        <span class="muted">Store Name</span><strong>{{ storeProfile().storeName }}</strong>
                      </div>
                      <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--line-soft);padding-bottom:6px;">
                        <span class="muted">Terminal Register</span><strong>{{ activeRegister()?.name || 'All Terminals' }}</strong>
                      </div>
                      <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--line-soft);padding-bottom:6px;">
                        <span class="muted">Total Discounts Given</span><strong>\${{ (rep.totalDiscounts || 0).toFixed(2) }}</strong>
                      </div>
                      <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--line-soft);padding-bottom:6px;">
                        <span class="muted">Total Tax Collected</span><strong>\${{ (rep.totalTax || 0).toFixed(2) }}</strong>
                      </div>
                      <div style="display:flex;justify-content:space-between;padding-top:4px;">
                        <span class="muted">Audit Compliance</span><strong style="color:var(--ok)">✓ Fully Balanced</strong>
                      </div>
                    </div>
                  </div>
                </div>
              } @else {
                <div class="empty-state" style="padding:40px 0;">
                  <kc-icon name="bar-chart" [size]="28" />
                  <p>Loading POS analytical reports...</p>
                </div>
              }
            }

            <!-- K. SETTINGS -->
            @else if (posSubArea() === 'settings') {
              <div class="page-header" style="margin-bottom:12px;">
                <div>
                  <h2 style="font-size:16px;margin:0;">POS Hardware &amp; Terminal Settings</h2>
                  <p class="muted" style="margin:0;">Receipt messages, default tax rates, and allowed tenders.</p>
                </div>
              </div>

              @if (posSettingsSaved()) {
                <div style="background:var(--ok-bg);color:var(--ok);padding:10px 14px;border-radius:var(--r-md);margin-bottom:14px;font-weight:600;font-size:13px;">
                  ✓ POS settings updated successfully.
                </div>
              }

              <div class="card" style="padding:20px;max-width:680px;">
                <div class="field-group">
                  <label>Default Assigned Register</label>
                  <select class="dash-select" [ngModel]="activeRegisterId()" (ngModelChange)="switchRegister($event)">
                    @for (r of posRegisters(); track r.id || r._id) {
                      <option [value]="r.id || r._id">{{ r.name }} ({{ r.registerNumber }})</option>
                    }
                  </select>
                </div>

                <div class="field-group">
                  <label>Default In-Store Tax Rate</label>
                  <select class="dash-select" [ngModel]="posSettings().defaultTax" (ngModelChange)="posSettings.set({...posSettings(), defaultTax: +$event})">
                    <option [value]="0">0% (Tax Exempt / Handcrafted Goods)</option>
                    <option [value]="10">10% (Cambodian VAT Standard)</option>
                  </select>
                </div>

                <div class="field-group">
                  <label>Printed Receipt Header Slogan</label>
                  <input class="dash-input" [ngModel]="posSettings().receiptHeader" (ngModelChange)="posSettings.set({...posSettings(), receiptHeader: $event})" />
                  <small class="muted">Prints at the top of customer sales receipts.</small>
                </div>

                <div class="field-group">
                  <label>Printed Receipt Footer Policy</label>
                  <textarea class="dash-textarea" [ngModel]="posSettings().receiptFooter" (ngModelChange)="posSettings.set({...posSettings(), receiptFooter: $event})"></textarea>
                  <small class="muted">Prints at the bottom of customer sales receipts (return/exchange terms).</small>
                </div>

                <div class="field-group">
                  <label>Allowed Payment Tenders</label>
                  <div style="display:flex;gap:16px;margin-top:6px;">
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                      <input type="checkbox" [checked]="posSettings().acceptCash" (change)="posSettings.set({...posSettings(), acceptCash: !posSettings().acceptCash})" />
                      <span>Cash In Drawer</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                      <input type="checkbox" [checked]="posSettings().acceptKhqr" (change)="posSettings.set({...posSettings(), acceptKhqr: !posSettings().acceptKhqr})" />
                      <span>Bakong Dynamic KHQR</span>
                    </label>
                  </div>
                </div>

                <div class="field-group" style="margin-top:14px;padding:12px;border:1px solid #fecdd3;border-radius:var(--r-md);">
                  <label>KHQR — your Bakong account</label>
                  <small class="muted" style="display:block;margin-bottom:6px;">In-store KHQR payments go straight into this account. Find your Bakong ID in your ABA, ACLEDA or Wing app (it looks like <strong>name&#64;aba</strong>).</small>
                  <input class="dash-input" placeholder="yourname@aba" [ngModel]="khqrForm().bakongAccountId" (ngModelChange)="khqrForm.set({...khqrForm(), bakongAccountId: $event})" />
                  <div style="display:grid;grid-template-columns:2fr 1fr;gap:6px;margin-top:6px;">
                    <input class="dash-input" maxlength="25" placeholder="Name shown to customers" [ngModel]="khqrForm().merchantName" (ngModelChange)="khqrForm.set({...khqrForm(), merchantName: $event})" />
                    <input class="dash-input" maxlength="15" placeholder="City" [ngModel]="khqrForm().city" (ngModelChange)="khqrForm.set({...khqrForm(), city: $event})" />
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
                    <button class="btn btn-outline btn-sm" type="button" [disabled]="savingKhqr()" (click)="saveKhqrSettings()">{{ savingKhqr() ? 'Saving…' : 'Save KHQR account' }}</button>
                    @if (khqrSettings()?.configured) { <span style="font-size:12px;color:var(--success);">✓ KHQR is on</span> }
                  </div>
                </div>

                <div style="margin-top:20px;">
                  <button class="btn btn-primary" type="button" (click)="savePosSettings()">Save POS Settings</button>
                </div>
              </div>
            }
          </main>
        }

        <!-- ======================= 8. CUSTOMERS ======================= -->
        @else if (view() === 'customers') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Customers</h1>
                <p class="muted">Clients who have purchased items from your store. Isolated strictly to your storefront.</p>
              </div>
            </div>

            <div class="filter-bar">
              <div class="filter-input">
                <kc-icon name="search" [size]="15" />
                <input placeholder="Search customers by name, email, or phone..." [ngModel]="customerSearch()" (ngModelChange)="customerSearch.set($event)" />
              </div>
              <div class="tab-pills">
                <button type="button" class="tab-pill" [class.active]="customerStatusFilter() === 'ALL'" (click)="customerStatusFilter.set('ALL')">All Customers</button>
                <button type="button" class="tab-pill" [class.active]="customerStatusFilter() === 'ACTIVE'" (click)="customerStatusFilter.set('ACTIVE')">Active Buyers</button>
              </div>
            </div>

            <article class="table-card">
              <table>
                <thead>
                  <tr><th>Customer Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Total Spent</th><th>Last Order</th><th>Status</th><th style="text-align:right">Action</th></tr>
                </thead>
                <tbody>
                  @for (c of filteredCustomers(); track c.id) {
                    <tr style="cursor:pointer;" (click)="openCustomerDetail(c)">
                      <td><strong>{{ c.name }}</strong></td>
                      <td>{{ c.email }}</td>
                      <td>{{ c.phone || 'N/A' }}</td>
                      <td>{{ c.ordersCount }} order(s)</td>
                      <td><strong>\${{ c.totalSpent.toFixed(2) }}</strong></td>
                      <td>{{ c.lastOrderDate | date:'mediumDate' }}</td>
                      <td><span class="status" [class.delivered]="c.status === 'ACTIVE'" [class.pending]="c.status !== 'ACTIVE'">{{ c.status }}</span></td>
                      <td style="text-align:right;">
                        <button class="btn btn-ghost btn-sm" type="button" (click)="openCustomerDetail(c); $event.stopPropagation()">View CRM</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </article>
          </main>
        }

        <!-- ======================= 9. REVIEWS ======================= -->
        @else if (view() === 'reviews') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Customer Reviews</h1>
                <p class="muted">Buyer feedback and artisan craftsmanship ratings.</p>
              </div>
            </div>

            <article class="table-card">
              <table>
                <thead>
                  <tr><th>Buyer</th><th>Product</th><th>Rating</th><th>Review</th><th>Date</th></tr>
                </thead>
                <tbody>
                  @for (r of filteredReviews(); track r.id || r._id) {
                    <tr>
                      <td><strong>{{ r.name || r.userName }}</strong></td>
                      <td>{{ r.product || 'Artisan Goods' }}</td>
                      <td><strong style="color:var(--warn)">★ {{ r.rating }} / 5</strong></td>
                      <td>{{ r.text || r.comment }}</td>
                      <td>{{ r.date || (r.createdAt | date:'mediumDate') }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </article>
          </main>
        }

        <!-- ======================= 10. PROMOTIONS ======================= -->
        @else if (view() === 'promotions') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Store Discounts &amp; Promotions</h1>
                <p class="muted">Manage coupon codes, percentage discounts, and seasonal markdown campaigns.</p>
              </div>
              <button class="btn btn-primary" type="button" (click)="showCreateDiscountModal.set(true)">
                <kc-icon name="plus" [size]="14" /> Create Promotion
              </button>
            </div>

            <div class="filter-bar">
              <div class="tab-pills">
                <button type="button" class="tab-pill" [class.active]="discountTab() === 'ACTIVE'" (click)="discountTab.set('ACTIVE')">Active</button>
                <button type="button" class="tab-pill" [class.active]="discountTab() === 'SCHEDULED'" (click)="discountTab.set('SCHEDULED')">Scheduled</button>
                <button type="button" class="tab-pill" [class.active]="discountTab() === 'EXPIRED'" (click)="discountTab.set('EXPIRED')">Expired</button>
                <button type="button" class="tab-pill" [class.active]="discountTab() === 'ALL'" (click)="discountTab.set('ALL')">All</button>
              </div>
            </div>

            <article class="table-card">
              <table>
                <thead>
                  <tr><th>Promotion Name</th><th>Coupon Code</th><th>Discount</th><th>Applies To</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Used</th><th style="text-align:right">Action</th></tr>
                </thead>
                <tbody>
                  @for (d of filteredDiscounts(); track d.id || d._id) {
                    <tr>
                      <td><strong>{{ d.name }}</strong></td>
                      <td><code>{{ d.code }}</code></td>
                      <td><strong>{{ d.type === 'PERCENTAGE' ? (d.value + '%') : ('$' + d.value) }}</strong></td>
                      <td>{{ d.appliesTo === 'ALL' ? 'All Products' : 'Selected Products' }}</td>
                      <td>{{ d.startDate | date:'mediumDate' }}</td>
                      <td>{{ d.endDate | date:'mediumDate' }}</td>
                      <td><span class="status" [class.delivered]="d.status === 'ACTIVE'" [class.pending]="d.status === 'SCHEDULED'" [class.cancelled]="d.status === 'EXPIRED'">{{ d.status }}</span></td>
                      <td>{{ d.usageCount || 0 }} times</td>
                      <td style="text-align:right;">
                        <button class="icon-btn" type="button" (click)="deleteDiscount(d.id || d._id)" title="Delete"><kc-icon name="trash" [size]="14" /></button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </article>
          </main>
        }

        <!-- ======================= 11. ADVERTISEMENTS ======================= -->
        @else if (view() === 'advertisements') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Marketplace Advertisements</h1>
                <p class="muted">Purchase premium promotional placements on the KhmerCraft Homepage Carousel &amp; Brand Spotlight.</p>
              </div>
              <button class="btn btn-primary" type="button" (click)="openApplyPromoModal()">
                <kc-icon name="plus" [size]="14" /> Request Advertisement
              </button>
            </div>

            <!-- Active Campaigns Banner -->
            <section style="margin-bottom:24px;">
              <h2 style="font-size:16px;margin:0 0 10px;">Available Placements &amp; Events</h2>
              <div class="campaigns-grid">
                @for (c of promoCampaigns(); track c._id || c.id) {
                  <article class="campaign-card">
                    <div>
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span class="pill">{{ c.kicker || 'SPONSORED' }}</span>
                        <span class="campaign-rate" style="font-weight:700;color:var(--ok);">
                          {{ c.isFree ? ((c.freeDays || 7) + ' Days Free (1 Week)') : ('$' + (c.dailyRate || 3) + '/day') }}
                        </span>
                      </div>
                      <h3 style="font-size:15px;margin:0 0 4px;">{{ c.title }}</h3>
                      <p style="font-size:12px;color:var(--ink-500);margin:0 0 8px;">{{ c.description }}</p>
                      @if (c.isFree) {
                        <div style="font-size:11px;color:var(--ink-400);margin-bottom:12px;">
                          1st week ({{ c.freeDays || 7 }} days) is 100% Free · Extra days: \${{ c.dailyRate || 3 }}/day
                        </div>
                      }
                    </div>
                    <button class="btn btn-primary btn-sm" type="button" (click)="openApplyPromoModal(c._id || c.id)">Apply for this Slot</button>
                  </article>
                }
              </div>
            </section>

            <!-- My Advertisements Table -->
            <article class="table-card">
              <div class="payout-head">
                <h2>My Advertisement Requests</h2>
              </div>
              <table>
                <thead>
                  <tr><th>Placement / Title</th><th>Destination</th><th>Duration</th><th>Daily Rate</th><th>Total</th><th>Status</th><th style="text-align:right">Action</th></tr>
                </thead>
                <tbody>
                  @for (slide of myPromoSlides(); track slide._id || slide.id) {
                    <tr>
                      <td>
                        <strong>{{ slide.title }}</strong>
                        <div style="font-size:11px;color:var(--ink-400)">{{ slide.subtitle }}</div>
                      </td>
                      <td>{{ slide.targetType === 'PRODUCT' ? 'Specific Product' : 'Storefront' }}</td>
                      <td>
                        <strong>{{ slide.days }} days</strong>
                        <div style="font-size:11px;color:var(--ink-400)">
                          {{ slide.totalPrice === 0 ? '100% Free' : ((slide.days - (slide.freeDays || 7)) + ' extra days') }}
                        </div>
                      </td>
                      <td>\${{ slide.dailyRate }}/day</td>
                      <td>
                        <strong [style.color]="slide.totalPrice === 0 ? 'var(--ok)' : undefined">
                          {{ slide.totalPrice === 0 ? 'FREE ($0)' : ('$' + slide.totalPrice) }}
                        </strong>
                      </td>
                      <td>
                        <span class="status"
                          [class.draft]="slide.status === 'DRAFT'"
                          [class.delivered]="(slide.status === 'APPROVED' && (slide.isPaid || slide.totalPrice === 0)) || slide.status === 'LIVE'"
                          [class.pending]="slide.status === 'PENDING_APPROVAL' || (slide.status === 'APPROVED' && !slide.isPaid && slide.totalPrice > 0)"
                          [class.cancelled]="slide.status === 'REJECTED'">
                          {{ slide.status === 'DRAFT' ? 'Draft' : slide.status === 'PENDING_APPROVAL' ? 'Pending Review' : (slide.status === 'APPROVED' && !slide.isPaid && slide.totalPrice > 0) ? 'Payment Pending' : (slide.status === 'APPROVED') ? 'Approved & Scheduled' : slide.status }}
                        </span>
                      </td>
                      <td style="text-align:right;">
                        <div style="display:inline-flex;gap:6px;justify-content:flex-end;">
                          @if (slide.status === 'DRAFT') {
                            <button class="btn btn-outline btn-sm" type="button" (click)="editPromoSlide(slide)">Edit</button>
                            <button class="btn btn-primary btn-sm" type="button" (click)="submitDraftPromo(slide)">Submit</button>
                            <button class="btn btn-danger btn-sm" type="button" (click)="deletePromoSlide(slide)">Delete</button>
                          } @else if (slide.status === 'APPROVED' && !slide.isPaid && slide.totalPrice > 0) {
                            <button class="btn btn-primary btn-sm" type="button" (click)="openKhqrPaymentModal(slide)">Pay via KHQR</button>
                          } @else if (slide.totalPrice === 0 && slide.status === 'APPROVED') {
                            <span class="status delivered" style="font-size:11px;">Free Ad Active</span>
                          } @else {
                            <span style="font-size:12px;color:var(--ink-400)">-</span>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </article>
          </main>
        }

        <!-- ======================= 12. STOREFRONT ======================= -->
        @else if (view() === 'storefront') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Storefront &amp; Domain</h1>
                <p class="muted">Manage your public storefront profile, theme, and branding settings.</p>
              </div>
              <a class="btn btn-primary" [href]="activeStorefrontUrl()" target="_blank">
                <kc-icon name="external" [size]="14" /> View Live Storefront
              </a>
            </div>

            <section class="two-cols" style="margin-top:16px;">
              <article class="form-card" style="padding:18px;">
                <h2 style="font-size:15px;margin:0 0 14px;">Storefront Status &amp; Domain</h2>
                <div class="field-group">
                  <label>Deployment Status</label>
                  <div><span class="status delivered">Active &amp; Published</span></div>
                </div>
                <div class="field-group">
                  <label>Marketplace Domain</label>
                  <input class="dash-input" [value]="activeStorefrontUrl()" readonly style="background:var(--canvas)" />
                </div>
                <div class="field-group" style="margin-top:12px;">
                  <label>Standalone Custom Domain</label>
                  <div style="background:var(--canvas);border:1px dashed var(--line);padding:14px;border-radius:var(--r-md);font-size:12.5px;color:var(--ink-500)">
                    <strong style="display:block;color:var(--ink-900);margin-bottom:4px;">No Standalone Website Required</strong>
                    Your store is fully operational and actively selling directly on the KhmerCraft Marketplace and in-store via POS. Custom domains can be configured on the Professional Plan.
                  </div>
                </div>
              </article>

              <article class="form-card" style="padding:18px;">
                <h2 style="font-size:15px;margin:0 0 14px;">Store Branding &amp; Bio</h2>
                <div class="field-group">
                  <label>Store Tagline</label>
                  <input class="dash-input" placeholder="e.g. Master silk weavers of Takeo" [ngModel]="storeProfile().storeTagline" (ngModelChange)="storeProfile.set({...storeProfile(), storeTagline: $event})" />
                </div>
                <div class="field-group">
                  <label>Store Story &amp; Description</label>
                  <textarea class="dash-textarea" placeholder="Tell buyers about your heritage crafts..." [ngModel]="storeProfile().storeDescription" (ngModelChange)="storeProfile.set({...storeProfile(), storeDescription: $event})"></textarea>
                </div>
                <div class="field-group">
                  <label>Announcement Banner</label>
                  <input class="dash-input" placeholder="e.g. Free shipping on orders over $50" [ngModel]="storeProfile().announcement" (ngModelChange)="storeProfile.set({...storeProfile(), announcement: $event})" />
                </div>
                <button class="btn btn-primary" type="button" (click)="saveStoreProfile()" [disabled]="savingProfile()">
                  {{ savingProfile() ? 'Saving...' : 'Save Storefront Settings' }}
                </button>
              </article>
            </section>
          </main>
        }

        <!-- ======================= 13. FINANCE / SALES & PAYOUTS ======================= -->
        @else if (view() === 'sales') {
          <main class="page payouts-min">
            <div class="page-header">
              <div>
                <h1>Payouts</h1>
                <p class="muted">Your earnings from online orders, paid to your bank.</p>
              </div>
              <button class="btn btn-ghost btn-sm" type="button" (click)="loadPayouts()"><kc-icon name="refresh" [size]="13" /> Refresh</button>
            </div>

            @if (payoutError()) {
              <p class="pm-error">{{ payoutError() }}</p>
            }

            @if (payoutSummary(); as ps) {
              <!-- Balance -->
              <section class="pm-hero">
                <div>
                  <span class="pm-label">{{ ps.balance.available < 0 ? 'You owe (cash-order commission)' : 'Ready to pay out' }}</span>
                  <strong class="pm-amount">{{ ps.balance.available < 0 ? '-' : '' }}\${{ abs(ps.balance.available).toFixed(2) }}</strong>
                  <span class="pm-sub">
                    @if (!ps.account) { Add a payout account to get paid }
                    @else if (ps.account.status !== 'VERIFIED') { Paid once your account is verified }
                    @else { Next payout {{ ps.settings.nextPayoutDate | date: 'EEEE, MMM d' }} }
                  </span>
                </div>
                <dl class="pm-stats">
                  <div><dt>On hold</dt><dd>\${{ ps.balance.onHold.toFixed(2) }}</dd></div>
                  <div><dt>Awaiting delivery</dt><dd>\${{ ps.balance.pendingDelivery.toFixed(2) }}</dd></div>
                  <div><dt>Paid to you</dt><dd>\${{ ps.balance.paidOut.toFixed(2) }}</dd></div>
                </dl>
              </section>

              <!-- Payout account -->
              <section class="pm-card">
                @if (ps.account && !editingPayoutAccount()) {
                  <div class="pm-account">
                    <kc-icon name="bank" [size]="18" />
                    <div class="pm-account-text">
                      <strong>{{ payoutMethodLabel(ps.account.method, ps.account.bankName) }} · {{ ps.account.accountNumber }}</strong>
                      <span>{{ ps.account.accountName }}</span>
                    </div>
                    <span class="pm-pill" [class.ok]="ps.account.status === 'VERIFIED'" [class.bad]="ps.account.status === 'REJECTED'">
                      {{ ps.account.status === 'VERIFIED' ? 'Verified' : ps.account.status === 'REJECTED' ? 'Needs changes' : 'Being verified' }}
                    </span>
                    <button class="pm-link" type="button" (click)="startEditPayoutAccount()">Change</button>
                  </div>
                  @if (ps.account.status === 'REJECTED' && ps.account.rejectionReason) {
                    <p class="pm-error" style="margin:12px 0 0">{{ ps.account.rejectionReason }}</p>
                  }
                } @else {
                  <h2 class="pm-h2">{{ ps.account ? 'Change payout account' : 'Where should we send your money?' }}</h2>
                  <div class="pm-form">
                    <label>
                      <span>Bank</span>
                      <select class="dash-select" [ngModel]="payoutForm().method" (ngModelChange)="payoutForm.set({...payoutForm(), method: $event})">
                        <option value="ABA">ABA Bank</option>
                        <option value="ACLEDA">ACLEDA Bank</option>
                        <option value="WING">Wing Bank</option>
                        <option value="OTHER_BANK">Other bank</option>
                      </select>
                    </label>
                    @if (payoutForm().method === 'OTHER_BANK') {
                      <label>
                        <span>Bank name</span>
                        <input class="dash-input" maxlength="80" placeholder="e.g. Canadia Bank" [ngModel]="payoutForm().bankName" (ngModelChange)="payoutForm.set({...payoutForm(), bankName: $event})" />
                      </label>
                    }
                    <label>
                      <span>Account name</span>
                      <input class="dash-input" maxlength="120" placeholder="As shown by your bank" [ngModel]="payoutForm().accountName" (ngModelChange)="payoutForm.set({...payoutForm(), accountName: $event})" />
                    </label>
                    <label>
                      <span>Account number</span>
                      <input class="dash-input" inputmode="numeric" maxlength="40" placeholder="000 000 000" [ngModel]="payoutForm().accountNumber" (ngModelChange)="payoutForm.set({...payoutForm(), accountNumber: $event})" />
                    </label>
                  </div>
                  <div class="pm-khqr">
                    @if (payoutForm().khqrImage) {
                      <img [src]="payoutForm().khqrImage" alt="Your KHQR" />
                      <button class="pm-link" type="button" (click)="payoutForm.set({...payoutForm(), khqrImage: null})">Remove KHQR</button>
                    } @else {
                      <label class="pm-link pm-upload">
                        + Add your KHQR image (optional)
                        <input type="file" accept="image/png,image/jpeg,image/webp" (change)="onPayoutKhqrFile($event)" />
                      </label>
                    }
                  </div>
                  <div class="pm-actions">
                    <button class="btn btn-primary" type="button" [disabled]="savingPayoutAccount() || !payoutForm().accountName.trim() || !payoutForm().accountNumber.trim()" (click)="savePayoutAccount()">
                      {{ savingPayoutAccount() ? 'Saving…' : 'Save account' }}
                    </button>
                    @if (ps.account) { <button class="btn btn-ghost" type="button" (click)="editingPayoutAccount.set(false)">Cancel</button> }
                  </div>
                  <p class="pm-fine">KhmerCraft checks every new or changed account before sending money to it.</p>
                }
              </section>

              <!-- History / waiting orders -->
              <section class="pm-card pm-flush">
                <div class="pm-tabs" role="tablist">
                  <button type="button" role="tab" [class.active]="payoutTab() === 'history'" (click)="payoutTab.set('history')">Payouts</button>
                  <button type="button" role="tab" [class.active]="payoutTab() === 'orders'" (click)="payoutTab.set('orders')">
                    Waiting orders @if (ps.lines.length) { <span class="pm-count">{{ ps.lines.length }}</span> }
                  </button>
                </div>

                @if (payoutTab() === 'history') {
                  @if (!ps.payouts.length) {
                    <p class="pm-empty">No payouts yet.</p>
                  } @else {
                    @for (po of ps.payouts; track po.id) {
                      <div class="pm-row">
                        <div class="pm-row-main">
                          <strong>\${{ po.amount.toFixed(2) }}</strong>
                          <span>{{ (po.paidAt || po.createdAt) | date: 'MMM d, y' }} · {{ po.orderCount }} order{{ po.orderCount === 1 ? '' : 's' }} · \${{ po.commissionTotal.toFixed(2) }} fee</span>
                        </div>
                        <span class="pm-pill" [class.ok]="po.status === 'PAID'" [class.bad]="po.status === 'CANCELLED'">
                          {{ po.status === 'PAID' ? 'Paid' : po.status === 'PENDING' ? 'Processing' : 'Cancelled' }}
                        </span>
                        @if (po.hasProof) { <button class="pm-link" type="button" (click)="openPayoutReceipt(po.id)">Receipt</button> }
                      </div>
                    }
                  }
                } @else {
                  @if (!ps.lines.length) {
                    <p class="pm-empty">Nothing waiting. Delivered orders show here until they're paid out.</p>
                  } @else {
                    @for (l of ps.lines; track l.orderId) {
                      <div class="pm-row">
                        <div class="pm-row-main">
                          <strong>{{ l.net < 0 ? '-' : '' }}\${{ abs(l.net).toFixed(2) }}</strong>
                          <span>{{ l.orderNumber }} · {{ l.collectedBy === 'SELLER' ? 'Cash on delivery (fee only)' : 'Online' }} · \${{ (l.gross - l.refunded).toFixed(2) }} sale</span>
                        </div>
                        <span class="pm-pill" [class.ok]="l.status === 'AVAILABLE'">
                          {{ l.status === 'AVAILABLE' ? 'Ready' : 'Until ' + (l.releasesAt | date: 'MMM d') }}
                        </span>
                      </div>
                    }
                  }
                }
              </section>

              <details class="pm-how">
                <summary>How payouts work</summary>
                <ul>
                  <li>KhmerCraft keeps {{ ps.settings.commissionRate }}% of each product sale.</li>
                  <li>Online payments: we collect the money and send you the rest.</li>
                  <li>Cash on delivery: you keep the cash; the {{ ps.settings.commissionRate }}% comes off your next payout.</li>
                  <li>Money is released {{ ps.settings.holdDays }} days after delivery and paid {{ scheduleLabel(ps.settings) }} from \${{ ps.settings.minimumPayout.toFixed(2) }}.</li>
                  <li>In-store POS sales are yours directly and aren't included.</li>
                </ul>
              </details>
            } @else if (!payoutError()) {
              <p class="muted">Loading…</p>
            }
          </main>
        }

        <!-- ======================= 14. PAYMENTS ======================= -->
        @else if (view() === 'payments') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Payments Breakdown</h1>
                <p class="muted">Settlement volume and transactions categorized by payment rail.</p>
              </div>
            </div>

            <section class="metrics">
              <article class="metric">
                <div class="metric-icon"><kc-icon name="check" [size]="18" /></div>
                <span class="metric-label">ABA KHQR Volume</span>
                <strong>\${{ financeData().paymentsByMethod?.KHQR?.volume?.toFixed(2) || '0.00' }}</strong>
                <span class="metric-note">{{ financeData().paymentsByMethod?.KHQR?.count || 0 }} transactions</span>
              </article>
              <article class="metric">
                <div class="metric-icon"><kc-icon name="wallet" [size]="18" /></div>
                <span class="metric-label">Cash on Delivery (COD)</span>
                <strong>\${{ financeData().paymentsByMethod?.COD?.volume?.toFixed(2) || '0.00' }}</strong>
                <span class="metric-note">{{ financeData().paymentsByMethod?.COD?.count || 0 }} transactions</span>
              </article>
              <article class="metric">
                <div class="metric-icon"><kc-icon name="clipboard" [size]="18" /></div>
                <span class="metric-label">POS Register Cash</span>
                <strong>\${{ financeData().paymentsByMethod?.POS_CASH?.volume?.toFixed(2) || '0.00' }}</strong>
                <span class="metric-note">{{ financeData().paymentsByMethod?.POS_CASH?.count || 0 }} transactions</span>
              </article>
            </section>
          </main>
        }

        <!-- ======================= 15. TRANSACTIONS ======================= -->
        @else if (view() === 'transactions') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Financial Transactions Ledger</h1>
                <p class="muted">Complete chronological record of all orders, commissions, and settlements.</p>
              </div>
            </div>

            <article class="table-card">
              <table>
                <thead>
                  <tr><th>Date</th><th>Transaction ID</th><th>Channel</th><th>Method</th><th>Gross</th><th>Platform Fee</th><th>Net Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  @for (t of financeData().transactions || []; track t.id) {
                    <tr>
                      <td>{{ t.date | date:'short' }}</td>
                      <td class="order-id">{{ t.id }}</td>
                      <td><span class="pill">{{ t.channel }}</span></td>
                      <td>{{ t.method }}</td>
                      <td>\${{ t.amount.toFixed(2) }}</td>
                      <td style="color:var(--warn)">-\${{ t.fee.toFixed(2) }}</td>
                      <td><strong>\${{ t.net.toFixed(2) }}</strong></td>
                      <td><span class="status delivered">{{ t.status }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </article>
          </main>
        }

        <!-- ======================= 16. ANALYTICS ======================= -->
        @else if (view() === 'analytics') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Analytics &amp; Performance</h1>
                <p class="muted">Real metrics on sales, average order value, conversion, and top handcrafted items.</p>
              </div>
              <div class="tab-pills">
                <button type="button" class="tab-pill" [class.active]="analyticsPeriod() === 'today'" (click)="setAnalyticsPeriod('today')">Today</button>
                <button type="button" class="tab-pill" [class.active]="analyticsPeriod() === '7d'" (click)="setAnalyticsPeriod('7d')">7 Days</button>
                <button type="button" class="tab-pill" [class.active]="analyticsPeriod() === '30d'" (click)="setAnalyticsPeriod('30d')">30 Days</button>
                <button type="button" class="tab-pill" [class.active]="analyticsPeriod() === 'all'" (click)="setAnalyticsPeriod('all')">All Time</button>
              </div>
            </div>

            <section class="metrics">
              <article class="metric">
                <span class="metric-label">Total Revenue</span>
                <strong>\${{ analyticsData().totalSales?.toFixed(2) || '0.00' }}</strong>
                <span class="metric-note">{{ analyticsData().ordersCount || 0 }} total orders</span>
              </article>
              <article class="metric">
                <span class="metric-label">Average Order Value</span>
                <strong>\${{ analyticsData().aov?.toFixed(2) || '0.00' }}</strong>
                <span class="metric-note">Per checkout</span>
              </article>
              <article class="metric">
                <span class="metric-label">Marketplace Revenue</span>
                <strong>\${{ analyticsData().channels?.marketplace?.toFixed(2) || '0.00' }}</strong>
                <span class="metric-note">Online store</span>
              </article>
              <article class="metric">
                <span class="metric-label">POS In-Store Revenue</span>
                <strong>\${{ analyticsData().channels?.pos?.toFixed(2) || '0.00' }}</strong>
                <span class="metric-note">Physical counter</span>
              </article>
            </section>

            <article class="table-card" style="margin-top:20px;">
              <div class="payout-head">
                <h2>Top Performing Products</h2>
              </div>
              <table>
                <thead>
                  <tr><th>Product Name</th><th>Units Sold</th><th>Total Revenue Generated</th></tr>
                </thead>
                <tbody>
                  @for (tp of analyticsData().topProducts || []; track tp.name) {
                    <tr>
                      <td><strong>{{ tp.name }}</strong></td>
                      <td>{{ tp.soldCount }} units</td>
                      <td><strong>\${{ tp.revenue.toFixed(2) }}</strong></td>
                    </tr>
                  }
                </tbody>
              </table>
            </article>
          </main>
        }

        <!-- ======================= 17. REPORTS ======================= -->
        @else if (view() === 'reports') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Business Reports &amp; Exports</h1>
                <p class="muted">Generate and export downloadable CSV spreadsheets for accounting and bookkeeping.</p>
              </div>
              <button class="btn btn-primary" type="button" (click)="exportReportCSV()">
                <kc-icon name="download" [size]="14" /> Export CSV Spreadsheet
              </button>
            </div>

            <div class="filter-bar">
              <div class="field-group" style="margin:0;min-width:180px;">
                <label style="font-size:10.5px;">Report Type</label>
                <select class="filter-select" [ngModel]="reportType()" (ngModelChange)="reportType.set($event)">
                  <option value="sales">Sales &amp; Revenue Report</option>
                  <option value="orders">Orders Report</option>
                  <option value="products">Product Catalog Report</option>
                  <option value="inventory">Inventory Stock Report</option>
                  <option value="pos">POS Sales Report</option>
                  <option value="customers">Customer CRM Report</option>
                </select>
              </div>
            </div>

            <article class="table-card">
              <div class="payout-head">
                <h2>Report Preview ({{ reportType().toUpperCase() }})</h2>
              </div>
              <table>
                <thead>
                  <tr><th>Record #</th><th>Name / Description</th><th>Metric A</th><th>Metric B</th><th>Status / Date</th></tr>
                </thead>
                <tbody>
                  @for (row of reportPreviewData(); track row.col1; let idx = $index) {
                    <tr>
                      <td>{{ idx + 1 }}</td>
                      <td><strong>{{ row.col1 }}</strong></td>
                      <td>{{ row.col2 }}</td>
                      <td>{{ row.col3 }}</td>
                      <td>{{ row.col4 }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </article>
          </main>
        }

        <!-- ======================= 18. SUPPORT CASES ======================= -->
        @else if (view() === 'support') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Artisan Support Cases</h1>
                <p class="muted">Direct line to KhmerCraft Merchant Support for order disputes, moderation, or technical queries.</p>
              </div>
              <button class="btn btn-primary" type="button" (click)="showCreateCaseModal.set(true)">
                <kc-icon name="plus" [size]="14" /> New Support Case
              </button>
            </div>

            <article class="table-card">
              <table>
                <thead>
                  <tr><th>Case Number</th><th>Category</th><th>Subject</th><th>Priority</th><th>Status</th><th>Updated</th><th style="text-align:right">Action</th></tr>
                </thead>
                <tbody>
                  @for (sc of supportCases(); track sc.id || sc._id) {
                    <tr style="cursor:pointer;" (click)="openCaseDetail(sc)">
                      <td class="order-id">{{ sc.caseNumber }}</td>
                      <td><span class="pill">{{ sc.category }}</span></td>
                      <td><strong>{{ sc.subject }}</strong></td>
                      <td>{{ sc.priority }}</td>
                      <td><span class="status" [class.delivered]="sc.status === 'RESOLVED'" [class.pending]="sc.status === 'OPEN' || sc.status === 'IN_PROGRESS'">{{ sc.status }}</span></td>
                      <td>{{ sc.updatedAt | date:'mediumDate' }}</td>
                      <td style="text-align:right;">
                        <button class="btn btn-ghost btn-sm" type="button" (click)="openCaseDetail(sc); $event.stopPropagation()">View Thread</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </article>
          </main>
        }

        <!-- ======================= 19. NOTIFICATIONS ======================= -->
        @else if (view() === 'notifications') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Store Notifications</h1>
                <p class="muted">System updates regarding seller approvals, order events, and campaign reviews.</p>
              </div>
            </div>

            <article class="table-card">
              <table>
                <thead>
                  <tr><th>Type</th><th>Notification</th><th>Date</th></tr>
                </thead>
                <tbody>
                  @for (n of notifications(); track n.id) {
                    <tr>
                      <td style="width:120px;"><span class="pill">{{ n.type }}</span></td>
                      <td>
                        <strong>{{ n.title }}</strong>
                        <p style="margin:2px 0 0;color:var(--ink-500)">{{ n.message }}</p>
                      </td>
                      <td style="width:160px;color:var(--ink-400)">{{ n.createdAt | date:'short' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </article>
          </main>
        }

        <!-- ======================= 20. PROFILE ======================= -->
        @else if (view() === 'profile') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Store Profile</h1>
                <p class="muted">Public artisan biography, photos, location, and theme appearance.</p>
              </div>
              <button class="btn btn-primary" type="button" (click)="saveStoreProfile()" [disabled]="savingProfile()">
                {{ savingProfile() ? 'Saving...' : 'Save Profile Changes' }}
              </button>
            </div>

            <article class="form-card brand-editor">
              <input #coverInput type="file" hidden accept="image/jpeg,image/png,image/webp" (change)="changeStoreImage($event, 'bannerUrl')" />
              <input #logoInput type="file" hidden accept="image/jpeg,image/png,image/webp" (change)="changeStoreImage($event, 'logoUrl')" />
              <div class="brand-editor-head">
                <div>
                  <h2>Cover image &amp; profile picture</h2>
                  <p>These appear at the top of your storefront. A wide photo works best for the cover; a square logo for the picture.</p>
                </div>
              </div>
              <div class="brand-cover">
                @if (storeProfile().bannerUrl) { <img [src]="storeProfile().bannerUrl" alt="Store cover" /> }
                @else { <span class="store-hero-empty"><kc-icon name="image" [size]="16" /> No cover image yet</span> }
                <button class="btn btn-ghost" type="button" (click)="coverInput.click()"><kc-icon name="upload-cloud" [size]="14" /> {{ storeProfile().bannerUrl ? 'Change cover' : 'Upload cover' }}</button>
              </div>
              <div class="brand-logo-row">
                <div class="brand-logo">
                  @if (storeProfile().logoUrl) { <img [src]="storeProfile().logoUrl" alt="Store profile picture" /> } @else { {{ storeInitials() }} }
                </div>
                <div>
                  <strong>Profile picture</strong>
                  <span>JPG, PNG or WebP, up to 10 MB.</span>
                  <button class="btn btn-ghost" type="button" (click)="logoInput.click()"><kc-icon name="upload-cloud" [size]="14" /> {{ storeProfile().logoUrl ? 'Change picture' : 'Upload picture' }}</button>
                </div>
              </div>
              @if (storeImageError()) { <p class="brand-note error">{{ storeImageError() }}</p> }
              @else if (storeImageLoading()) { <p class="brand-note">Preparing your image…</p> }
              @else if (storeImagesDirty()) { <p class="brand-note pending">New image ready — click “Save Profile Changes” to publish it.</p> }
            </article>

            <div class="two-cols">
              <article class="form-card" style="padding:18px;">
                <h2 style="font-size:15px;margin:0 0 14px;">Store Identity</h2>
                <div class="field-group">
                  <label>Store Name</label>
                  <input class="dash-input" [ngModel]="storeProfile().storeName" (ngModelChange)="storeProfile.set({...storeProfile(), storeName: $event})" />
                </div>
                <div class="field-group">
                  <label>Store Tagline</label>
                  <input class="dash-input" [ngModel]="storeProfile().storeTagline" (ngModelChange)="storeProfile.set({...storeProfile(), storeTagline: $event})" />
                </div>
                <div class="field-group">
                  <label>Location / Province</label>
                  <input class="dash-input" [ngModel]="storeProfile().location" (ngModelChange)="storeProfile.set({...storeProfile(), location: $event})" />
                </div>
                <div class="field-group">
                  <label>Phone Number</label>
                  <input class="dash-input" [ngModel]="storeProfile().phoneNumber" (ngModelChange)="storeProfile.set({...storeProfile(), phoneNumber: $event})" />
                </div>
              </article>

              <article class="form-card" style="padding:18px;">
                <h2 style="font-size:15px;margin:0 0 14px;">Storefront Theme Color</h2>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                  @for (t of storefrontThemes; track t.value) {
                    <div 
                      style="border:1px solid var(--line);border-radius:var(--r-md);padding:10px;cursor:pointer;display:flex;align-items:center;gap:8px;"
                      [style.borderColor]="storeProfile().theme === t.value ? 'var(--brand-700)' : 'var(--line)'"
                      (click)="storeProfile.set({...storeProfile(), theme: t.value})"
                    >
                      <span [style.background]="t.color" style="width:16px;height:16px;border-radius:50%;display:inline-block"></span>
                      <strong>{{ t.label }}</strong>
                    </div>
                  }
                </div>
              </article>
            </div>
          </main>
        }

        <!-- ======================= 21. SETTINGS ======================= -->
        @else if (view() === 'settings') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Account Settings</h1>
                <p class="muted">Security, password management, and credentials.</p>
              </div>
            </div>

            <div class="two-cols">
              <article class="form-card" style="padding:18px;">
                <h2 style="font-size:15px;margin:0 0 14px;">User Account</h2>
                <div class="field-group">
                  <label>Account Name</label>
                  <input class="dash-input" [value]="user()?.name" disabled style="background:var(--canvas)" />
                </div>
                <div class="field-group">
                  <label>Email Address</label>
                  <input class="dash-input" [value]="user()?.email" disabled style="background:var(--canvas)" />
                </div>
              </article>

              <article class="form-card" style="padding:18px;">
                <h2 style="font-size:15px;margin:0 0 14px;">Change Password</h2>
                <div class="field-group">
                  <label>Current Password</label>
                  <input class="dash-input" type="password" [ngModel]="currentPassword()" (ngModelChange)="currentPassword.set($event)" />
                </div>
                <div class="field-group">
                  <label>New Password</label>
                  <input class="dash-input" type="password" [ngModel]="newPassword()" (ngModelChange)="newPassword.set($event)" />
                </div>
                <div class="field-group">
                  <label>Confirm Password</label>
                  <input class="dash-input" type="password" [ngModel]="confirmNewPassword()" (ngModelChange)="confirmNewPassword.set($event)" />
                </div>
                <button class="btn btn-ghost" type="button" (click)="updatePassword()">Update Password</button>
              </article>
            </div>
          </main>
        }

        <!-- ======================= 22. PLAN & BILLING ======================= -->
        @else if (view() === 'billing') {
          <main class="page">
            <div class="page-header">
              <div>
                <h1>Plan &amp; Billing</h1>
                <p class="muted">Manage your subscription, tier benefits, and billing receipts.</p>
              </div>
            </div>
            @if (myStoreId(); as storeId) {
              <app-seller-billing [storeId]="storeId" (planChanged)="loadMyStores(storeId)" />
            }
          </main>
        }
      </section>
    </div>

    <!-- Share links (product / store / categories) -->
    @if (shareDialog(); as dlg) {
      <kc-share-dialog [heading]="dlg.heading" [intro]="dlg.intro" [items]="dlg.items" (closed)="shareDialog.set(null)" />
    }

    <!-- 1. Order Detail Modal -->
    @if (selectedOrder(); as order) {
      <div class="backdrop" (click)="closeOrder()">
        <section class="modal modal-lg" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>Order Details #{{ order.id }}</h2>
            <button type="button" class="close" (click)="closeOrder()">×</button>
          </header>
          <div class="modal-body">
            <!-- Action Flow Banner for Seller -->
            @if (order.status === 'PENDING') {
              <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:var(--r-md);padding:14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                  <div style="display:flex;align-items:center;gap:6px;color:#065f46;font-weight:700;font-size:13.5px;">
                    <kc-icon name="bell" [size]="16" />
                    <span>New Order Placed — Waiting for Your Confirmation</span>
                  </div>
                  <p style="font-size:12px;color:#047857;margin:3px 0 0;">
                    Confirm this order to notify the buyer and begin packing the items listed below.
                  </p>
                </div>
                <button 
                  class="btn btn-primary" 
                  type="button" 
                  style="background:#059669;border-color:#059669;padding:8px 18px;font-size:13px;font-weight:700;"
                  [disabled]="updatingStatus()"
                  (click)="updateOrderStatusDirect('CONFIRMED')"
                >
                  {{ updatingStatus() ? 'Confirming...' : '✓ Confirm Order' }}
                </button>
              </div>
            } @else if (order.status === 'CONFIRMED') {
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--r-md);padding:14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                  <div style="display:flex;align-items:center;gap:6px;color:#1e40af;font-weight:700;font-size:13.5px;">
                    <kc-icon name="check-circle" [size]="16" />
                    <span>Order Confirmed — Pack &amp; Prepare For Dispatch</span>
                  </div>
                  <p style="font-size:12px;color:#1d4ed8;margin:3px 0 0;">
                    Buyer has been notified that you confirmed. Pack the purchased items below and mark as shipped when dispatched.
                  </p>
                </div>
                <button 
                  class="btn btn-primary" 
                  type="button" 
                  style="background:#2563eb;border-color:#2563eb;padding:8px 16px;font-size:12.5px;font-weight:600;"
                  [disabled]="updatingStatus()"
                  (click)="updateOrderStatusDirect('SHIPPED')"
                >
                  {{ updatingStatus() ? 'Dispatching...' : '📦 Mark as Shipped' }}
                </button>
              </div>
            } @else if (order.status === 'SHIPPED') {
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--r-md);padding:14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                  <div style="display:flex;align-items:center;gap:6px;color:#166534;font-weight:700;font-size:13.5px;">
                    <kc-icon name="truck" [size]="16" />
                    <span>In Transit to Customer</span>
                  </div>
                  <p style="font-size:12px;color:#15803d;margin:3px 0 0;">
                    Items are en route. Mark as delivered once customer handover is completed.
                  </p>
                </div>
                <button 
                  class="btn btn-outline" 
                  type="button" 
                  style="color:#16a34a;border-color:#16a34a;padding:8px 16px;font-size:12.5px;font-weight:600;"
                  [disabled]="updatingStatus()"
                  (click)="updateOrderStatusDirect('DELIVERED')"
                >
                  {{ updatingStatus() ? 'Updating...' : '✓ Mark Delivered' }}
                </button>
              </div>
            }

            <div class="two-cols" style="margin-bottom:16px;">
              <div style="background:var(--canvas);padding:12px;border-radius:var(--r-md)">
                <strong style="display:block;margin-bottom:4px;">Buyer Information</strong>
                <div>Name: {{ order.buyer }}</div>
                <div>Phone: {{ order.phone || 'N/A' }}</div>
                <div>Address: {{ order.address }}</div>
                @if (order.note) { <div style="color:var(--warn);margin-top:4px;">Note: "{{ order.note }}"</div> }
              </div>
              <div style="background:var(--canvas);padding:12px;border-radius:var(--r-md)">
                <strong style="display:block;margin-bottom:4px;">Payment &amp; Status</strong>
                <div>Method: {{ order.paymentMethod }}</div>
                <div>Status: <span class="status delivered">{{ order.status }}</span></div>
                <div>Total: <strong>{{ order.total }}</strong></div>
              </div>
            </div>

            <h3 style="font-size:14px;margin:12px 0 8px;">Items Bought by Customer ({{ order.items.length }})</h3>
            <table style="margin-bottom:16px;">
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
              </thead>
              <tbody>
                @for (item of order.items; track item.name) {
                  <tr>
                    <td>{{ item.name }}</td>
                    <td>{{ item.qty }}</td>
                    <td>\${{ item.price.toFixed(2) }}</td>
                    <td><strong>\${{ item.subtotal.toFixed(2) }}</strong></td>
                  </tr>
                }
              </tbody>
            </table>

            <div class="field-group">
              <label>Update Order Status</label>
              <div style="display:flex;gap:10px;">
                <select class="dash-select" [ngModel]="statusChoice()" (ngModelChange)="statusChoice.set($event)">
                  <option value="">Select new status...</option>
                  @for (opt of nextStatusOptions(order.status); track opt) {
                    <option [value]="opt">{{ opt }}</option>
                  }
                </select>
                <button class="btn btn-primary" type="button" [disabled]="!statusChoice() || updatingStatus()" (click)="submitStatusUpdate()">
                  {{ updatingStatus() ? 'Updating...' : 'Save Status' }}
                </button>
              </div>
              @if (statusUpdateError()) { <p style="color:var(--danger);font-size:12px;">{{ statusUpdateError() }}</p> }
            </div>
          </div>
        </section>
      </div>
    }

    <!-- 2. Product Add/Edit Modal -->
    @if (showProductModal()) {
      <div class="backdrop" (click)="cancelProductEdit()">
        <section class="modal modal-lg" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>{{ newProduct().id ? 'Edit Product' : 'Add New Handcrafted Item' }}</h2>
            <button type="button" class="close" (click)="cancelProductEdit()">×</button>
          </header>
          <div class="modal-body">
            @if (productSaveError()) {
              <div style="color:var(--danger);background:var(--danger-bg);padding:10px;border-radius:var(--r-md);margin-bottom:12px;">
                {{ productSaveError() }}
              </div>
            }
            <div class="two-cols">
              <div class="field-group">
                <label>Product Title <span style="color:var(--danger)">*</span></label>
                <input class="dash-input" placeholder="e.g. Silk Krama Scarf" [ngModel]="newProduct().name" (ngModelChange)="newProduct.set({...newProduct(), name: $event})" />
              </div>
              <div class="field-group">
                <label>Category <span style="color:var(--danger)">*</span></label>
                <select class="dash-select" [ngModel]="newProduct().category" (ngModelChange)="newProduct.set({...newProduct(), category: $event})">
                  <option value="">Select category...</option>
                  <option value="Silk & Textiles">Silk &amp; Textiles</option>
                  <option value="Silver & Metalware">Silver &amp; Metalware</option>
                  <option value="Ceramics & Pottery">Ceramics &amp; Pottery</option>
                  <option value="Wood & Stone Carvings">Wood &amp; Stone Carvings</option>
                  <option value="Kampot Pepper & Spices">Kampot Pepper &amp; Spices</option>
                  <option value="Natural Wellness & Spa">Natural Wellness &amp; Spa</option>
                </select>
              </div>
            </div>

            <div class="two-cols">
              <div class="field-group">
                <label>Price (USD) <span style="color:var(--danger)">*</span></label>
                <input class="dash-input" type="number" placeholder="0.00" [ngModel]="newProduct().price" (ngModelChange)="newProduct.set({...newProduct(), price: $event})" />
              </div>
              <div class="field-group">
                <label>Initial Stock (Units) <span style="color:var(--danger)">*</span></label>
                <input class="dash-input" type="number" placeholder="10" [ngModel]="newProduct().stock" (ngModelChange)="newProduct.set({...newProduct(), stock: $event})" />
              </div>
            </div>

            <div class="field-group">
              <label>Description</label>
              <textarea class="dash-textarea" placeholder="Describe the artisan craft..." [ngModel]="newProduct().description" (ngModelChange)="newProduct.set({...newProduct(), description: $event})"></textarea>
            </div>

            <div class="field-group">
              <label>Product Image URL</label>
              <input class="dash-input" placeholder="https://..." [ngModel]="newProduct().image" (ngModelChange)="newProduct.set({...newProduct(), image: $event})" />
            </div>

            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" (click)="cancelProductEdit()">Cancel</button>
              <button class="btn btn-primary" type="button" [disabled]="savingProduct()" (click)="submitProduct()">
                {{ savingProduct() ? 'Saving...' : 'Save Product' }}
              </button>
            </div>
          </div>
        </section>
      </div>
    }

    <!-- 3. POS Open Shift Modal -->
    @if (posShiftModalOpen()) {
      <div class="backdrop" (click)="posShiftModalOpen.set(false)">
        <section class="modal" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>Open POS Register Shift</h2>
            <button type="button" class="close" (click)="posShiftModalOpen.set(false)">×</button>
          </header>
          <div class="modal-body">
            <div class="field-group">
              <label>Starting Cash Float ($)</label>
              <input class="dash-input" type="number" [ngModel]="posStartingFloat()" (ngModelChange)="posStartingFloat.set(+$event)" />
              <small class="muted">Amount of cash placed in register drawer at the start of shift.</small>
            </div>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" (click)="posShiftModalOpen.set(false)">Cancel</button>
              <button class="btn btn-primary" type="button" (click)="openPosShiftSubmit()">Open Shift</button>
            </div>
          </div>
        </section>
      </div>
    }

    <!-- 4. POS Close Shift Modal -->
    @if (posCloseShiftModalOpen()) {
      <div class="backdrop" (click)="posCloseShiftModalOpen.set(false)">
        <section class="modal" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>Close POS Shift</h2>
            <button type="button" class="close" (click)="posCloseShiftModalOpen.set(false)">×</button>
          </header>
          <div class="modal-body">
            @if (posShift(); as s) {
              <div style="background:var(--canvas);padding:12px;border-radius:var(--r-md);margin-bottom:14px;font-size:12.5px;">
                <div>Starting Float: <strong>\${{ s.startingCash }}</strong></div>
                <div>Cash Sales: <strong>\${{ s.cashSales }}</strong></div>
                <div>Cash In: <strong>\${{ s.cashIn }}</strong> | Cash Out: <strong>\${{ s.cashOut }}</strong></div>
                <div style="margin-top:6px;border-top:1px solid var(--line);padding-top:4px;">
                  Expected Drawer Cash: <strong style="color:var(--brand-700)">\${{ s.expectedCash }}</strong>
                </div>
              </div>
            }
            <div class="field-group">
              <label>Actual Counted Cash ($)</label>
              <input class="dash-input" type="number" [ngModel]="posActualCash()" (ngModelChange)="posActualCash.set(+$event)" />
              <div style="font-size:12px;margin-top:6px;font-weight:600;" [style.color]="posCashVariance() < 0 ? 'var(--danger)' : (posCashVariance() > 0 ? 'var(--warn)' : 'var(--ok)')">
                Drawer Variance: \${{ posCashVariance().toFixed(2) }} ({{ posCashVariance() < 0 ? 'Shortage' : (posCashVariance() > 0 ? 'Overage' : 'Exact Match') }})
              </div>
            </div>
            <div class="field-group">
              <label>Closing Notes</label>
              <input class="dash-input" placeholder="e.g. End of day reconciliation" [ngModel]="posShiftNotes()" (ngModelChange)="posShiftNotes.set($event)" />
            </div>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" (click)="posCloseShiftModalOpen.set(false)">Cancel</button>
              <button class="btn btn-danger" type="button" (click)="closePosShiftSubmit()">Confirm &amp; Close Shift</button>
            </div>
          </div>
        </section>
      </div>
    }

    <!-- 5. POS Cash In/Out Movement Modal -->
    @if (posCashMovementModalOpen()) {
      <div class="backdrop" (click)="posCashMovementModalOpen.set(false)">
        <section class="modal" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>Register Cash Movement</h2>
            <button type="button" class="close" (click)="posCashMovementModalOpen.set(false)">×</button>
          </header>
          <div class="modal-body">
            <div class="field-group">
              <label>Movement Type</label>
              <div style="display:flex;gap:10px;">
                <button type="button" class="tab-pill" [class.active]="posCashMovementType() === 'IN'" (click)="posCashMovementType.set('IN')">Cash In (Float Addition)</button>
                <button type="button" class="tab-pill" [class.active]="posCashMovementType() === 'OUT'" (click)="posCashMovementType.set('OUT')">Cash Out (Drop / Expense)</button>
              </div>
            </div>
            <div class="field-group">
              <label>Amount ($)</label>
              <input class="dash-input" type="number" [ngModel]="posCashMovementAmount()" (ngModelChange)="posCashMovementAmount.set(+$event)" />
            </div>
            <div class="field-group">
              <label>Reason / Note</label>
              <input class="dash-input" placeholder="e.g. Petty cash replenishment" [ngModel]="posCashMovementReason()" (ngModelChange)="posCashMovementReason.set($event)" />
            </div>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" (click)="posCashMovementModalOpen.set(false)">Cancel</button>
              <button class="btn btn-primary" type="button" (click)="recordCashMovementSubmit()">Save Movement</button>
            </div>
          </div>
        </section>
      </div>
    }

    <!-- 6. POS Receipt Modal -->
    @if (posReceipt(); as r) {
      <div class="backdrop" (click)="posReceipt.set(null)">
        <section class="modal" (click)="$event.stopPropagation()" style="max-width:440px;">
          <header class="modal-head">
            <h2>POS Sale Receipt</h2>
            <button type="button" class="close" (click)="posReceipt.set(null)">×</button>
          </header>
          <div class="modal-body" style="font-family:monospace;font-size:12.5px;">
            <div style="text-align:center;border-bottom:1px dashed var(--line);padding-bottom:12px;margin-bottom:12px;">
              <h3 style="margin:0 0 4px;font-size:16px;">{{ storeProfile().storeName || 'KhmerCraft Store' }}</h3>
              <p style="margin:0;color:var(--ink-500)">Receipt #: {{ r.orderNumber }}</p>
              <p style="margin:0;color:var(--ink-500)">{{ r.createdAt | date:'short' }}</p>
            </div>

            <div style="border-bottom:1px dashed var(--line);padding-bottom:10px;margin-bottom:10px;">
              @for (item of r.items; track item.name) {
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span>{{ item.qty }}x {{ item.name }}</span>
                  <span>\${{ (item.price * item.qty).toFixed(2) }}</span>
                </div>
              }
            </div>

            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
              <span>Subtotal:</span><span>\${{ r.subtotal.toFixed(2) }}</span>
            </div>
            @if (r.discount > 0) {
              <div style="display:flex;justify-content:space-between;margin-bottom:3px;color:var(--brand-700)">
                <span>Discount:</span><span>-\${{ r.discount.toFixed(2) }}</span>
              </div>
            }
            @if (r.tax > 0) {
              <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                <span>Tax:</span><span>\${{ r.tax.toFixed(2) }}</span>
              </div>
            }
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;border-top:1px solid var(--line);padding-top:6px;margin-top:6px;">
              <span>Total Paid:</span><span>\${{ r.total.toFixed(2) }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:4px;">
              <span>Method:</span><span>{{ r.paymentMethod }}</span>
            </div>
            @if (r.paymentMethod === 'CASH') {
              <div style="display:flex;justify-content:space-between;">
                <span>Cash Received:</span><span>\${{ r.cashReceived.toFixed(2) }}</span>
              </div>
              <div style="display:flex;justify-content:space-between;color:var(--brand-700);font-weight:bold;">
                <span>Change:</span><span>\${{ r.change.toFixed(2) }}</span>
              </div>
            }

            <div class="modal-actions" style="margin-top:16px;">
              <button class="btn btn-ghost" type="button" (click)="posReceipt.set(null)">Close</button>
              <button class="btn btn-primary" type="button" (click)="printReceipt()">Print Receipt</button>
            </div>
          </div>
        </section>
      </div>
    }

    <!-- 6b. POS Return / Refund Modal -->
    @if (refundModalOpen(); as open) {
      @if (selectedOrderForRefund(); as order) {
        <div class="backdrop" (click)="refundModalOpen.set(false)">
          <section class="modal modal-lg" (click)="$event.stopPropagation()">
            <header class="modal-head">
              <h2>Process POS Return / Refund: #{{ order.orderNumber || order.id }}</h2>
              <button type="button" class="close" (click)="refundModalOpen.set(false)">×</button>
            </header>
            <div class="modal-body">
              @if (refundError()) {
                <div style="color:var(--danger);background:var(--danger-bg);padding:10px;border-radius:var(--r-md);margin-bottom:12px;">
                  {{ refundError() }}
                </div>
              }
              <div class="two-cols" style="margin-bottom:16px;">
                <div style="background:var(--canvas);padding:10px 14px;border-radius:var(--r-md);font-size:12.5px;">
                  <div>Original Date: <strong>{{ order.createdAt | date:'medium' }}</strong></div>
                  <div>Tender Paid: <strong>{{ order.paymentMethod }}</strong></div>
                  <div>Original Total: <strong>\${{ order.totalAmount || order.myTotal }}</strong></div>
                </div>
                <div style="background:var(--canvas);padding:10px 14px;border-radius:var(--r-md);font-size:12.5px;">
                  <div>Cashier: <strong>{{ order.cashierName || user()?.name }}</strong></div>
                  <div>Register: <strong>{{ order.registerName || activeRegister()?.name || 'Main POS' }}</strong></div>
                  <div>Refund Total: <strong style="color:var(--danger)">\${{ refundTotalCalculation().toFixed(2) }}</strong></div>
                </div>
              </div>

              <h3 style="font-size:13.5px;margin:0 0 8px;">Select Line Items to Return</h3>
              <table style="margin-bottom:14px;">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style="width:100px;">Unit Price</th>
                    <th style="width:140px;">Return Qty</th>
                    <th style="width:150px;">Restock Inventory</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of refundItemsSelection(); track item.itemId; let idx = $index) {
                    <tr>
                      <td><strong>{{ item.name }}</strong></td>
                      <td>\${{ item.unitPrice.toFixed(2) }}</td>
                      <td>
                        <div class="qty-controls">
                          <button type="button" class="qty-btn" (click)="updateRefundItemQty(idx, -1)" [disabled]="item.qty <= 0">-</button>
                          <span style="font-weight:700;font-size:12px;min-width:20px;text-align:center;">{{ item.qty }} / {{ item.maxQty }}</span>
                          <button type="button" class="qty-btn" (click)="updateRefundItemQty(idx, 1)" [disabled]="item.qty >= item.maxQty">+</button>
                        </div>
                      </td>
                      <td>
                        <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
                          <input type="checkbox" [checked]="item.returnToInventory" (change)="toggleRefundReturnStock(idx)" />
                          <span>Return to stock</span>
                        </label>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>

              <div class="two-cols">
                <div class="field-group">
                  <label>Refund Method</label>
                  <select class="dash-select" [ngModel]="refundMethod()" (ngModelChange)="refundMethod.set($event)">
                    <option value="POS_CASH">Cash Refund (Drawer Outflow)</option>
                    <option value="ORIGINAL_PAYMENT">Original Payment Rail (KHQR / Digital)</option>
                  </select>
                </div>
                <div class="field-group">
                  <label>Return Reason <span style="color:var(--danger)">*</span></label>
                  <input class="dash-input" placeholder="e.g. Defective item, customer exchanged size" [ngModel]="refundReason()" (ngModelChange)="refundReason.set($event)" />
                </div>
              </div>

              <div class="modal-actions">
                <button class="btn btn-ghost" type="button" (click)="refundModalOpen.set(false)" [disabled]="isRefunding()">Cancel</button>
                <button class="btn btn-danger" type="button" (click)="submitRefund()" [disabled]="isRefunding() || refundTotalCalculation() <= 0">
                  {{ isRefunding() ? 'Processing Refund...' : ('Confirm Refund · $' + refundTotalCalculation().toFixed(2)) }}
                </button>
              </div>
            </div>
          </section>
        </div>
      }
    }

    <!-- 6c. POS Void Order Modal -->
    @if (voidModalOpen(); as open) {
      @if (selectedOrderForVoid(); as order) {
        <div class="backdrop" (click)="voidModalOpen.set(false)">
          <section class="modal" (click)="$event.stopPropagation()">
            <header class="modal-head">
              <h2>Void POS Transaction #{{ order.orderNumber || order.id }}</h2>
              <button type="button" class="close" (click)="voidModalOpen.set(false)">×</button>
            </header>
            <div class="modal-body">
              @if (voidError()) {
                <div style="color:var(--danger);background:var(--danger-bg);padding:10px;border-radius:var(--r-md);margin-bottom:12px;">
                  {{ voidError() }}
                </div>
              }
              <div style="background:var(--warn-bg);border:1px solid var(--warn);padding:12px;border-radius:var(--r-md);margin-bottom:14px;font-size:12.5px;color:var(--ink-900);">
                <strong>Caution: Manager Void Action</strong>
                <p style="margin:4px 0 0;">
                  Voiding this order will cancel the sale, reverse the transaction in your active shift, and automatically restore all items back into store inventory.
                </p>
              </div>

              <div style="background:var(--canvas);padding:10px 14px;border-radius:var(--r-md);margin-bottom:14px;font-size:12.5px;">
                <div>Order Number: <strong>{{ order.orderNumber || order.id }}</strong></div>
                <div>Amount to Reverse: <strong style="color:var(--danger)">\${{ order.totalAmount || order.myTotal }}</strong></div>
                <div>Payment Method: <strong>{{ order.paymentMethod }}</strong></div>
              </div>

              <div class="field-group">
                <label>Void Authorization Reason</label>
                <input class="dash-input" placeholder="e.g. Cashier scanning error / Customer changed mind before leaving" [ngModel]="voidReasonText()" (ngModelChange)="voidReasonText.set($event)" />
              </div>

              <div class="modal-actions">
                <button class="btn btn-ghost" type="button" (click)="voidModalOpen.set(false)" [disabled]="isVoiding()">Cancel</button>
                <button class="btn btn-danger" type="button" (click)="submitVoid()" [disabled]="isVoiding()">
                  {{ isVoiding() ? 'Voiding...' : 'Confirm Void Sale' }}
                </button>
              </div>
            </div>
          </section>
        </div>
      }
    }

    <!-- 6d. POS Add Register Modal -->
    @if (newRegisterModalOpen()) {
      <div class="backdrop" (click)="newRegisterModalOpen.set(false)">
        <section class="modal" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>Add Physical POS Register</h2>
            <button type="button" class="close" (click)="newRegisterModalOpen.set(false)">×</button>
          </header>
          <div class="modal-body">
            <div class="field-group">
              <label>Register Name <span style="color:var(--danger)">*</span></label>
              <input class="dash-input" placeholder="e.g. Main Counter 2, Pop-up Booth" [ngModel]="newRegisterName()" (ngModelChange)="newRegisterName.set($event)" />
            </div>
            <div class="field-group">
              <label>Register Number / Code</label>
              <input class="dash-input" placeholder="e.g. REG-02" [ngModel]="newRegisterNumber()" (ngModelChange)="newRegisterNumber.set($event)" />
            </div>
            <div class="field-group">
              <label>Location / Counter Description</label>
              <input class="dash-input" placeholder="e.g. Ground Floor Souvenir Corner" [ngModel]="newRegisterLocation()" (ngModelChange)="newRegisterLocation.set($event)" />
            </div>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" (click)="newRegisterModalOpen.set(false)">Cancel</button>
              <button class="btn btn-primary" type="button" [disabled]="!newRegisterName().trim()" (click)="createRegisterSubmit()">Create Register</button>
            </div>
          </div>
        </section>
      </div>
    }

    <!-- 6e. POS Quick Customer Modal -->
    @if (quickCustomerModalOpen()) {
      <div class="backdrop" (click)="quickCustomerModalOpen.set(false)">
        <section class="modal" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>Quick Add In-Store Customer</h2>
            <button type="button" class="close" (click)="quickCustomerModalOpen.set(false)">×</button>
          </header>
          <div class="modal-body">
            <div class="field-group">
              <label>Customer Full Name <span style="color:var(--danger)">*</span></label>
              <input class="dash-input" placeholder="e.g. Sokha Chan" [ngModel]="quickCustomerName()" (ngModelChange)="quickCustomerName.set($event)" />
            </div>
            <div class="field-group">
              <label>Phone Number</label>
              <input class="dash-input" placeholder="e.g. 012 345 678" [ngModel]="quickCustomerPhone()" (ngModelChange)="quickCustomerPhone.set($event)" />
            </div>
            <div class="field-group">
              <label>Email Address</label>
              <input class="dash-input" type="email" placeholder="e.g. sokha@example.com" [ngModel]="quickCustomerEmail()" (ngModelChange)="quickCustomerEmail.set($event)" />
            </div>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" (click)="quickCustomerModalOpen.set(false)">Cancel</button>
              <button class="btn btn-primary" type="button" [disabled]="!quickCustomerName().trim()" (click)="quickAddCustomerSubmit()">Save &amp; Assign to Cart</button>
            </div>
          </div>
        </section>
      </div>
    }

    <!-- 7. Customer Detail CRM Modal -->
    @if (selectedCustomer(); as cust) {
      <div class="backdrop" (click)="closeCustomerDetail()">
        <section class="modal modal-lg" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>Customer Profile: {{ cust.name }}</h2>
            <button type="button" class="close" (click)="closeCustomerDetail()">×</button>
          </header>
          <div class="modal-body">
            @if (loadingCustomerDetail()) {
              <p class="muted">Loading customer records...</p>
            } @else if (customerDetail(); as cd) {
              <div class="two-cols" style="margin-bottom:16px;">
                <div style="background:var(--canvas);padding:12px;border-radius:var(--r-md)">
                  <strong>Contact Info</strong>
                  <div>Email: {{ cd.email }}</div>
                  <div>Phone: {{ cd.phone || 'N/A' }}</div>
                  <div>Status: <span class="status delivered">{{ cd.status }}</span></div>
                </div>
                <div style="background:var(--canvas);padding:12px;border-radius:var(--r-md)">
                  <strong>Store Spending Summary</strong>
                  <div>Total Orders: <strong>{{ cd.ordersCount }}</strong></div>
                  <div>Lifetime Spent: <strong style="color:var(--brand-700)">\${{ cd.totalSpent.toFixed(2) }}</strong></div>
                  <div>Last Order: {{ cd.lastOrderDate | date:'mediumDate' }}</div>
                </div>
              </div>

              <h3 style="font-size:14px;margin:12px 0 6px;">Order History with Your Store</h3>
              <table style="margin-bottom:16px;">
                <thead>
                  <tr><th>Order #</th><th>Date</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  @for (ord of cd.orders; track ord.id) {
                    <tr>
                      <td class="order-id">{{ ord.orderNumber || ord.id }}</td>
                      <td>{{ ord.createdAt | date:'mediumDate' }}</td>
                      <td><strong>\${{ ord.totalAmount }}</strong></td>
                      <td><span class="status delivered">{{ ord.orderStatus }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>

              <h3 style="font-size:14px;margin:12px 0 6px;">Products Purchased</h3>
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                @for (prod of cd.purchasedProducts; track prod.name) {
                  <span class="pill" style="font-size:11px;">{{ prod.name }} (x{{ prod.totalQuantity }})</span>
                }
              </div>
            }
          </div>
        </section>
      </div>
    }

    <!-- 8. Create Promotion Modal -->
    @if (showCreateDiscountModal()) {
      <div class="backdrop" (click)="showCreateDiscountModal.set(false)">
        <section class="modal" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>Create Store Promotion</h2>
            <button type="button" class="close" (click)="showCreateDiscountModal.set(false)">×</button>
          </header>
          <div class="modal-body">
            @if (discountError()) {
              <div style="color:var(--danger);font-size:12px;margin-bottom:10px;">{{ discountError() }}</div>
            }
            <div class="field-group">
              <label>Promotion Name</label>
              <input class="dash-input" placeholder="e.g. Khmer New Year 15% Off" [ngModel]="newDiscount().name" (ngModelChange)="newDiscount.set({...newDiscount(), name: $event})" />
            </div>
            <div class="two-cols">
              <div class="field-group">
                <label>Discount Type</label>
                <select class="dash-select" [ngModel]="newDiscount().type" (ngModelChange)="newDiscount.set({...newDiscount(), type: $event})">
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount ($)</option>
                </select>
              </div>
              <div class="field-group">
                <label>Value</label>
                <input class="dash-input" type="number" placeholder="15" [ngModel]="newDiscount().value" (ngModelChange)="newDiscount.set({...newDiscount(), value: +$event})" />
              </div>
            </div>
            <div class="two-cols">
              <div class="field-group">
                <label>Start Date</label>
                <input class="dash-input" type="date" [ngModel]="newDiscount().startDate" (ngModelChange)="newDiscount.set({...newDiscount(), startDate: $event})" />
              </div>
              <div class="field-group">
                <label>End Date</label>
                <input class="dash-input" type="date" [ngModel]="newDiscount().endDate" (ngModelChange)="newDiscount.set({...newDiscount(), endDate: $event})" />
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" (click)="showCreateDiscountModal.set(false)">Cancel</button>
              <button class="btn btn-primary" type="button" [disabled]="creatingDiscount()" (click)="submitCreateDiscount()">
                {{ creatingDiscount() ? 'Creating...' : 'Create Promotion' }}
              </button>
            </div>
          </div>
        </section>
      </div>
    }

    <!-- 9. Create Support Case Modal -->
    @if (showCreateCaseModal()) {
      <div class="backdrop" (click)="showCreateCaseModal.set(false)">
        <section class="modal" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>Open Support Case</h2>
            <button type="button" class="close" (click)="showCreateCaseModal.set(false)">×</button>
          </header>
          <div class="modal-body">
            <div class="field-group">
              <label>Category</label>
              <select class="dash-select" [ngModel]="newCase().category" (ngModelChange)="newCase.set({...newCase(), category: $event})">
                <option value="ORDER_ISSUE">Order / Shipping Issue</option>
                <option value="PRODUCT_MODERATION">Product Moderation</option>
                <option value="PAYMENT_PAYOUT">Payment &amp; Payout</option>
                <option value="POS_TECHNICAL">POS / Technical</option>
                <option value="GENERAL">General Support</option>
              </select>
            </div>
            <div class="field-group">
              <label>Subject</label>
              <input class="dash-input" placeholder="Summary of the issue..." [ngModel]="newCase().subject" (ngModelChange)="newCase.set({...newCase(), subject: $event})" />
            </div>
            <div class="field-group">
              <label>Description &amp; Details</label>
              <textarea class="dash-textarea" placeholder="Please provide specific details..." [ngModel]="newCase().description" (ngModelChange)="newCase.set({...newCase(), description: $event})"></textarea>
            </div>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" (click)="showCreateCaseModal.set(false)">Cancel</button>
              <button class="btn btn-primary" type="button" (click)="submitSupportCase()">Submit Case</button>
            </div>
          </div>
        </section>
      </div>
    }

    <!-- 10. Support Case Thread Modal -->
    @if (selectedCase(); as sc) {
      <div class="backdrop" (click)="selectedCase.set(null)">
        <section class="modal modal-lg" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <div>
              <h2>Case #{{ sc.caseNumber }}: {{ sc.subject }}</h2>
              <span class="status delivered">{{ sc.status }}</span>
            </div>
            <button type="button" class="close" (click)="selectedCase.set(null)">×</button>
          </header>
          <div class="modal-body">
            <div class="thread-messages">
              <div class="msg-bubble seller">
                <strong>You (Initial Case):</strong>
                <p style="margin:4px 0 0;">{{ sc.description }}</p>
                <div class="msg-meta">{{ sc.createdAt | date:'short' }}</div>
              </div>
              @for (msg of sc.messages || []; track msg.createdAt) {
                <div class="msg-bubble" [class.seller]="msg.senderRole === 'SELLER'" [class.support]="msg.senderRole !== 'SELLER'">
                  <strong>{{ msg.senderName }}:</strong>
                  <p style="margin:4px 0 0;">{{ msg.text }}</p>
                  <div class="msg-meta">{{ msg.createdAt | date:'short' }}</div>
                </div>
              }
            </div>

            <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:12px;">
              <textarea class="dash-textarea" placeholder="Type reply to support agent..." [ngModel]="replyText()" (ngModelChange)="replyText.set($event)"></textarea>
              <div class="modal-actions">
                <button class="btn btn-ghost" type="button" (click)="selectedCase.set(null)">Close</button>
                <button class="btn btn-primary" type="button" [disabled]="submittingReply() || !replyText()" (click)="submitReplySupportCase()">
                  {{ submittingReply() ? 'Sending...' : 'Send Reply' }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    }

    <!-- 11. Marketplace Advertisement Modal -->
    @if (showPromoModal()) {
      <div class="backdrop" (click)="showPromoModal.set(false)">
        <section class="modal modal-lg" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>Request Marketplace Advertising Placement</h2>
            <button type="button" class="close" (click)="showPromoModal.set(false)">×</button>
          </header>
          <div class="modal-body">
            <div class="two-cols">
              <div class="field-group">
                <label>Ad Headline / Title <span style="color:var(--danger)">*</span></label>
                <input class="dash-input" placeholder="e.g. Master Silk Weavers of Cambodia" [ngModel]="promoForm().title" (ngModelChange)="promoForm.set({...promoForm(), title: $event})" />
              </div>
              <div class="field-group">
                <label>Target Destination</label>
                <select class="dash-select" [ngModel]="promoForm().targetType" (ngModelChange)="promoForm.set({...promoForm(), targetType: $event})">
                  <option value="STORE">My Storefront</option>
                  <option value="PRODUCT">Specific Product Listing</option>
                </select>
              </div>
            </div>

            <div class="field-group">
              <label>Subtitle / Description</label>
              <input class="dash-input" placeholder="Short teaser text for buyer marketplace carousel" [ngModel]="promoForm().subtitle" (ngModelChange)="promoForm.set({...promoForm(), subtitle: $event})" />
            </div>

            <div class="field-group">
              <label>Artwork Image (Upload file or enter URL)</label>
              <div style="display:flex;gap:8px;align-items:center;">
                <input class="dash-input" placeholder="https://... or choose an image file" [ngModel]="promoForm().imageUrl" (ngModelChange)="promoForm.set({...promoForm(), imageUrl: $event})" />
                <button type="button" class="btn btn-secondary" style="white-space:nowrap;display:inline-flex;align-items:center;gap:6px;height:44px;flex-shrink:0;" (click)="promoArtworkFileInput.click()">
                  <kc-icon name="upload" [size]="15" /> Choose from File
                </button>
                <input #promoArtworkFileInput type="file" hidden accept="image/*" (change)="onPromoArtworkFileSelected($event)" />
              </div>
              @if (promoForm().imageUrl) {
                <div style="margin-top:8px;display:flex;align-items:center;gap:12px;background:var(--canvas);padding:8px 12px;border-radius:var(--r-md);border:1px solid var(--line);">
                  <div style="width:130px;height:54px;border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--line);background:#1a1a1a;flex-shrink:0;">
                    <img [src]="promoForm().imageUrl" alt="Artwork Preview" style="width:100%;height:100%;object-fit:cover;display:block;" />
                  </div>
                  <div style="flex:1;min-width:0;">
                    <p style="font-size:12px;font-weight:650;margin:0;color:var(--ink-900);">Artwork Image Loaded</p>
                    <span style="font-size:11px;color:var(--ink-500);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Recommended horizontal ratio (1200x500)</span>
                  </div>
                  <button type="button" class="btn btn-ghost btn-sm" style="color:var(--danger);font-size:12px;" (click)="clearPromoArtwork()">Remove</button>
                </div>
              }
            </div>

            <div class="two-cols">
              <div class="field-group">
                <label>Start Date</label>
                <input class="dash-input" type="date" [ngModel]="promoForm().startDate" (ngModelChange)="promoForm.set({...promoForm(), startDate: $event})" />
              </div>
              <div class="field-group">
                <label>Campaign Duration</label>
                <select class="dash-select" [ngModel]="promoForm().days" (ngModelChange)="promoForm.set({...promoForm(), days: +$event})">
                  <option [value]="3">3 Days</option>
                  <option [value]="7">7 Days (1 Week)</option>
                  <option [value]="14">14 Days (2 Weeks)</option>
                  <option [value]="30">30 Days (1 Month)</option>
                </select>
              </div>
            </div>

            <div style="background:var(--canvas);padding:14px;border-radius:var(--r-md);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <strong style="font-size:16px;" [style.color]="promoCalculation().isZero ? 'var(--ok)' : 'var(--ink-900)'">
                    {{ promoCalculation().isZero ? 'FREE ($0.00)' : ('$' + promoCalculation().totalPrice + '.00') }}
                  </strong>
                  @if (promoCalculation().freeDays > 0) {
                    <span class="pill" style="background:#dcfce7;color:#15803d;font-weight:700;">
                      {{ promoCalculation().freeDays }} Days Free (1 Week)
                    </span>
                  }
                </div>
                <div style="font-size:12px;color:var(--ink-500);margin-top:3px;">
                  @if (promoCalculation().billableDays === 0) {
                    100% Free promotional placement ({{ promoCalculation().days }} days). No payment required.
                  } @else {
                    First {{ promoCalculation().freeDays }} days are FREE + {{ promoCalculation().billableDays }} extra days charged at \${{ promoCalculation().dailyRate }}/day.
                  }
                </div>
              </div>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-outline" type="button" [disabled]="submittingPromo()" (click)="saveDraftPromoSlide()">
                  Save Draft
                </button>
                <button class="btn btn-primary" type="button" [disabled]="submittingPromo()" (click)="submitPromoSlide()">
                  {{ submittingPromo() ? 'Submitting...' : (editingSlideId() ? 'Update Ad' : (promoCalculation().isZero ? 'Submit Free Request' : ('Submit Request ($' + promoCalculation().totalPrice + ')'))) }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    }

    <!-- 12. KHQR Payment Modal -->
    @if (showKhqrModal() && selectedSlideForPayment(); as slide) {
      <div class="backdrop" (click)="showKhqrModal.set(false)">
        <section class="modal" (click)="$event.stopPropagation()" style="max-width:400px;text-align:center;">
          <header class="modal-head">
            <h2>Bakong KHQR Payment</h2>
            <button type="button" class="close" (click)="showKhqrModal.set(false)">×</button>
          </header>
          <div class="modal-body">
            <p style="font-size:13px;margin:0 0 10px;">Scan with Bakong or any Cambodian Banking App</p>
            <div style="background:#fff;border:2px dashed #e02329;border-radius:var(--r-md);padding:14px;display:inline-block;margin-bottom:12px;">
              <img [src]="slide.khqrQrImage || 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=KHQR_PAYMENT_SIMULATION'" alt="KHQR" style="width:180px;height:180px;" />
            </div>
            <div style="font-size:18px;font-weight:bold;color:#b91c1c;margin-bottom:8px;">\${{ slide.totalPrice }}</div>
            <button class="btn btn-primary" type="button" style="width:100%;" (click)="verifySlidePayment(slide)">
              I Have Completed Payment
            </button>
          </div>
        </section>
      </div>
    }

    <!-- 13. POS Customer-Facing Bakong KHQR Modal -->
    @if (showPosCustomerQrModal() && posKhqrSession(); as qr) {
      <div class="backdrop" (click)="showPosCustomerQrModal.set(false)">
        <section class="modal" (click)="$event.stopPropagation()" style="max-width:390px;text-align:center;padding:0;overflow:hidden;border-radius:18px;">
          <!-- Bakong Red Header -->
          <div style="background:#e11d48;color:#fff;padding:16px 20px;">
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
              <span style="background:#fff;color:#e11d48;font-size:11px;font-weight:900;padding:2px 8px;border-radius:4px;letter-spacing:0.5px;">KHQR</span>
              <strong style="font-size:15px;letter-spacing:0.5px;">Bakong Dynamic QR</strong>
            </div>
            <p style="font-size:12px;opacity:0.9;margin:4px 0 0;">{{ storeProfile().storeName || 'KhmerCraft In-Store POS' }}</p>
          </div>

          <!-- Body with large QR code -->
          <div style="padding:22px;background:#fff;">
            <div style="display:inline-block;padding:12px;background:#fff;border:2px solid #fecdd3;border-radius:12px;box-shadow:0 4px 12px rgba(225,29,72,0.1);">
              <img 
                [src]="qr.qrImage"
                alt="Bakong KHQR"
                style="width:min(280px,70vw);height:min(280px,70vw);display:block;margin:0 auto;image-rendering:pixelated;" 
              />
            </div>

            <div style="margin-top:14px;">
              <span style="font-size:12px;color:var(--ink-500);display:block;text-transform:uppercase;letter-spacing:0.5px;">Total Amount Due</span>
              <div style="font-size:34px;font-weight:800;color:#e11d48;margin:2px 0;">
                \${{ qr.amount.toFixed(2) }} <span style="font-size:14px;color:var(--ink-600);font-weight:600;">USD</span>
              </div>
              @if (qr.mode === 'BAKONG') {
                <div style="font-size:12.5px;color:var(--ink-700);">Pay to <strong>{{ qr.merchantName }}</strong> · {{ qr.payTo }}</div>
              }
              <div style="font-size:11px;color:var(--ink-400);font-family:monospace;">
                Ref: {{ qr.tranId }}
              </div>
            </div>

            <div style="background:var(--canvas);border-radius:8px;padding:10px;margin-top:14px;font-size:11.5px;color:var(--ink-600);line-height:1.4;">
              Scan to pay with <strong>Bakong, ABA Mobile, ACLEDA, Wing, Canadia</strong>, or any Cambodian Banking app.
            </div>

            <div style="display:flex;gap:8px;margin-top:16px;">
              <button 
                type="button" 
                class="btn btn-outline" 
                style="flex:1;" 
                (click)="showPosCustomerQrModal.set(false)"
              >
                Close Display
              </button>
              <button 
                type="button" 
                class="btn btn-primary"
                style="flex:1;background:#059669;border-color:#059669;"
                [disabled]="posProcessingOrder()"
                (click)="confirmKhqrPaidAndComplete()"
              >
                Payment received
              </button>
            </div>
            @if (qr.mode === 'BAKONG') {
              <p style="font-size:11px;color:var(--ink-500);margin:10px 0 0;line-height:1.4;">
                Cashier: confirm only after your banking app shows \${{ qr.amount.toFixed(2) }} received.
              </p>
            }
          </div>
        </section>
      </div>
    }

    <!-- Payout receipt -->
    @if (payoutReceipt(); as rc) {
      <div class="backdrop" (click)="payoutReceipt.set(null)">
        <section class="modal" (click)="$event.stopPropagation()" style="max-width:560px;">
          <header class="modal-head">
            <h2>Payout {{ rc.payoutNumber }}</h2>
            <button type="button" class="close" (click)="payoutReceipt.set(null)">×</button>
          </header>
          <div style="padding:4px 0 8px;font-size:13px;">
            <div style="display:flex;justify-content:space-between;"><span class="muted">Amount</span><strong>\${{ rc.amount.toFixed(2) }}</strong></div>
            <div style="display:flex;justify-content:space-between;"><span class="muted">Sent to</span><span>{{ payoutMethodLabel(rc.account.method, rc.account.bankName) }} · {{ rc.account.accountNumber }}</span></div>
            @if (rc.reference) { <div style="display:flex;justify-content:space-between;"><span class="muted">Bank reference</span><span style="font-family:monospace;">{{ rc.reference }}</span></div> }
            @if (rc.paidAt) { <div style="display:flex;justify-content:space-between;"><span class="muted">Paid on</span><span>{{ rc.paidAt | date: 'medium' }}</span></div> }
          </div>
          @if (rc.proofUrl) {
            @if (rc.proofUrl.startsWith('data:application/pdf')) {
              <a class="btn btn-outline" [href]="rc.proofUrl" [download]="rc.payoutNumber + '.pdf'">Download receipt (PDF)</a>
            } @else {
              <img [src]="rc.proofUrl" alt="Transfer receipt" style="width:100%;border-radius:8px;border:1px solid var(--line);" />
            }
          }
        </section>
      </div>
    }

    <!-- 8. Collection Add/Edit Modal -->
    @if (showCollectionModal()) {
      <div class="backdrop" (click)="closeCollectionModal()">
        <section class="modal modal-lg" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>{{ colForm().id ? 'Edit Collection' : 'Create New Collection' }}</h2>
            <button type="button" class="close" (click)="closeCollectionModal()">×</button>
          </header>
          <div class="modal-body">
            @if (collectionSaveError()) {
              <div style="color:var(--danger);background:var(--danger-bg);padding:10px;border-radius:var(--r-md);margin-bottom:12px;">
                {{ collectionSaveError() }}
              </div>
            }
            <div class="field-group">
              <label>Collection Name <span style="color:var(--danger)">*</span></label>
              <input class="dash-input" placeholder="e.g. Royal Silk Heritage or Pchum Ben Specials" [ngModel]="colForm().name" (ngModelChange)="colForm.set({...colForm(), name: $event})" />
            </div>

            <div class="field-group">
              <label>Description</label>
              <textarea class="dash-textarea" style="min-height:70px;" placeholder="Tell shoppers what makes this curated collection unique..." [ngModel]="colForm().description" (ngModelChange)="colForm.set({...colForm(), description: $event})"></textarea>
            </div>

            <div class="field-group">
              <label>Cover Artwork Image</label>
              <div style="display:flex;gap:8px;align-items:center;">
                <input class="dash-input" placeholder="https://... or choose from your computer" [ngModel]="colForm().coverImage" (ngModelChange)="colForm.set({...colForm(), coverImage: $event})" />
                <button type="button" class="btn btn-secondary" style="white-space:nowrap;display:inline-flex;align-items:center;gap:6px;height:44px;flex-shrink:0;" (click)="collectionCoverInput.click()">
                  <kc-icon name="upload" [size]="15" /> Choose from File
                </button>
                <input #collectionCoverInput type="file" hidden accept="image/*" (change)="onCollectionCoverSelected($event)" />
              </div>
              @if (colForm().coverImage) {
                <div style="margin-top:8px;display:flex;align-items:center;gap:12px;background:var(--canvas);padding:8px 12px;border-radius:var(--r-md);border:1px solid var(--line);">
                  <div style="width:130px;height:54px;border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--line);background:#1a1a1a;flex-shrink:0;">
                    <img [src]="colForm().coverImage" alt="Collection Cover" style="width:100%;height:100%;object-fit:cover;display:block;" />
                  </div>
                  <div style="flex:1;min-width:0;">
                    <p style="font-size:12px;font-weight:650;margin:0;color:var(--ink-900);">Cover Image Ready</p>
                    <span style="font-size:11px;color:var(--ink-500);">Featured on your storefront collection showcase</span>
                  </div>
                  <button type="button" class="btn btn-ghost btn-sm" style="color:var(--danger);font-size:12px;" (click)="colForm.set({...colForm(), coverImage: ''})">Remove</button>
                </div>
              }
            </div>

            <!-- Custom Product Selection -->
            <div class="field-group" style="margin-top:16px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <label style="margin:0;">Select Products to Include in this Collection ({{ colForm().productIds.length }} selected)</label>
                <div style="display:flex;gap:8px;">
                  <button type="button" class="btn btn-ghost btn-sm" style="font-size:12px;padding:2px 8px;" (click)="selectAllProductsForCollection()">Select All</button>
                  <button type="button" class="btn btn-ghost btn-sm" style="font-size:12px;padding:2px 8px;" (click)="clearAllProductsForCollection()">Clear</button>
                </div>
              </div>

              <div style="max-height:220px;overflow-y:auto;border:1px solid var(--line);border-radius:var(--r-md);background:var(--surface);">
                @if (!products().length) {
                  <p class="muted" style="padding:20px;text-align:center;font-size:13px;margin:0;">No products listed yet in this store. Add products first to include them.</p>
                } @else {
                  @for (prod of products(); track prod.id) {
                    <label style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--line-soft);cursor:pointer;user-select:none;transition:background .1s;" [style.background]="isProductInCollection(prod.id) ? 'var(--canvas)' : 'transparent'">
                      <input type="checkbox" [checked]="isProductInCollection(prod.id)" (change)="toggleProductInCollection(prod.id)" style="width:18px;height:18px;" />
                      @if (prod.image) {
                        <img [src]="prod.image" alt="" style="width:36px;height:36px;border-radius:4px;object-fit:cover;border:1px solid var(--line);" />
                      }
                      <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:600;color:var(--ink-900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ prod.name }}</div>
                        <div style="font-size:11.5px;color:var(--ink-500);">{{ prod.category }} · {{ prod.price | currency }}</div>
                      </div>
                      @if (isProductInCollection(prod.id)) {
                        <span class="pill" style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;">Included</span>
                      }
                    </label>
                  }
                }
              </div>
            </div>

            <div style="margin-top:14px;display:flex;align-items:center;gap:8px;">
              <input type="checkbox" id="col-visible" [checked]="colForm().visible" (change)="colForm.set({...colForm(), visible: !colForm().visible})" style="width:18px;height:18px;" />
              <label for="col-visible" style="font-size:13px;font-weight:600;cursor:pointer;margin:0;">Show this collection publicly on your storefront</label>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="closeCollectionModal()">Cancel</button>
              <button type="button" class="btn btn-primary" [disabled]="!colForm().name.trim() || savingCollection()" (click)="submitCollection()">
                {{ savingCollection() ? 'Saving Collection...' : (colForm().id ? 'Update Collection' : 'Create Collection') }}
              </button>
            </div>
          </div>
        </section>
      </div>
    }
  `,
})
export class SellerDashboardPage implements OnInit {
  protected readonly imagePlaceholder =
    "data:image/svg+xml;utf8," +
    "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>" +
    "<rect width='96' height='96' fill='%23f0f4f2'/>" +
    "<circle cx='36' cy='36' r='7' fill='%23c4d0ca'/>" +
    "<path d='M20 68l19-22 14 17 11-13 12 18z' fill='%23c4d0ca'/></svg>";

  protected img(src?: string | null): string {
    return src && src.trim() ? src : this.imagePlaceholder;
  }

  protected imgFallback(event: Event): void {
    const el = event.target as HTMLImageElement;
    if (el.src !== this.imagePlaceholder) {
      el.src = this.imagePlaceholder;
    }
  }

  private readonly sellerService = inject(SellerService);
  private readonly commerceApi = inject(CommerceApiService);
  private readonly catalog = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  protected readonly user = this.authService.user;

  // View state
  protected readonly view = signal<DashboardView>('dashboard');
  protected readonly myStoreId = signal<string | null>(null);
  protected readonly stores = signal<any[]>([]);
  protected readonly activeStore = computed(() =>
    this.stores().find((store) => (store.id ?? store._id) === this.myStoreId()) ?? null,
  );
  protected readonly currentPlanBadge = computed(() => {
    const plan = this.activeStore()?.subscriptionPlan ?? 'STARTER';
    return plan === 'PREMIUM' ? 'Professional' : (plan === 'STANDARD' ? 'Growth' : 'Starter');
  });

  // Share links
  protected readonly shareDialog = signal<{ heading: string; intro: string; items: ShareItem[] } | null>(null);

  // Search & Filters
  protected readonly globalSearchQuery = signal('');
  protected readonly searchQuery = signal('');
  protected readonly orderStatusFilter = signal<'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED'>('ALL');
  protected readonly inventoryFilter = signal<'ALL' | 'LOW' | 'OUT'>('ALL');

  // Dashboard Data
  protected readonly dashboardMetrics = signal<DashboardMetric[]>([]);
  protected readonly dashboardOrders = signal<SellerOrder[]>([]);
  protected readonly orders = signal<SellerOrder[]>([]);
  protected readonly lowStock = signal<any[]>([]);
  protected readonly products = signal<any[]>([]);
protected readonly notifications = signal<any[]>([]);

  // Products
  protected readonly filteredProducts = computed(() => {
    const q = (this.searchQuery() || this.globalSearchQuery()).toLowerCase();
    if (!q) return this.products();
    return this.products().filter(p => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)));
  });
  protected readonly filteredInventory = computed(() => {
    const list = this.products();
    const filter = this.inventoryFilter();
    if (filter === 'LOW') return list.filter(p => p.stock > 0 && p.stock <= 5);
    if (filter === 'OUT') return list.filter(p => p.stock === 0);
    return list;
  });
  protected readonly showProductModal = signal(false);
  protected readonly savingProduct = signal(false);
  protected readonly productSaveError = signal('');
  protected readonly newProduct = signal<any>({
    name: '', category: '', material: '', description: '', price: null, stock: null, status: 'ACTIVE', image: ''
  });

  // Orders
  protected readonly selectedOrder = signal<SellerOrder | null>(null);
  protected readonly statusChoice = signal<OrderStatus | ''>('');
  protected readonly updatingStatus = signal(false);
  protected readonly statusUpdateError = signal('');
  protected readonly filteredOrders = computed(() => {
    let list = this.orders();
    const status = this.orderStatusFilter();
    if (status !== 'ALL') {
      list = list.filter(o => o.status === status);
    }
    const q = this.globalSearchQuery().toLowerCase();
    if (q) {
      list = list.filter(o => o.id.toLowerCase().includes(q) || o.buyer.toLowerCase().includes(q));
    }
    return list;
  });

  // POS Sub-area & State
  protected readonly posSubArea = signal<PosSubArea>('checkout');
  protected readonly posRegisters = signal<any[]>([]);
  protected readonly activeRegisterId = signal<string | null>(null);
  protected readonly activeRegister = computed(() => {
    const list = this.posRegisters();
    return list.find(r => (r.id || r._id) === this.activeRegisterId()) || list[0] || null;
  });

  protected readonly posShift = signal<any | null>(null);
  protected readonly posShiftModalOpen = signal(false);
  protected readonly posStartingFloat = signal<number>(50);
  protected readonly posCloseShiftModalOpen = signal(false);
  protected readonly posActualCash = signal<number>(0);
  protected readonly posShiftNotes = signal('');
  protected readonly posCashVariance = computed(() => {
    const expected = this.posShift()?.expectedCash || 0;
    return this.posActualCash() - expected;
  });

  protected readonly posCashMovementModalOpen = signal(false);
  protected readonly posCashMovementType = signal<'IN' | 'OUT'>('IN');
  protected readonly posCashMovementAmount = signal<number>(0);
  protected readonly posCashMovementReason = signal('');

  protected readonly posSearch = signal('');
  protected readonly posCategoryFilter = signal('ALL');
  protected readonly posCart = signal<Array<{ product: any; price: number; quantity: number }>>([]);
  protected readonly posAssignedCustomer = signal<{ id?: string; name: string; phone?: string; email?: string } | null>(null);
  protected readonly posDiscount = signal<number>(0);
  protected readonly posTaxRate = signal<number>(0);
  protected readonly posPaymentMethod = signal<'CASH' | 'KHQR'>('CASH');
  protected readonly posCashReceived = signal<number>(0);
  protected readonly posProcessingOrder = signal(false);
  protected readonly posOrderError = signal('');
  protected readonly posReceipt = signal<any | null>(null);
  protected readonly posKhqrSession = signal<any | null>(null);
  protected readonly generatingKhqr = signal(false);
  protected readonly checkingKhqrPayment = signal(false);
  protected readonly posKhqrPaid = signal(false);
  protected readonly showPosCustomerQrModal = signal(false);
  protected readonly khqrSettings = signal<PosKhqrSettings | null>(null);
  // Payouts
  protected readonly payoutSummary = signal<SellerPayoutSummary | null>(null);
  protected readonly payoutError = signal('');
  protected readonly editingPayoutAccount = signal(false);
  protected readonly savingPayoutAccount = signal(false);
  protected readonly payoutForm = signal<{ method: PayoutMethod; bankName: string; accountName: string; accountNumber: string; phone: string; khqrImage: string | null }>({
    method: 'ABA', bankName: '', accountName: '', accountNumber: '', phone: '', khqrImage: null,
  });
  protected readonly payoutTab = signal<'history' | 'orders'>('history');
  protected readonly payoutReceipt = signal<(SellerPayoutRecord & { proofUrl: string | null }) | null>(null);
  protected readonly abs = Math.abs;
  protected readonly khqrForm = signal({ bakongAccountId: '', merchantName: '', city: '' });
  protected readonly savingKhqr = signal(false);
  protected readonly quickKhqrAmount = signal<number | null>(null);
  protected readonly posKhqrNotice = signal('');
  /** Needs the one-time Bakong setup: no account saved and no PayWay fallback. */
  protected readonly khqrNeedsSetup = computed(() => {
    const k = this.khqrSettings();
    return !!k && !k.configured && !k.paywayAvailable;
  });
  private posKhqrPollTimer: any = null;
  protected readonly posOrders = signal<any[]>([]);
  protected readonly posShiftsList = signal<any[]>([]);
  protected readonly posRefundsList = signal<any[]>([]);
  protected readonly posReportsData = signal<any | null>(null);

  // POS Refund Modal State
  protected readonly refundModalOpen = signal(false);
  protected readonly selectedOrderForRefund = signal<any | null>(null);
  protected readonly refundItemsSelection = signal<Array<{ itemId: string; name: string; maxQty: number; qty: number; unitPrice: number; returnToInventory: boolean }>>([]);
  protected readonly refundReason = signal('');
  protected readonly refundMethod = signal('POS_CASH');
  protected readonly isRefunding = signal(false);
  protected readonly refundError = signal('');
  protected readonly refundTotalCalculation = computed(() => {
    return this.refundItemsSelection().reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  });

  // POS Void Modal State
  protected readonly voidModalOpen = signal(false);
  protected readonly selectedOrderForVoid = signal<any | null>(null);
  protected readonly voidReasonText = signal('');
  protected readonly isVoiding = signal(false);
  protected readonly voidError = signal('');

  // POS Register Modal State
  protected readonly newRegisterModalOpen = signal(false);
  protected readonly newRegisterName = signal('');
  protected readonly newRegisterNumber = signal('');
  protected readonly newRegisterLocation = signal('');

  // POS Quick Customer Modal State
  protected readonly quickCustomerModalOpen = signal(false);
  protected readonly quickCustomerName = signal('');
  protected readonly quickCustomerEmail = signal('');
  protected readonly quickCustomerPhone = signal('');

  // POS Settings State
  protected readonly posSettings = signal<{ receiptHeader: string; receiptFooter: string; defaultTax: number; acceptCash: boolean; acceptKhqr: boolean }>({
    receiptHeader: 'Thank you for supporting Cambodian Artisans!',
    receiptFooter: 'Items exchangeable within 7 days with original receipt.',
    defaultTax: 0,
    acceptCash: true,
    acceptKhqr: true,
  });
  protected readonly posSettingsSaved = signal(false);

  protected readonly posFilteredProducts = computed(() => {
    let list = this.products().filter(p => p.status === 'ACTIVE' || p.stock >= 0);
    const cat = this.posCategoryFilter();
    if (cat !== 'ALL') {
      list = list.filter(p => p.category === cat);
    }
    const q = this.posSearch().toLowerCase().trim();
    if (!q) return list;
    return list.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  protected readonly posSubtotal = computed(() => {
    return this.posCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  });
  protected readonly posTaxAmount = computed(() => {
    const net = Math.max(0, this.posSubtotal() - this.posDiscount());
    return net * (this.posTaxRate() / 100);
  });
  protected readonly posTotal = computed(() => {
    return Math.max(0, this.posSubtotal() - this.posDiscount() + this.posTaxAmount());
  });
  protected readonly posChange = computed(() => {
    if (this.posPaymentMethod() !== 'CASH') return 0;
    return Math.max(0, this.posCashReceived() - this.posTotal());
  });

  // Customers
  protected readonly customers = signal<any[]>([]);
  protected readonly customerSearch = signal('');
  protected readonly customerStatusFilter = signal<'ALL' | 'ACTIVE'>('ALL');
  protected readonly selectedCustomer = signal<any | null>(null);
  protected readonly customerDetail = signal<any | null>(null);
  protected readonly loadingCustomerDetail = signal(false);
  protected readonly filteredCustomers = computed(() => {
    let list = this.customers();
    if (this.customerStatusFilter() === 'ACTIVE') {
      list = list.filter(c => c.status === 'ACTIVE');
    }
    const q = this.customerSearch().toLowerCase();
    if (q) {
      list = list.filter(c => (c.name && c.name.toLowerCase().includes(q)) || (c.email && c.email.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q)));
    }
    return list;
  });

  // Reviews
  protected readonly reviews = signal<any[]>([]);
  protected readonly filteredReviews = computed(() => {
    const q = this.globalSearchQuery().toLowerCase();
    if (!q) return this.reviews();
    return this.reviews().filter(r => (r.name && r.name.toLowerCase().includes(q)) || (r.text && r.text.toLowerCase().includes(q)));
  });

  // Promotions & Discounts
  protected readonly discounts = signal<any[]>([]);
  protected readonly discountTab = signal<'ALL' | 'ACTIVE' | 'SCHEDULED' | 'EXPIRED'>('ACTIVE');
  protected readonly showCreateDiscountModal = signal(false);
  protected readonly creatingDiscount = signal(false);
  protected readonly discountError = signal('');
  protected readonly newDiscount = signal<any>({
    name: '', code: '', type: 'PERCENTAGE', value: 10, appliesTo: 'ALL', startDate: '', endDate: ''
  });
  protected readonly filteredDiscounts = computed(() => {
    const tab = this.discountTab();
    if (tab === 'ALL') return this.discounts();
    return this.discounts().filter(d => d.status === tab);
  });

  // Advertisements
  protected readonly promoCampaigns = signal<any[]>([]);
  protected readonly myPromoSlides = signal<any[]>([]);
  protected readonly showPromoModal = signal(false);
  protected readonly submittingPromo = signal(false);
  protected readonly showKhqrModal = signal(false);
  protected readonly selectedSlideForPayment = signal<any | null>(null);
  protected readonly editingSlideId = signal<string | null>(null);
  protected readonly promoForm = signal<any>({
    title: '', subtitle: '', targetType: 'STORE', targetId: '', imageUrl: '', startDate: '', days: 7, isFree: true, freeDays: 7, dailyRate: 3
  });
  protected readonly promoCalculation = computed(() => {
    const f = this.promoForm();
    const days = f.days || 7;
    const isFree = f.isFree !== false;
    const freeDays = isFree ? (f.freeDays ?? 7) : 0;
    const dailyRate = f.dailyRate ?? 3;
    const billableDays = Math.max(0, days - freeDays);
    const totalPrice = dailyRate > 0 ? billableDays * dailyRate : 0;
    return {
      days,
      isFree,
      freeDays,
      billableDays,
      dailyRate,
      totalPrice,
      isZero: totalPrice === 0,
    };
  });

  // Store Collections
  protected readonly collections = signal<StoreCollectionDTO[]>([]);
  protected readonly loadingCollections = signal(false);
  protected readonly showCollectionModal = signal(false);
  protected readonly savingCollection = signal(false);
  protected readonly collectionSaveError = signal('');
  protected readonly colForm = signal<{
    id?: string;
    name: string;
    description: string;
    coverImage: string;
    productIds: string[];
    visible: boolean;
  }>({
    name: '',
    description: '',
    coverImage: '',
    productIds: [],
    visible: true,
  });

  // Storefront & Profile
  protected readonly storeProfile = signal<any>({
    storeName: '', storeDescription: '', storeTagline: '', announcement: '', theme: 'FOREST', location: '', phoneNumber: '', slug: '', logoUrl: '', bannerUrl: ''
  });
  protected readonly storeInitials = computed(() => {
    const name = String(this.storeProfile().storeName || '').trim();
    if (!name) return 'S';
    return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  });
  /** Which store images were picked but not saved yet — only those are uploaded. */
  private readonly changedImages = signal<{ logoUrl: boolean; bannerUrl: boolean }>({ logoUrl: false, bannerUrl: false });
  protected readonly storeImagesDirty = computed(() => this.changedImages().logoUrl || this.changedImages().bannerUrl);
  protected readonly storeImageError = signal('');
  protected readonly storeImageLoading = signal(false);
  protected readonly savingProfile = signal(false);
  protected readonly storefrontThemes = [
    { value: 'FOREST', label: 'Forest', color: '#275643' },
    { value: 'CLAY', label: 'Clay', color: '#a33a24' },
    { value: 'GOLD', label: 'Harvest', color: '#a97517' },
    { value: 'MIDNIGHT', label: 'Midnight', color: '#243547' },
  ];

  // Finance, Analytics & Reports
  protected readonly financeData = signal<any>({});
  protected readonly analyticsData = signal<any>({});
  protected readonly analyticsPeriod = signal<'today' | '7d' | '30d' | 'all'>('30d');
  protected readonly reportType = signal<string>('sales');

  // Support Cases
  protected readonly supportCases = signal<any[]>([]);
  protected readonly showCreateCaseModal = signal(false);
  protected readonly newCase = signal<any>({ category: 'ORDER_ISSUE', subject: '', description: '', priority: 'MEDIUM' });
  protected readonly selectedCase = signal<any | null>(null);
  protected readonly replyText = signal('');
  protected readonly submittingReply = signal(false);

  // Settings
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmNewPassword = signal('');

  // ---------------------- Lifecycle ----------------------
  ngOnInit() {
    const cachedStoreId = typeof localStorage !== 'undefined' ? localStorage.getItem('khmercraft_active_store_id') || undefined : undefined;
    const requestedStoreId = this.route.snapshot.queryParamMap.get('storeId') ?? cachedStoreId;
    this.loadMyStores(requestedStoreId, (storeId) => {
      this.loadDashboardData(storeId);
      const cachedView = typeof localStorage !== 'undefined' ? (localStorage.getItem('khmercraft_seller_view') as DashboardView) : undefined;
      const requestedView = (this.route.snapshot.queryParamMap.get('view') as DashboardView) || cachedView;
      if (requestedView) {
        this.setView(requestedView);
      }
    });
  }

  loadMyStores(preferredId?: string, onLoaded?: (id: string) => void) {
    this.sellerService.getMyStores().subscribe({
      next: (stores) => {
        this.stores.set(stores);
        if (stores.length > 0) {
          const selected = stores.find((s: any) => (s.id || s._id) === preferredId) || stores[0];
          const storeId = selected.id || (selected as any)._id;
          this.myStoreId.set(storeId);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('khmercraft_active_store_id', storeId);
          }
          this.storeProfile.set(this.profileFor(selected));
          if (onLoaded) onLoaded(storeId);
        }
      },
      error: (err) => console.error('Failed to load stores', err),
    });
  }

  /** The editable profile of one store, as loaded from the server. */
  private profileFor(store: any) {
    this.changedImages.set({ logoUrl: false, bannerUrl: false });
    this.storeImageError.set('');
    return {
      storeName: store.storeName || '',
      storeDescription: store.storeDescription || '',
      storeTagline: store.storeTagline || '',
      announcement: store.announcement || '',
      theme: store.theme || 'FOREST',
      location: store.location || '',
      phoneNumber: store.phoneNumber || '',
      slug: store.slug || store.id || store._id,
      logoUrl: store.logoUrl || '',
      bannerUrl: store.bannerUrl || '',
    };
  }

  /** Resizes a picked photo in the browser and previews it until the profile is saved. */
  async changeStoreImage(event: Event, field: 'logoUrl' | 'bannerUrl') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.storeImageError.set('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      this.storeImageError.set('Choose a JPG, PNG or WebP image smaller than 10 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    this.storeImageLoading.set(true);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(1, (field === 'logoUrl' ? 512 : 1600) / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image processing unavailable');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      this.storeProfile.set({ ...this.storeProfile(), [field]: canvas.toDataURL('image/jpeg', 0.85) });
      this.changedImages.set({ ...this.changedImages(), [field]: true });
    } catch {
      this.storeImageError.set('This image could not be opened. Please choose another.');
    } finally {
      URL.revokeObjectURL(url);
      this.storeImageLoading.set(false);
    }
  }

  switchStore(storeId: string) {
    if (!storeId || storeId === this.myStoreId()) return;
    this.myStoreId.set(storeId);
    const next = this.stores().find((store) => (store.id ?? store._id) === storeId);
    if (next) this.storeProfile.set(this.profileFor(next));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('khmercraft_active_store_id', storeId);
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { storeId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.loadDashboardData(storeId);
  }

  setView(v: DashboardView) {
    this.view.set(v);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('khmercraft_seller_view', v);
    }
    const storeId = this.myStoreId();
    if (!storeId) return;

    if (v === 'customers') this.loadCustomers(storeId);
    else if (v === 'pos') this.loadPosData(storeId);
    else if (v === 'promotions') this.loadPromotions(storeId);
    else if (v === 'advertisements') this.loadAdvertisements(storeId);
    else if (v === 'collections') this.loadCollections(storeId);
    else if (v === 'sales') { this.loadPayouts(storeId); this.loadFinance(storeId); }
    else if (v === 'payments' || v === 'transactions') this.loadFinance(storeId);
    else if (v === 'analytics') this.loadAnalytics(storeId);
    else if (v === 'support') this.loadSupportCases(storeId);
    else if (v === 'notifications') this.loadNotifications(storeId);
  }

  loadStoreProducts(storeId: string) {
    this.commerceApi.listProducts({ storeId }).subscribe({
      next: (res: any) => {
        const prods = (res.products || []).map((p: any) => ({
          id: p.id || p._id,
          name: p.name,
          category: p.category,
          subcategory: p.subcategory ?? null,
          price: p.price,
          stock: p.stock ?? 10,
          status: p.status || 'ACTIVE',
          image: p.image || (p.images && p.images[0]) || '',
          material: p.material || '',
          description: p.description || '',
        }));
        this.products.set(prods);
        this.lowStock.set(prods.filter((p: any) => p.stock <= 5));
      },
      error: (err: any) => console.error('Failed to load products', err),
    });
  }

  loadDashboardData(storeId: string) {
    // 1. Orders and basic dashboard metrics
    this.sellerService.getStoreOrders(storeId).subscribe({
      next: (data) => {
        this.dashboardMetrics.set([
          { label: 'Total Revenue', value: `$${data.metrics.revenueMtd.toFixed(2)}`, icon: 'chart', note: 'This month' },
          { label: 'Pending Orders', value: data.metrics.pendingOrders.toString(), icon: 'clipboard', warn: data.metrics.pendingOrders > 0 },
          { label: 'Completed (30d)', value: data.metrics.completed30d.toString(), icon: 'check' },
          { label: 'In Transit', value: data.metrics.inTransit.toString(), icon: 'truck' },
        ]);

        const mappedOrders: SellerOrder[] = data.orders.map((o: any) => ({
          id: o.orderNumber || o.id,
          buyer: o.buyerName || 'Valued Buyer',
          initials: (o.buyerName || 'VB').substring(0, 2).toUpperCase(),
          color: '#dfe8ff',
          product: o.myItems.length > 0 ? o.myItems[0].productName : 'Crafted Product',
          qty: o.myItems.length > 0 ? o.myItems[0].quantity : 1,
          total: `$${o.myTotal.toFixed(2)}`,
          address: o.deliveryInfo?.address || 'Phnom Penh, Cambodia',
          date: new Date(o.createdAt).toLocaleDateString(),
          status: o.orderStatus,
          statusClass: o.orderStatus === 'DELIVERED' ? 'delivered' : (o.orderStatus === 'SHIPPED' ? 'shipped' : 'pending'),
          phone: o.buyerPhone || o.deliveryInfo?.phone || '',
          note: o.deliveryInfo?.note || '',
          paymentMethod: o.paymentMethod || 'COD',
          paymentStatus: o.paymentStatus || 'COMPLETED',
          items: o.myItems.map((item: any) => ({
            name: item.productName,
            image: item.productImage ?? null,
            qty: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
        }));
        this.orders.set(mappedOrders);
        this.dashboardOrders.set(mappedOrders.slice(0, 5));

},
      error: (err) => console.error('Failed to load orders', err),
    });

    // 2. Products
    this.loadStoreProducts(storeId);

    // 3. Notifications
    this.sellerService.getStoreNotifications(storeId).subscribe({
      next: (list) => this.notifications.set(list),
      error: () => this.notifications.set([]),
    });

    // 4. Collections
    this.loadCollections(storeId);
  }

  // ---------------------- Products Logic ----------------------
  startNewProduct() {
    this.newProduct.set({ name: '', category: '', material: '', description: '', price: null, stock: 10, status: 'ACTIVE', image: '' });
    this.productSaveError.set('');
    this.showProductModal.set(true);
  }

  editProduct(p: any) {
    this.newProduct.set({ ...p });
    this.productSaveError.set('');
    this.showProductModal.set(true);
  }

  cancelProductEdit() {
    this.showProductModal.set(false);
    this.productSaveError.set('');
  }

  submitProduct() {
    const p = this.newProduct();
    if (!p.name || !p.price) {
      this.productSaveError.set('Title and Price are required.');
      return;
    }
    const storeId = this.myStoreId();
    if (!storeId) return;

    this.savingProduct.set(true);
    if (p.id) {
      this.sellerService.updateProduct(p.id, p).subscribe({
        next: () => {
          this.savingProduct.set(false);
          this.showProductModal.set(false);
          this.loadDashboardData(storeId);
        },
        error: (err) => {
          this.savingProduct.set(false);
          this.productSaveError.set(err.message || 'Failed to update product');
        },
      });
    } else {
      this.sellerService.createProduct({ ...p, storeId }).subscribe({
        next: () => {
          this.savingProduct.set(false);
          this.showProductModal.set(false);
          this.loadDashboardData(storeId);
        },
        error: (err) => {
          this.savingProduct.set(false);
          this.productSaveError.set(err.message || 'Failed to create product');
        },
      });
    }
  }

  deleteProduct(id: string) {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    this.sellerService.deleteProduct(id).subscribe({
      next: () => {
        if (this.myStoreId()) this.loadDashboardData(this.myStoreId()!);
      },
      error: (err) => alert('Failed to delete: ' + err.message),
    });
  }

  toggleProductStatus(p: any) {
    const newStatus = p.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    this.sellerService.updateProduct(p.id, { status: newStatus }).subscribe({
      next: () => {
        if (this.myStoreId()) this.loadDashboardData(this.myStoreId()!);
      },
      error: (err) => alert('Failed to update status: ' + err.message),
    });
  }

  adjustStockInline(p: any, delta: number) {
    const newStock = Math.max(0, (p.stock || 0) + delta);
    this.sellerService.updateProduct(p.id, { stock: newStock }).subscribe({
      next: () => {
        if (this.myStoreId()) this.loadDashboardData(this.myStoreId()!);
      },
      error: (err) => alert('Failed to adjust stock: ' + err.message),
    });
  }

  // ---------------------- Orders Logic ----------------------
  /** Link + preview for one product. Only live products resolve for buyers. */
  openProductShare(product: any) {
    const storeName = this.activeStore()?.storeName ?? this.activeStore()?.name ?? 'KhmerCraft';
    const live = product.status === 'ACTIVE';
    this.shareDialog.set({
      heading: 'Share this product',
      intro: live
        ? 'Paste the link into Telegram, Facebook or a message — whoever taps it lands on this product.'
        : 'This product is not live, so its link will say "unavailable" until you activate it.',
      items: [
        {
          id: String(product.id),
          label: product.name,
          title: product.name,
          description: `$${Number(product.price).toFixed(2)} · ${storeName}`,
          imageUrl: `${API_URL}/products/${encodeURIComponent(product.id)}/image`,
          url: productShareUrl(product.id),
        },
      ],
    });
  }

  /**
   * Links for the store and for each category / sub-category it sells, built
   * from the live products — "do you have a shirt?" → copy the Shirts link.
   */
  openCatalogShare() {
    const store = this.activeStore();
    const storeId = this.myStoreId();
    if (!store || !storeId) return;
    const storeName: string = store.storeName ?? store.name ?? 'Your store';

    if (store.onboardingStatus !== 'COMPLETED') {
      this.shareDialog.set({
        heading: 'Share your store',
        intro: 'Finish your store setup first — until then there is no public store page for a link to open.',
        items: [],
      });
      return;
    }

    const live = this.products().filter((p) => p.status === 'ACTIVE');
    if (!live.length) {
      this.shareDialog.set({
        heading: 'Share your store',
        intro: 'Add and activate a product first, then you can share your store and its categories.',
        items: [],
      });
      return;
    }

    const plural = (n: number) => `${n} product${n === 1 ? '' : 's'}`;
    const tagline: string = store.storeTagline ?? store.tagline ?? '';
    const describe = (n: number) => (tagline ? `${plural(n)} · ${tagline}` : `${plural(n)} from ${storeName} on KhmerCraft.`);
    const coverOf = (list: any[]) => {
      const first = list.find((p) => p.image) ?? list[0];
      return first ? `${API_URL}/products/${encodeURIComponent(first.id)}/image` : null;
    };

    const items: ShareItem[] = [
      {
        id: 'store',
        label: 'Whole store',
        hint: plural(live.length),
        title: storeName,
        description: describe(live.length),
        imageUrl: coverOf(live),
        url: storeShareUrl(storeId),
      },
    ];

    const categories = new Map<string, any[]>();
    for (const product of live) {
      const name = String(product.category ?? '').trim();
      if (name) categories.set(name, [...(categories.get(name) ?? []), product]);
    }
    for (const [category, inCategory] of [...categories].sort((a, b) => a[0].localeCompare(b[0]))) {
      items.push({
        id: `cat:${category}`,
        label: category,
        hint: plural(inCategory.length),
        title: `${category} at ${storeName}`,
        description: describe(inCategory.length),
        imageUrl: coverOf(inCategory),
        url: storeShareUrl(storeId, category),
      });
      const subs = new Map<string, any[]>();
      for (const product of inCategory) {
        const name = String(product.subcategory ?? '').trim();
        if (name) subs.set(name, [...(subs.get(name) ?? []), product]);
      }
      for (const [sub, inSub] of [...subs].sort((a, b) => a[0].localeCompare(b[0]))) {
        items.push({
          id: `sub:${category}:${sub}`,
          label: sub,
          hint: `in ${category} · ${plural(inSub.length)}`,
          title: `${sub} at ${storeName}`,
          description: describe(inSub.length),
          imageUrl: coverOf(inSub),
          url: storeShareUrl(storeId, category, sub),
        });
      }
    }

    this.shareDialog.set({
      heading: 'Share your store',
      intro: 'Pick the store or a category, then copy the link. Buyers who tap it open exactly that part of your store.',
      items,
    });
  }

  openOrder(order: SellerOrder) {
    this.selectedOrder.set(order);
    this.statusChoice.set('');
    this.statusUpdateError.set('');
  }

  closeOrder() {
    this.selectedOrder.set(null);
  }

  nextStatusOptions(currentStatus: string): OrderStatus[] {
    switch (currentStatus) {
      case 'PENDING': return ['CONFIRMED', 'CANCELLED'];
      case 'CONFIRMED': return ['SHIPPED', 'CANCELLED'];
      case 'SHIPPED': return ['DELIVERED'];
      default: return [];
    }
  }

  updateOrderStatusDirect(newStatus: string) {
    const order = this.selectedOrder();
    if (!order) return;
    this.updatingStatus.set(true);
    this.statusUpdateError.set('');
    this.sellerService.updateOrderStatus(order.id, newStatus).subscribe({
      next: () => {
        this.updatingStatus.set(false);
        this.selectedOrder.set({
          ...order,
          status: newStatus,
          statusClass: newStatus.toLowerCase() as any,
        });
        if (this.myStoreId()) this.loadDashboardData(this.myStoreId()!);
      },
      error: (err) => {
        this.updatingStatus.set(false);
        this.statusUpdateError.set(err.error?.message || err.message || 'Failed to update order status');
      },
    });
  }

  submitStatusUpdate() {
    const choice = this.statusChoice();
    if (choice) {
      this.updateOrderStatusDirect(choice);
    }
  }

  quickConfirmOrder(order: any, event?: Event) {
    if (event) event.stopPropagation();
    if (!order?.id) return;
    this.sellerService.updateOrderStatus(order.id, 'CONFIRMED').subscribe({
      next: () => {
        if (this.myStoreId()) this.loadDashboardData(this.myStoreId()!);
      },
      error: (err) => alert('Failed to confirm order: ' + (err.error?.message || err.message)),
    });
  }

  quickShipOrder(order: any, event?: Event) {
    if (event) event.stopPropagation();
    if (!order?.id) return;
    this.sellerService.updateOrderStatus(order.id, 'SHIPPED').subscribe({
      next: () => {
        if (this.myStoreId()) this.loadDashboardData(this.myStoreId()!);
      },
      error: (err) => alert('Failed to mark as shipped: ' + (err.error?.message || err.message)),
    });
  }

  // ---------------------- Complete POS Logic ----------------------
  setPosSubArea(area: PosSubArea) {
    this.posSubArea.set(area);
    const storeId = this.myStoreId();
    if (!storeId) return;
    if (area === 'registers') this.loadPosRegisters(storeId);
    else if (area === 'shifts') this.loadPosShiftsList(storeId);
    else if (area === 'returns') this.loadPosRefundsList(storeId);
    else if (area === 'reports') this.loadPosReports(storeId);
    else if (area === 'orders') this.loadPosOrders(storeId);
    else if (area === 'customers') this.loadCustomers(storeId);
    else if (area === 'discounts') this.loadPromotions(storeId);
  }

  loadKhqrSettings(storeId: string) {
    this.sellerService.getPosKhqrSettings(storeId).subscribe({
      next: (k) => {
        this.khqrSettings.set(k);
        this.khqrForm.set({ bakongAccountId: k.bakongAccountId, merchantName: k.merchantName, city: k.city });
      },
      error: () => this.khqrSettings.set(null),
    });
  }

  saveKhqrSettings() {
    const storeId = this.myStoreId();
    const form = this.khqrForm();
    if (!storeId) return;
    this.savingKhqr.set(true);
    this.posOrderError.set('');
    this.sellerService
      .updatePosKhqrSettings(storeId, {
        bakongAccountId: form.bakongAccountId.trim(),
        merchantName: form.merchantName.trim() || (this.storeProfile().storeName || 'KhmerCraft Seller').slice(0, 25),
        city: form.city.trim() || undefined,
      })
      .subscribe({
        next: (k) => {
          this.savingKhqr.set(false);
          this.khqrSettings.set(k);
          this.khqrForm.set({ bakongAccountId: k.bakongAccountId, merchantName: k.merchantName, city: k.city });
        },
        error: (err: any) => {
          this.savingKhqr.set(false);
          const details = err.error?.error?.details;
          this.posOrderError.set(details?.bakongAccountId?.[0] || err.error?.error?.message || 'Could not save the KHQR account');
        },
      });
  }

  loadPosData(storeId: string) {
    this.loadKhqrSettings(storeId);
    this.loadPosRegisters(storeId);
    this.sellerService.getPosCurrentShift(storeId, this.activeRegisterId() || undefined).subscribe({
      next: (shift) => this.posShift.set(shift),
      error: () => this.posShift.set(null),
    });
    this.loadPosOrders(storeId);
    this.loadPosRefundsList(storeId);
    this.loadPosReports(storeId);
    this.loadCustomers(storeId);
    this.loadPromotions(storeId);
  }

  loadPosOrders(storeId?: string) {
    const sId = storeId || this.myStoreId();
    if (!sId) return;
    this.sellerService.getPosOrders(sId).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.orders || []);
        this.posOrders.set(list);
      },
      error: () => this.posOrders.set([]),
    });
  }

  loadPosRegisters(storeId?: string) {
    const sId = storeId || this.myStoreId();
    if (!sId) return;
    this.sellerService.listPosRegisters(sId).subscribe({
      next: (regs) => {
        this.posRegisters.set(regs || []);
        if ((!this.activeRegisterId() || !regs.some((r: any) => (r.id || r._id) === this.activeRegisterId())) && regs.length > 0) {
          this.activeRegisterId.set(regs[0].id || regs[0]._id);
        }
      },
      error: () => this.posRegisters.set([]),
    });
  }

  switchRegister(regId: string) {
    this.activeRegisterId.set(regId);
    const storeId = this.myStoreId();
    if (storeId) {
      this.sellerService.getPosCurrentShift(storeId, regId).subscribe({
        next: (shift) => this.posShift.set(shift),
        error: () => this.posShift.set(null),
      });
    }
  }

  createRegisterSubmit() {
    const storeId = this.myStoreId();
    if (!storeId || !this.newRegisterName().trim()) return;
    this.sellerService.createPosRegister(storeId, {
      name: this.newRegisterName().trim(),
      registerNumber: this.newRegisterNumber().trim() || undefined,
      location: this.newRegisterLocation().trim() || undefined,
    }).subscribe({
      next: (reg: any) => {
        this.newRegisterModalOpen.set(false);
        this.newRegisterName.set('');
        this.newRegisterNumber.set('');
        this.newRegisterLocation.set('');
        this.loadPosRegisters(storeId);
        this.activeRegisterId.set(reg.id || reg._id);
      },
      error: (err: any) => alert(err.error?.message || 'Failed to create register'),
    });
  }

  loadPosShiftsList(storeId?: string) {
    const sId = storeId || this.myStoreId();
    if (!sId) return;
    this.sellerService.listPosShifts(sId).subscribe({
      next: (res: any) => {
        this.posShiftsList.set(res?.shifts || (Array.isArray(res) ? res : []));
      },
      error: () => this.posShiftsList.set([]),
    });
  }

  loadPosRefundsList(storeId?: string) {
    const sId = storeId || this.myStoreId();
    if (!sId) return;
    this.sellerService.listPosRefunds(sId).subscribe({
      next: (refunds) => this.posRefundsList.set(refunds || []),
      error: () => this.posRefundsList.set([]),
    });
  }

  loadPosReports(storeId?: string) {
    const sId = storeId || this.myStoreId();
    if (!sId) return;
    this.sellerService.getPosReports(sId).subscribe({
      next: (data) => this.posReportsData.set(data),
      error: () => this.posReportsData.set(null),
    });
  }

  addToPosCart(product: any) {
    if (product.stock <= 0) {
      alert('This item is currently out of stock.');
      return;
    }
    const current = [...this.posCart()];
    const existing = current.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert(`Cannot add more than ${product.stock} units available.`);
        return;
      }
      existing.quantity += 1;
      this.posCart.set(current);
    } else {
      this.posCart.set([...current, { product, price: product.price, quantity: 1 }]);
    }
  }

  removeFromPosCart(idx: number) {
    const current = [...this.posCart()];
    current.splice(idx, 1);
    this.posCart.set(current);
    if (this.posKhqrSession()) {
      this.posKhqrSession.set(null);
      this.posKhqrPaid.set(false);
      this.stopPosKhqrPolling();
    }
  }

  updatePosCartQty(idx: number, delta: number) {
    const current = [...this.posCart()];
    const item = current[idx];
    if (!item) return;
    const nextQty = item.quantity + delta;
    if (nextQty <= 0) {
      this.removeFromPosCart(idx);
    } else if (nextQty > item.product.stock) {
      alert(`Only ${item.product.stock} units in stock.`);
    } else {
      item.quantity = nextQty;
      this.posCart.set(current);
      if (this.posKhqrSession()) {
        this.posKhqrSession.set(null);
        this.posKhqrPaid.set(false);
        this.stopPosKhqrPolling();
      }
    }
  }

  clearPosCart() {
    this.posCart.set([]);
    this.posCashReceived.set(0);
    this.posDiscount.set(0);
    this.posOrderError.set('');
    this.posKhqrSession.set(null);
    this.posKhqrPaid.set(false);
    this.stopPosKhqrPolling();
    this.showPosCustomerQrModal.set(false);
  }

  setCashPreset(val: number | 'EXACT') {
    if (val === 'EXACT') {
      this.posCashReceived.set(Math.ceil(this.posTotal() * 100) / 100);
    } else {
      this.posCashReceived.set(val);
    }
  }

  assignCustomerToCart(customer: { id?: string; name: string; phone?: string; email?: string }) {
    this.posAssignedCustomer.set(customer);
    this.posSubArea.set('checkout');
  }

  removeAssignedCustomer() {
    this.posAssignedCustomer.set(null);
  }

  quickAddCustomerSubmit() {
    if (!this.quickCustomerName().trim()) return;
    this.posAssignedCustomer.set({
      name: this.quickCustomerName().trim(),
      email: this.quickCustomerEmail().trim() || undefined,
      phone: this.quickCustomerPhone().trim() || undefined,
    });
    this.quickCustomerModalOpen.set(false);
    this.quickCustomerName.set('');
    this.quickCustomerEmail.set('');
    this.quickCustomerPhone.set('');
    this.posSubArea.set('checkout');
  }

  setPosPaymentMethod(method: 'CASH' | 'KHQR') {
    this.posPaymentMethod.set(method);
    this.posOrderError.set('');
    if (method === 'KHQR' && this.posCart().length > 0 && !this.posKhqrSession()) {
      this.generatePosKhqr();
    }
  }

  generatePosKhqr() {
    const storeId = this.myStoreId();
    if (!storeId || this.posCart().length === 0) return;

    this.generatingKhqr.set(true);
    this.posOrderError.set('');
    this.posKhqrPaid.set(false);
    this.stopPosKhqrPolling();

    const payload = {
      amount: this.posTotal(),
      items: this.posCart().map(i => ({
        name: i.product.name,
        quantity: i.quantity,
        price: i.price,
      })),
      customerName: this.posAssignedCustomer()?.name,
      customerPhone: this.posAssignedCustomer()?.phone,
    };

    this.requestKhqr(storeId, payload, false);
  }

  /** Charge any amount by KHQR without ringing up products (not recorded as a sale). */
  generateQuickKhqr(amount = this.quickKhqrAmount()) {
    const storeId = this.myStoreId();
    if (!storeId || !amount || amount <= 0) return;
    this.generatingKhqr.set(true);
    this.posOrderError.set('');
    this.posKhqrPaid.set(false);
    this.stopPosKhqrPolling();
    this.requestKhqr(storeId, { amount: Math.round(amount * 100) / 100 }, true);
  }

  private requestKhqr(storeId: string, payload: { amount: number; items?: any[]; customerName?: string; customerPhone?: string }, quick: boolean) {
    this.posKhqrNotice.set('');
    this.sellerService.generatePosKhqr(storeId, payload).subscribe({
      next: (session: any) => {
        this.generatingKhqr.set(false);
        this.posKhqrSession.set({ ...session, quick });
        // Customer-facing screen opens straight away so they can scan.
        this.showPosCustomerQrModal.set(true);
        // Only a PayWay transaction can be checked; a direct Bakong QR is
        // confirmed by the cashier from their own banking app.
        if (session.mode !== 'BAKONG') this.startPosKhqrPolling();
      },
      error: (err: any) => {
        this.generatingKhqr.set(false);
        const apiError = err.error?.error;
        if (apiError?.code === 'KHQR_NOT_SET_UP') {
          this.khqrSettings.update((k) => (k ? { ...k, configured: false, paywayAvailable: false } : { bakongAccountId: '', merchantName: '', city: '', configured: false, paywayAvailable: false }));
        }
        this.posOrderError.set(apiError?.message || err.message || 'Failed to generate Bakong KHQR code');
      },
    });
  }

  cancelPosKhqr() {
    this.stopPosKhqrPolling();
    this.posKhqrSession.set(null);
    this.posKhqrPaid.set(false);
    this.showPosCustomerQrModal.set(false);
  }

  startPosKhqrPolling() {
    this.stopPosKhqrPolling();
    this.posKhqrPollTimer = setInterval(() => {
      if (this.posKhqrSession() && !this.posKhqrPaid() && !this.checkingKhqrPayment()) {
        this.checkPosKhqrPayment(false);
      }
    }, 4000);
  }

  stopPosKhqrPolling() {
    if (this.posKhqrPollTimer) {
      clearInterval(this.posKhqrPollTimer);
      this.posKhqrPollTimer = null;
    }
  }

  checkPosKhqrPayment(manual = true) {
    const storeId = this.myStoreId();
    const session = this.posKhqrSession();
    if (!storeId || !session?.tranId) return;

    if (manual) {
      this.checkingKhqrPayment.set(true);
      this.posOrderError.set('');
    }

    this.sellerService.checkPosKhqr(storeId, session.tranId).subscribe({
      next: (res: any) => {
        this.checkingKhqrPayment.set(false);
        if (res.paid) {
          this.posKhqrPaid.set(true);
          this.stopPosKhqrPolling();
          this.submitPosOrder(session.tranId);
        } else if (manual) {
          this.posOrderError.set('Payment is still pending. Customer has not completed transfer yet.');
        }
      },
      error: (err: any) => {
        this.checkingKhqrPayment.set(false);
        if (manual) {
          this.posOrderError.set(err.error?.message || 'Payment status check failed');
        }
      },
    });
  }

  simulatePosKhqrPayment() {
    const storeId = this.myStoreId();
    const session = this.posKhqrSession();
    if (!storeId || !session?.tranId) return;

    this.checkingKhqrPayment.set(true);
    this.sellerService.simulatePosKhqr(storeId, session.tranId).subscribe({
      next: (res: any) => {
        this.checkingKhqrPayment.set(false);
        this.posKhqrPaid.set(true);
        this.stopPosKhqrPolling();
        this.showPosCustomerQrModal.set(false);
        this.submitPosOrder(session.tranId);
      },
      error: (err: any) => {
        this.checkingKhqrPayment.set(false);
        this.posOrderError.set(err.error?.message || 'Simulation failed');
      },
    });
  }

  confirmKhqrPaidAndComplete() {
    const session = this.posKhqrSession();
    this.showPosCustomerQrModal.set(false);
    if (session?.quick) {
      this.cancelPosKhqr();
      this.quickKhqrAmount.set(null);
      this.posKhqrNotice.set(`KHQR payment of $${session.amount.toFixed(2)} confirmed (ref ${session.tranId}).`);
      return;
    }
    this.submitPosOrder(session?.tranId);
  }

  submitPosOrder(tranId?: string) {
    const storeId = this.myStoreId();
    if (!storeId) return;
    if (this.posCart().length === 0) return;

    if (this.posPaymentMethod() === 'CASH' && this.posCashReceived() < this.posTotal()) {
      this.posOrderError.set(`Cash received ($${this.posCashReceived()}) is less than total payable ($${this.posTotal().toFixed(2)}).`);
      return;
    }

    this.posProcessingOrder.set(true);
    this.posOrderError.set('');

    const effectiveTranId = tranId || (this.posPaymentMethod() === 'KHQR' ? this.posKhqrSession()?.tranId : undefined);

    const payload = {
      registerId: this.activeRegisterId() || undefined,
      shiftId: this.posShift()?.id || this.posShift()?._id || undefined,
      items: this.posCart().map(i => ({
        productId: i.product.id,
        quantity: i.quantity,
        price: i.price,
      })),
      paymentMethod: this.posPaymentMethod() === 'KHQR' ? 'POS_KHQR' : 'POS_CASH',
      paymentTranId: effectiveTranId,
      discountAmount: this.posDiscount(),
      taxAmount: this.posTaxAmount(),
      cashReceived: this.posPaymentMethod() === 'CASH' ? this.posCashReceived() : undefined,
      customerName: this.posAssignedCustomer()?.name,
      customerPhone: this.posAssignedCustomer()?.phone,
    };

    this.sellerService.createPosOrder(storeId, payload).subscribe({
      next: (res: any) => {
        this.posProcessingOrder.set(false);
        this.stopPosKhqrPolling();
        this.posKhqrSession.set(null);
        this.posKhqrPaid.set(false);
        this.showPosCustomerQrModal.set(false);
        const receipt = res.receipt || {
          orderNumber: res.order?.orderNumber || `KC-POS-${Date.now().toString().slice(-6)}`,
          createdAt: new Date().toISOString(),
          items: this.posCart().map(i => ({ name: i.product.name, qty: i.quantity, price: i.price })),
          subtotal: this.posSubtotal(),
          discount: this.posDiscount(),
          tax: this.posTaxAmount(),
          total: this.posTotal(),
          paymentMethod: this.posPaymentMethod(),
          cashReceived: this.posCashReceived(),
          change: this.posChange(),
        };
        this.posReceipt.set(receipt);
        this.clearPosCart();
        this.posAssignedCustomer.set(null);
        this.sellerService.getPosCurrentShift(storeId, this.activeRegisterId() || undefined).subscribe(s => this.posShift.set(s));
        this.loadPosOrders(storeId);
        this.loadStoreProducts(storeId);
        this.loadPosReports(storeId);
      },
      error: (err: any) => {
        this.posProcessingOrder.set(false);
        this.posOrderError.set(err.error?.message || err.message || 'Failed to complete POS order');
      },
    });
  }

  openPosShiftSubmit() {
    const storeId = this.myStoreId();
    if (!storeId) return;
    this.sellerService.openPosShift(storeId, {
      startingCash: this.posStartingFloat(),
      registerId: this.activeRegisterId() || undefined,
    }).subscribe({
      next: (shift) => {
        this.posShift.set(shift);
        this.posShiftModalOpen.set(false);
        this.loadPosShiftsList(storeId);
      },
      error: (err: any) => alert(err.error?.message || 'Failed to open shift'),
    });
  }

  openCloseShiftModal() {
    const shift = this.posShift();
    if (shift) {
      this.posActualCash.set(shift.expectedCash || 0);
    }
    this.posCloseShiftModalOpen.set(true);
  }

  closePosShiftSubmit() {
    const storeId = this.myStoreId();
    if (!storeId) return;
    this.sellerService.closePosShift(storeId, this.posActualCash(), this.posShiftNotes()).subscribe({
      next: () => {
        this.posShift.set(null);
        this.posCloseShiftModalOpen.set(false);
        this.posShiftNotes.set('');
        this.loadPosShiftsList(storeId);
        this.loadPosReports(storeId);
        alert('Register shift closed successfully.');
      },
      error: (err: any) => alert(err.error?.message || 'Failed to close shift'),
    });
  }

  openCashMovementModal() {
    this.posCashMovementAmount.set(0);
    this.posCashMovementReason.set('');
    this.posCashMovementModalOpen.set(true);
  }

  recordCashMovementSubmit() {
    const storeId = this.myStoreId();
    if (!storeId || this.posCashMovementAmount() <= 0) return;
    this.sellerService.recordPosCashMovement(storeId, this.posCashMovementType(), this.posCashMovementAmount(), this.posCashMovementReason()).subscribe({
      next: (shift) => {
        this.posShift.set(shift);
        this.posCashMovementModalOpen.set(false);
      },
      error: (err: any) => alert(err.error?.message || 'Failed to record cash movement'),
    });
  }

  openRefundModal(order: any) {
    this.selectedOrderForRefund.set(order);
    this.refundItemsSelection.set(
      (order.items || order.myItems || []).map((i: any) => ({
        itemId: i.productId || i._id,
        name: i.productName || i.name,
        maxQty: i.quantity || i.qty || 1,
        qty: i.quantity || i.qty || 1,
        unitPrice: i.unitPrice || i.price || 0,
        returnToInventory: true,
      }))
    );
    this.refundReason.set('');
    this.refundMethod.set(order.paymentMethod?.includes('CASH') ? 'POS_CASH' : 'ORIGINAL_PAYMENT');
    this.refundError.set('');
    this.refundModalOpen.set(true);
  }

  updateRefundItemQty(idx: number, delta: number) {
    const items = [...this.refundItemsSelection()];
    const item = items[idx];
    if (!item) return;
    const next = item.qty + delta;
    if (next >= 0 && next <= item.maxQty) {
      item.qty = next;
      this.refundItemsSelection.set(items);
    }
  }

  toggleRefundReturnStock(idx: number) {
    const items = [...this.refundItemsSelection()];
    if (items[idx]) {
      items[idx].returnToInventory = !items[idx].returnToInventory;
      this.refundItemsSelection.set(items);
    }
  }

  submitRefund() {
    const storeId = this.myStoreId();
    const order = this.selectedOrderForRefund();
    if (!storeId || !order) return;

    const itemsToRefund = this.refundItemsSelection().filter(i => i.qty > 0);
    if (itemsToRefund.length === 0) {
      this.refundError.set('Please select at least 1 item quantity to refund.');
      return;
    }
    if (!this.refundReason().trim()) {
      this.refundError.set('Please enter a reason for the return / refund.');
      return;
    }

    this.isRefunding.set(true);
    this.refundError.set('');

    const payload = {
      items: itemsToRefund.map(i => ({
        productId: i.itemId,
        quantity: i.qty,
        returnToInventory: i.returnToInventory,
      })),
      reason: this.refundReason().trim(),
      refundMethod: this.refundMethod(),
    };

    const orderId = order.id || order._id;
    this.sellerService.createPosRefund(storeId, orderId, payload).subscribe({
      next: () => {
        this.isRefunding.set(false);
        this.refundModalOpen.set(false);
        this.selectedOrderForRefund.set(null);
        this.loadPosOrders(storeId);
        this.loadPosRefundsList(storeId);
        this.sellerService.getPosCurrentShift(storeId, this.activeRegisterId() || undefined).subscribe(s => this.posShift.set(s));
        this.loadStoreProducts(storeId);
        this.loadPosReports(storeId);
        alert('Refund processed successfully.');
      },
      error: (err: any) => {
        this.isRefunding.set(false);
        this.refundError.set(err.error?.message || err.message || 'Failed to process refund');
      },
    });
  }

  openVoidModal(order: any) {
    this.selectedOrderForVoid.set(order);
    this.voidReasonText.set('');
    this.voidError.set('');
    this.voidModalOpen.set(true);
  }

  submitVoid() {
    const storeId = this.myStoreId();
    const order = this.selectedOrderForVoid();
    if (!storeId || !order) return;

    this.isVoiding.set(true);
    this.voidError.set('');

    const orderId = order.id || order._id;
    this.sellerService.voidPosOrder(storeId, orderId, this.voidReasonText().trim() || 'Manager Void').subscribe({
      next: () => {
        this.isVoiding.set(false);
        this.voidModalOpen.set(false);
        this.selectedOrderForVoid.set(null);
        this.loadPosOrders(storeId);
        this.sellerService.getPosCurrentShift(storeId, this.activeRegisterId() || undefined).subscribe(s => this.posShift.set(s));
        this.loadStoreProducts(storeId);
        this.loadPosReports(storeId);
        alert('Order voided and stock restored.');
      },
      error: (err: any) => {
        this.isVoiding.set(false);
        this.voidError.set(err.error?.message || err.message || 'Failed to void order');
      },
    });
  }

  exportPosReportCsv() {
    const orders = this.posOrders();
    let csv = 'Receipt_Number,Date,Customer,Payment_Method,Total,Status\n';
    orders.forEach((o) => {
      const num = o.orderNumber || o.id;
      const date = new Date(o.createdAt).toLocaleDateString();
      const cust = o.buyerName || 'Walk-in';
      const method = o.paymentMethod || 'CASH';
      const tot = o.totalAmount || 0;
      const st = o.orderStatus || 'COMPLETED';
      csv += `"${num}","${date}","${cust}","${method}",${tot},"${st}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KhmerCraft_POS_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  savePosSettings() {
    this.posSettingsSaved.set(true);
    setTimeout(() => this.posSettingsSaved.set(false), 3000);
  }

  printReceipt() {
    window.print();
  }

  viewPosOrderReceipt(order: any) {
    this.posReceipt.set({
      orderNumber: order.orderNumber || order.id,
      createdAt: order.createdAt,
      items: (order.myItems || order.items || []).map((i: any) => ({ name: i.productName || i.name, qty: i.quantity || i.qty, price: i.unitPrice || i.price })),
      subtotal: order.myTotal || order.totalAmount,
      discount: order.discountAmount || 0,
      tax: order.taxAmount || 0,
      total: order.myTotal || order.totalAmount,
      paymentMethod: order.paymentMethod,
      cashReceived: order.cashReceived || order.myTotal || order.totalAmount,
      change: order.changeGiven || 0,
    });
  }

  // ---------------------- Customers Logic ----------------------
  loadCustomers(storeId: string) {
    this.sellerService.getStoreCustomers(storeId).subscribe({
      next: (res: any) => this.customers.set(Array.isArray(res) ? res : (res?.customers || [])),
      error: () => this.customers.set([]),
    });
  }

  openCustomerDetail(c: any) {
    this.selectedCustomer.set(c);
    this.customerDetail.set(null);
    this.loadingCustomerDetail.set(true);
    const storeId = this.myStoreId();
    if (!storeId) return;
    this.sellerService.getStoreCustomerDetail(storeId, c.id).subscribe({
      next: (detail) => {
        this.customerDetail.set(detail);
        this.loadingCustomerDetail.set(false);
      },
      error: () => this.loadingCustomerDetail.set(false),
    });
  }

  closeCustomerDetail() {
    this.selectedCustomer.set(null);
  }

  // ---------------------- Promotions Logic ----------------------
  loadPromotions(storeId: string) {
    this.sellerService.getStorePromotions(storeId).subscribe({
      next: (res) => this.discounts.set(res),
      error: () => this.discounts.set([]),
    });
  }

  submitCreateDiscount() {
    const storeId = this.myStoreId();
    if (!storeId) return;
    const d = this.newDiscount();
    if (!d.name || !d.value) {
      this.discountError.set('Name and discount value are required.');
      return;
    }
    this.creatingDiscount.set(true);
    this.sellerService.createStorePromotion(storeId, d).subscribe({
      next: () => {
        this.creatingDiscount.set(false);
        this.showCreateDiscountModal.set(false);
        this.loadPromotions(storeId);
      },
      error: (err) => {
        this.creatingDiscount.set(false);
        this.discountError.set(err.error?.message || err.message || 'Failed to create discount');
      },
    });
  }

  deleteDiscount(id: string) {
    const storeId = this.myStoreId();
    if (!storeId || !confirm('Remove this promotion?')) return;
    this.sellerService.deleteStorePromotion(storeId, id).subscribe({
      next: () => this.loadPromotions(storeId),
      error: (err) => alert('Failed to delete promotion: ' + err.message),
    });
  }

  // ---------------------- Advertisements Logic ----------------------
  loadAdvertisements(storeId: string) {
    this.sellerService.getPromotionCampaigns().subscribe({
      next: (res: any) => this.promoCampaigns.set(res || []),
      error: () => this.promoCampaigns.set([]),
    });
    this.sellerService.getMyPromotionSlides().subscribe({
      next: (res: any) => this.myPromoSlides.set(res || []),
      error: () => this.myPromoSlides.set([]),
    });
  }

  openApplyPromoModal(campaignId?: string) {
    const today = new Date().toISOString().split('T')[0];
    this.editingSlideId.set(null);
    let isFree = true;
    let freeDays = 7;
    let dailyRate = 3;
    let targetCampaignId = campaignId || '';

    if (campaignId) {
      const c = this.promoCampaigns().find((x) => (x._id || x.id) === campaignId);
      if (c) {
        isFree = c.isFree !== false;
        freeDays = c.freeDays ?? (c.isFree ? 7 : 0);
        dailyRate = c.dailyRate ?? 3;
      }
    } else {
      const firstActive = this.promoCampaigns().find((x) => x.isFree);
      if (firstActive) {
        targetCampaignId = firstActive._id || firstActive.id;
        isFree = true;
        freeDays = firstActive.freeDays ?? 7;
        dailyRate = firstActive.dailyRate ?? 3;
      }
    }

    this.promoForm.set({
      campaignId: targetCampaignId,
      title: '',
      subtitle: '',
      targetType: 'STORE',
      targetId: '',
      imageUrl: '',
      startDate: today,
      days: 7,
      isFree,
      freeDays,
      dailyRate,
    });
    this.showPromoModal.set(true);
  }

  editPromoSlide(slide: any) {
    this.editingSlideId.set(slide._id || slide.id);
    let startDate = new Date().toISOString().split('T')[0];
    if (slide.startDate) {
      try {
        startDate = new Date(slide.startDate).toISOString().split('T')[0];
      } catch {
        startDate = new Date().toISOString().split('T')[0];
      }
    }
    const c = this.promoCampaigns().find((x) => (x._id || x.id) === slide.campaignId);
    const isFree = slide.freeDays > 0 || (c ? c.isFree !== false : true);
    const freeDays = slide.freeDays ?? (c ? (c.freeDays ?? 7) : 7);
    const dailyRate = slide.dailyRate ?? (c ? (c.dailyRate ?? 3) : 3);

    this.promoForm.set({
      campaignId: slide.campaignId || '',
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      targetType: slide.targetType || 'STORE',
      targetId: slide.targetId || '',
      imageUrl: slide.imageUrl || '',
      startDate,
      days: slide.days || 7,
      isFree,
      freeDays,
      dailyRate,
    });
    this.showPromoModal.set(true);
  }

  saveDraftPromoSlide() {
    this.submitOrSavePromo(true);
  }

  submitPromoSlide() {
    this.submitOrSavePromo(false);
  }

  submitOrSavePromo(isDraft: boolean) {
    const storeId = this.myStoreId();
    if (!storeId) return;
    const f = this.promoForm();
    if (!isDraft && !f.title?.trim()) {
      alert('Headline title is required before submitting.');
      return;
    }
    this.submittingPromo.set(true);

    const calc = this.promoCalculation();
    const payload: any = {
      ...f,
      storeId,
      targetId: f.targetType === 'STORE' ? storeId : f.targetId,
      days: calc.days,
      freeDays: calc.freeDays,
      billableDays: calc.billableDays,
      dailyRate: calc.dailyRate,
      totalPrice: calc.totalPrice,
      isDraft,
      status: isDraft ? 'DRAFT' : 'PENDING_APPROVAL',
    };

    const editingId = this.editingSlideId();
    const req$ = editingId
      ? this.sellerService.updatePromotionSlide(editingId, payload)
      : this.sellerService.applyPromotionSlide(payload);

    req$.subscribe({
      next: () => {
        this.submittingPromo.set(false);
        this.showPromoModal.set(false);
        this.editingSlideId.set(null);
        this.loadAdvertisements(storeId);
        if (isDraft) {
          alert('Advertisement saved as draft.');
        } else if (calc.isZero) {
          alert('Free advertisement submitted for review! No payment required.');
        } else {
          alert(`Advertisement request submitted ($${calc.totalPrice}).`);
        }
      },
      error: (err: any) => {
        this.submittingPromo.set(false);
        alert('Failed: ' + (err.error?.message || err.message));
      },
    });
  }

  submitDraftPromo(slide: any) {
    const storeId = this.myStoreId();
    if (!storeId) return;
    const id = slide._id || slide.id;
    this.sellerService.submitDraftPromotionSlide(id).subscribe({
      next: () => {
        this.loadAdvertisements(storeId);
        alert('Advertisement draft submitted for review.');
      },
      error: (err: any) => alert('Failed to submit: ' + (err.error?.message || err.message)),
    });
  }

  deletePromoSlide(slide: any) {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;
    const storeId = this.myStoreId();
    if (!storeId) return;
    const id = slide._id || slide.id;
    this.sellerService.deletePromotionSlide(id).subscribe({
      next: () => {
        this.loadAdvertisements(storeId);
      },
      error: (err: any) => alert('Failed to delete: ' + (err.error?.message || err.message)),
    });
  }

  openKhqrPaymentModal(slide: any) {
    this.selectedSlideForPayment.set(slide);
    this.showKhqrModal.set(true);
  }

  verifySlidePayment(slide: any) {
    const storeId = this.myStoreId();
    if (!storeId) return;
    this.sellerService.payPromotionSlide(slide._id || slide.id).subscribe({
      next: () => {
        this.showKhqrModal.set(false);
        this.loadAdvertisements(storeId);
        alert('Payment verified! Your advertisement is now scheduled.');
      },
      error: (err: any) => alert('Payment verification failed: ' + (err.error?.message || err.message)),
    });
  }

  // ---------------------- Storefront & Profile ----------------------
  /** Storefronts are buyer pages, so they live on the marketplace origin. */
  activeStorefrontUrl(): string {
    const s = this.activeStore();
    return marketplaceUrl(s ? `/stores/${s.slug || s.id || (s as any)._id}` : '/stores');
  }

  saveStoreProfile() {
    const storeId = this.myStoreId();
    if (!storeId) return;
    this.savingProfile.set(true);
    const p = this.storeProfile();
    const payload: any = {};
    if (p.storeName) payload.storeName = p.storeName;
    if (p.storeDescription !== undefined) payload.storeDescription = p.storeDescription;
    if (p.storeTagline !== undefined) payload.storeTagline = p.storeTagline;
    if (p.announcement !== undefined) payload.announcement = p.announcement;
    if (p.theme) payload.theme = p.theme;
    if (p.category !== undefined) payload.category = p.category;
    if (p.showContact !== undefined) payload.showContact = Boolean(p.showContact);
    if (p.location !== undefined) payload.location = p.location;
    if (p.phoneNumber !== undefined) payload.phoneNumber = p.phoneNumber;
    if (p.appearance) payload.appearance = p.appearance;
    // Only newly picked images: re-sending a saved one would re-compress it on every save.
    if (this.changedImages().logoUrl && p.logoUrl) payload.logoUrl = p.logoUrl;
    if (this.changedImages().bannerUrl && p.bannerUrl) payload.bannerUrl = p.bannerUrl;
    if (Array.isArray(p.featuredProductIds)) {
      payload.featuredProductIds = p.featuredProductIds.filter((id: string) => /^[a-f\d]{24}$/i.test(id));
    }
    if (Object.keys(payload).length === 0) {
      payload.storeName = p.storeName || 'My Store';
    }

    this.sellerService.updateStoreProfile(storeId, payload).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.loadMyStores(storeId);
        alert('Store profile and appearance saved successfully.');
      },
      error: (err: any) => {
        this.savingProfile.set(false);
        alert('Failed to save profile: ' + (err.error?.message || err.message));
      },
    });
  }

  // ---------------------- Payouts ----------------------
  loadPayouts(storeId = this.myStoreId()) {
    if (!storeId) return;
    this.payoutError.set('');
    this.sellerService.getPayoutSummary(storeId).subscribe({
      next: (summary) => {
        this.payoutSummary.set(summary);
        // No account yet: open the form straight away.
        this.editingPayoutAccount.set(!summary.account);
        if (!summary.account) this.payoutForm.set({ method: 'ABA', bankName: '', accountName: '', accountNumber: '', phone: '', khqrImage: null });
      },
      error: (err: any) => this.payoutError.set(err.error?.error?.message || 'Could not load your payouts.'),
    });
  }

  startEditPayoutAccount() {
    const a = this.payoutSummary()?.account;
    this.payoutForm.set({
      method: a?.method ?? 'ABA',
      bankName: a?.bankName ?? '',
      accountName: a?.accountName ?? '',
      accountNumber: a?.accountNumber ?? '',
      phone: a?.phone ?? '',
      khqrImage: a?.khqrImage ?? null,
    });
    this.editingPayoutAccount.set(true);
  }

  onPayoutKhqrFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 3.5 * 1024 * 1024) { this.payoutError.set('That image is larger than 3.5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => this.payoutForm.set({ ...this.payoutForm(), khqrImage: String(reader.result) });
    reader.readAsDataURL(file);
  }

  savePayoutAccount() {
    const storeId = this.myStoreId();
    if (!storeId) return;
    const f = this.payoutForm();
    this.savingPayoutAccount.set(true);
    this.payoutError.set('');
    this.sellerService
      .savePayoutAccount(storeId, {
        method: f.method,
        bankName: f.method === 'OTHER_BANK' ? f.bankName.trim() : undefined,
        accountName: f.accountName.trim(),
        accountNumber: f.accountNumber.trim(),
        phone: f.phone.trim() || undefined,
        khqrImage: f.khqrImage,
      })
      .subscribe({
        next: () => { this.savingPayoutAccount.set(false); this.editingPayoutAccount.set(false); this.loadPayouts(storeId); },
        error: (err: any) => {
          this.savingPayoutAccount.set(false);
          const details = err.error?.error?.details as Record<string, string[]> | undefined;
          const first = details ? Object.values(details)[0]?.[0] : undefined;
          this.payoutError.set(first || err.error?.error?.message || 'Could not save the payout account.');
        },
      });
  }

  openPayoutReceipt(payoutId: string) {
    this.sellerService.getPayout(payoutId).subscribe({
      next: (p) => this.payoutReceipt.set(p),
      error: () => this.payoutError.set('Could not open that receipt.'),
    });
  }

  payoutMethodLabel(method: PayoutMethod, bankName?: string | null) {
    return method === 'OTHER_BANK' ? (bankName || 'Bank') : ({ ABA: 'ABA Bank', ACLEDA: 'ACLEDA Bank', WING: 'Wing Bank' } as Record<string, string>)[method];
  }

  scheduleLabel(settings: PayoutSettings) {
    const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][settings.payoutWeekday];
    return settings.payoutSchedule === 'MONTHLY' ? `on the first ${day} of each month` : settings.payoutSchedule === 'BIWEEKLY' ? `every other ${day}` : `every ${day}`;
  }

  // ---------------------- Finance & Analytics ----------------------
  loadFinance(storeId: string) {
    this.sellerService.getStoreFinance(storeId).subscribe({
      next: (res) => this.financeData.set(res),
      error: () => this.financeData.set({}),
    });
  }

  loadAnalytics(storeId: string) {
    this.sellerService.getStoreAnalytics(storeId, this.analyticsPeriod()).subscribe({
      next: (res) => this.analyticsData.set(res),
      error: () => this.analyticsData.set({}),
    });
  }

  setAnalyticsPeriod(p: 'today' | '7d' | '30d' | 'all') {
    this.analyticsPeriod.set(p);
    const storeId = this.myStoreId();
    if (storeId) this.loadAnalytics(storeId);
  }

  // ---------------------- Reports ----------------------
  protected readonly reportPreviewData = computed(() => {
    const type = this.reportType();
    if (type === 'products') {
      return this.products().map(p => ({ col1: p.name, col2: p.category, col3: `$${p.price}`, col4: `${p.stock} units` }));
    } else if (type === 'customers') {
      return this.customers().map(c => ({ col1: c.name, col2: c.email, col3: `${c.ordersCount} orders`, col4: `$${c.totalSpent.toFixed(2)}` }));
    } else if (type === 'pos') {
      return this.posOrders().map(o => ({ col1: o.orderNumber, col2: o.paymentMethod, col3: `$${o.totalAmount}`, col4: new Date(o.createdAt).toLocaleDateString() }));
    } else {
      return this.orders().map(o => ({ col1: o.id, col2: o.buyer, col3: o.total, col4: o.status }));
    }
  });

  exportReportCSV() {
    const data = this.reportPreviewData();
    let csv = 'Record,Name_Description,Metric_A,Metric_B,Status_Date\n';
    data.forEach((row, i) => {
      csv += `${i + 1},"${row.col1}","${row.col2}","${row.col3}","${row.col4}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KhmerCraft_${this.reportType()}_report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------------------- Support Cases ----------------------
  loadSupportCases(storeId: string) {
    this.sellerService.getStoreSupportCases(storeId).subscribe({
      next: (res) => this.supportCases.set(res),
      error: () => this.supportCases.set([]),
    });
  }

  submitSupportCase() {
    const storeId = this.myStoreId();
    if (!storeId) return;
    const c = this.newCase();
    if (!c.subject || !c.description) {
      alert('Subject and description are required.');
      return;
    }
    this.sellerService.createStoreSupportCase(storeId, c).subscribe({
      next: () => {
        this.showCreateCaseModal.set(false);
        this.loadSupportCases(storeId);
      },
      error: (err) => alert('Failed to create support case: ' + err.message),
    });
  }

  openCaseDetail(sc: any) {
    this.selectedCase.set(sc);
    this.replyText.set('');
  }

  submitReplySupportCase() {
    const sc = this.selectedCase();
    const storeId = this.myStoreId();
    const text = this.replyText();
    if (!sc || !storeId || !text) return;

    this.submittingReply.set(true);
    this.sellerService.replyStoreSupportCase(storeId, sc.id || sc._id, text).subscribe({
      next: (updated) => {
        this.submittingReply.set(false);
        this.selectedCase.set(updated);
        this.replyText.set('');
        this.loadSupportCases(storeId);
      },
      error: (err) => {
        this.submittingReply.set(false);
        alert('Failed to reply: ' + err.message);
      },
    });
  }

  loadNotifications(storeId: string) {
    this.sellerService.getStoreNotifications(storeId).subscribe({
      next: (list) => this.notifications.set(list),
      error: () => this.notifications.set([]),
    });
  }

  // ---------------------- Settings & Auth ----------------------
  updatePassword() {
    if (!this.currentPassword() || !this.newPassword()) {
      alert('Please fill in password fields.');
      return;
    }
    if (this.newPassword() !== this.confirmNewPassword()) {
      alert('New passwords do not match.');
      return;
    }
    this.authService.changePassword(this.currentPassword(), this.newPassword(), this.confirmNewPassword()).subscribe({
      next: () => {
        alert('Password updated successfully.');
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmNewPassword.set('');
      },
      error: (err) => alert('Failed to update password: ' + err.message),
    });
  }

  // ---------------------- Artwork & Image Processing ----------------------
  async processImageFile(file: File, maxWidth = 1200, maxHeight = 800): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(url);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } catch {
          URL.revokeObjectURL(url);
          resolve(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image file'));
      };
      img.src = url;
    });
  }

  async onPromoArtworkFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const dataUrl = await this.processImageFile(file, 1200, 500);
      this.promoForm.update((f) => ({ ...f, imageUrl: dataUrl }));
    } catch {
      alert('Could not open image file. Please choose a valid image.');
    }
  }

  clearPromoArtwork() {
    this.promoForm.update((f) => ({ ...f, imageUrl: '' }));
  }

  // ---------------------- Collections Logic ----------------------
  loadCollections(storeId?: string) {
    const id = storeId || this.myStoreId();
    if (!id) return;
    this.loadingCollections.set(true);
    this.sellerService.getStoreCollections(id).subscribe({
      next: (cols) => {
        this.collections.set(cols);
        this.loadingCollections.set(false);
      },
      error: (err) => {
        console.error('Failed to load collections', err);
        this.loadingCollections.set(false);
      },
    });
  }

  openCreateCollectionModal() {
    this.colForm.set({
      name: '',
      description: '',
      coverImage: '',
      productIds: [],
      visible: true,
    });
    this.collectionSaveError.set('');
    this.showCollectionModal.set(true);
  }

  editCollection(col: StoreCollectionDTO) {
    this.colForm.set({
      id: col.id,
      name: col.name,
      description: col.description || '',
      coverImage: col.coverImage || '',
      productIds: [...col.productIds],
      visible: col.visible !== false,
    });
    this.collectionSaveError.set('');
    this.showCollectionModal.set(true);
  }

  closeCollectionModal() {
    this.showCollectionModal.set(false);
    this.collectionSaveError.set('');
  }

  async onCollectionCoverSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const dataUrl = await this.processImageFile(file, 1200, 600);
      this.colForm.update((f) => ({ ...f, coverImage: dataUrl }));
    } catch {
      alert('Could not open image file. Please choose a valid image.');
    }
  }

  isProductInCollection(productId: string): boolean {
    return this.colForm().productIds.includes(productId);
  }

  toggleProductInCollection(productId: string) {
    this.colForm.update((f) => {
      const exists = f.productIds.includes(productId);
      const updated = exists ? f.productIds.filter((id) => id !== productId) : [...f.productIds, productId];
      return { ...f, productIds: updated };
    });
  }

  selectAllProductsForCollection() {
    const allIds = this.products().map((p) => p.id);
    this.colForm.update((f) => ({ ...f, productIds: allIds }));
  }

  clearAllProductsForCollection() {
    this.colForm.update((f) => ({ ...f, productIds: [] }));
  }

  submitCollection() {
    const f = this.colForm();
    const storeId = this.myStoreId();
    if (!storeId || !f.name.trim()) return;

    this.savingCollection.set(true);
    this.collectionSaveError.set('');

    const payload = {
      name: f.name.trim(),
      description: f.description.trim(),
      coverImage: f.coverImage,
      productIds: f.productIds,
      visible: f.visible,
    };

    const request$ = f.id
      ? this.sellerService.updateStoreCollection(storeId, f.id, payload)
      : this.sellerService.createStoreCollection(storeId, payload);

    request$.subscribe({
      next: () => {
        this.savingCollection.set(false);
        this.closeCollectionModal();
        this.loadCollections(storeId);
      },
      error: (err) => {
        this.savingCollection.set(false);
        this.collectionSaveError.set(err.error?.message || err.message || 'Failed to save collection');
      },
    });
  }

  deleteCollection(col: StoreCollectionDTO) {
    const storeId = this.myStoreId();
    if (!storeId || !confirm(`Are you sure you want to delete the "${col.name}" collection?`)) return;
    this.sellerService.deleteStoreCollection(storeId, col.id).subscribe({
      next: () => this.loadCollections(storeId),
      error: (err) => alert(err.error?.message || 'Failed to delete collection'),
    });
  }

  createAnotherStore() {
    void this.router.navigate(['/seller/onboarding'], { queryParams: { new: '1' } });
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => void this.router.navigateByUrl('/'),
    });
  }
}
