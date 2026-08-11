import { Routes } from '@angular/router';
import { AppLayout } from './components/layout/layout';
import { HomePage } from './pages/home/home';
import { SellerPage } from './pages/seller/seller';
import { AboutPage } from './pages/about/about';
import { SellerOnboardingPage } from './pages/seller-onboarding/seller-onboarding';
import { SellerDashboardPage } from './pages/seller-dashboard/seller-dashboard';

export const routes: Routes = [
  { path: 'seller/onboarding', component: SellerOnboardingPage },
  { path: 'seller/dashboard', component: SellerDashboardPage },
  {
    path: '',
    component: AppLayout,
    children: [
      { path: '', component: HomePage },
      { path: 'seller', component: SellerPage },
      { path: 'about', component: AboutPage },
    ],
  },
];
