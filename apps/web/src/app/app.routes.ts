import { Routes } from '@angular/router';
import { buyerGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((module) => module.Login),
    title: 'Sign in | KhmerCraft',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register').then(
        (module) => module.Register,
      ),
    title: 'Create buyer account | KhmerCraft',
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then(
        (module) => module.ForgotPassword,
      ),
    title: 'Forgot password | KhmerCraft',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then(
        (module) => module.ResetPassword,
      ),
    title: 'Reset password | KhmerCraft',
  },
  {
    path: 'account/change-password',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./features/auth/change-password/change-password').then(
        (module) => module.ChangePassword,
      ),
    title: 'Change password | KhmerCraft',
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/auth/admin-login/admin-login').then(
        (module) => module.AdminLogin,
      ),
    title: 'Admin sign in | KhmerCraft',
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
