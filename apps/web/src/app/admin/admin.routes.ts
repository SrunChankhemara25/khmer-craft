import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';

export const ADMIN_ROUTES: Routes = [{
  path: '', component: AdminLayoutComponent, children: [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: 'dashboard',     loadComponent: () => import('./pages/dashboard.component').then(c => c.DashboardComponent) },
    { path: 'buyers',        loadComponent: () => import('./pages/buyers.component').then(c => c.BuyersComponent) },
    { path: 'sellers',       loadComponent: () => import('./pages/sellers.component').then(c => c.SellersComponent) },
    { path: 'stores',        loadComponent: () => import('./pages/stores.component').then(c => c.StoresComponent) },
    { path: 'websites',      loadComponent: () => import('./pages/websites.component').then(c => c.WebsitesComponent) },
    { path: 'pos',           loadComponent: () => import('./pages/pos.component').then(c => c.PosComponent) },
    { path: 'products',      loadComponent: () => import('./pages/products.component').then(c => c.ProductsComponent) },
    { path: 'categories',    loadComponent: () => import('./pages/categories.component').then(c => c.CategoriesComponent) },
    { path: 'reviews',       loadComponent: () => import('./pages/reviews.component').then(c => c.ReviewsComponent) },
    { path: 'payments',      loadComponent: () => import('./pages/payments.component').then(c => c.PaymentsComponent) },
    { path: 'transactions',  loadComponent: () => import('./pages/transactions.component').then(c => c.TransactionsComponent) },
    { path: 'payouts',       loadComponent: () => import('./pages/payouts.component').then(c => c.PayoutsComponent) },
    { path: 'promotions',    loadComponent: () => import('./pages/promotions.component').then(c => c.PromotionsComponent) },
    { path: 'analytics',     loadComponent: () => import('./pages/analytics.component').then(c => c.AnalyticsComponent) },
    { path: 'reports',       loadComponent: () => import('./pages/reports.component').then(c => c.ReportsComponent) },
    { path: 'complaints',    loadComponent: () => import('./pages/complaints.component').then(c => c.ComplaintsComponent) },
    { path: 'activity-logs', loadComponent: () => import('./pages/activity-logs.component').then(c => c.ActivityLogsComponent) },
    { path: 'notifications', loadComponent: () => import('./pages/notifications.component').then(c => c.NotificationsComponent) },
    { path: 'settings',      loadComponent: () => import('./pages/settings.component').then(c => c.SettingsComponent) },
  ],
}];
