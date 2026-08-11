import { Routes } from '@angular/router';
import { buyerGuard } from './core/auth/auth.guard';
import { sellerGuard } from './core/auth/seller.guard';

/**
 * Everything is lazy-loaded. The storefront branch imported all 19 page
 * components eagerly, which put the whole site in the initial bundle.
 */
export const routes: Routes = [
  // ---------------------------------------------------------------- storefront
  {
    path: '',
    loadComponent: () =>
      import('./pages/home.component').then((m) => m.HomeComponent),
    title: 'KhmerCraft — Cambodian handmade crafts & local products',
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./pages/products.component').then((m) => m.ProductsComponent),
    title: 'Products | KhmerCraft',
  },
  {
    path: 'product/:id',
    loadComponent: () =>
      import('./pages/product-detail.component').then(
        (m) => m.ProductDetailComponent,
      ),
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./pages/categories.component').then((m) => m.CategoriesComponent),
    title: 'Categories | KhmerCraft',
  },
  {
    path: 'categories/:slug',
    loadComponent: () =>
      import('./pages/category-detail.component').then(
        (m) => m.CategoryDetailComponent,
      ),
  },
  {
    path: 'stores',
    loadComponent: () =>
      import('./pages/stores.component').then((m) => m.StoresComponent),
    title: 'Stores | KhmerCraft',
  },
  {
    path: 'stores/:id',
    loadComponent: () =>
      import('./pages/store-detail.component').then(
        (m) => m.StoreDetailComponent,
      ),
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./pages/cart.component').then((m) => m.CartComponent),
    title: 'Your cart | KhmerCraft',
  },
  {
    path: 'wishlist',
    loadComponent: () =>
      import('./pages/wishlist.component').then((m) => m.WishlistComponent),
    title: 'Your wishlist | KhmerCraft',
  },

  // ------------------------------------------------------------------ checkout
  // Guarded: an anonymous visitor is sent to /login with a returnUrl rather
  // than filling in a delivery address they cannot submit.
  // One real checkout page replaces the four-step mock chain: the server
  // prices the order, so there is no intermediate state worth three extra
  // navigations. The old step URLs still resolve so no link breaks.
  {
    path: 'checkout',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./pages/checkout.component').then((m) => m.CheckoutComponent),
    title: 'Checkout | KhmerCraft',
  },
  { path: 'checkout/shipping', pathMatch: 'full', redirectTo: 'checkout' },
  { path: 'checkout/payment', pathMatch: 'full', redirectTo: 'checkout' },
  { path: 'checkout/review', pathMatch: 'full', redirectTo: 'checkout' },
  {
    path: 'order-success',
    loadComponent: () =>
      import('./pages/order-success.component').then(
        (m) => m.OrderSuccessComponent,
      ),
    title: 'Order confirmed | KhmerCraft',
  },

  // ----------------------------------------------------------------- marketing
  {
    path: 'about',
    loadComponent: () =>
      import('./pages/about.component').then((m) => m.AboutComponent),
    title: 'About | KhmerCraft',
  },
  {
    path: 'become-a-seller',
    loadComponent: () =>
      import('./pages/become-seller.component').then(
        (m) => m.BecomeSellerComponent,
      ),
    title: 'Become a seller | KhmerCraft',
  },
  // The spec uses /become-seller; keep both spellings working.
  { path: 'become-seller', pathMatch: 'full', redirectTo: 'become-a-seller' },

  // ------------------------------------------------------------------- account
  {
    path: 'profile',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./features/user/account/profile/profile').then((m) => m.Profile),
    title: 'My profile | KhmerCraft',
  },
  {
    path: 'orders',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./features/user/account/orders/orders').then((m) => m.Orders),
    title: 'My orders | KhmerCraft',
  },

  // ------------------------------------------------------------------- seller
  {
    path: 'seller/login',
    loadComponent: () =>
      import('./features/authentication/seller/login/seller-login').then(
        (m) => m.SellerLogin,
      ),
    title: 'Seller sign in | KhmerCraft',
  },
  {
    path: 'seller/orders',
    canActivate: [sellerGuard],
    loadComponent: () =>
      import('./features/seller/orders/seller-orders').then(
        (m) => m.SellerOrders,
      ),
    title: 'Incoming orders | KhmerCraft',
  },

  // ---------------------------------------------------------------------- auth
  {
    path: 'login',
    loadComponent: () =>
      import('./features/authentication/buyer/login/login').then(
        (module) => module.Login,
      ),
    title: 'Sign in | KhmerCraft',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/authentication/buyer/register/register').then(
        (module) => module.Register,
      ),
    title: 'Create buyer account | KhmerCraft',
  },
  // The storefront nav links to /signup; route it at the real register page.
  { path: 'signup', pathMatch: 'full', redirectTo: 'register' },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import(
        './features/authentication/buyer/forgot-password/forgot-password'
      ).then(
        (module) => module.ForgotPassword,
      ),
    title: 'Forgot password | KhmerCraft',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/authentication/buyer/reset-password/reset-password').then(
        (module) => module.ResetPassword,
      ),
    title: 'Reset password | KhmerCraft',
  },
  {
    path: 'account/change-password',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import(
        './features/authentication/buyer/change-password/change-password'
      ).then(
        (module) => module.ChangePassword,
      ),
    title: 'Change password | KhmerCraft',
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/authentication/login/admin-login').then(
        (module) => module.AdminLogin,
      ),
    title: 'Admin sign in | KhmerCraft',
  },

  // ------------------------------------------------------------- support pages
  // One component driven by route data — these differ only in copy.
  {
    path: 'help',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'help' },
    title: 'Help centre | KhmerCraft',
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'contact' },
    title: 'Contact us | KhmerCraft',
  },
  {
    path: 'shipping',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'shipping' },
    title: 'Shipping information | KhmerCraft',
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'terms' },
    title: 'Terms of service | KhmerCraft',
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'privacy' },
    title: 'Privacy policy | KhmerCraft',
  },

  // A real 404 rather than a silent redirect, so a broken link stays visible
  // instead of quietly dumping the visitor on the homepage.
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page not found | KhmerCraft',
  },
];
