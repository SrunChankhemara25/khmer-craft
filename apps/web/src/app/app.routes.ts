import { Routes } from '@angular/router';
import { buyerGuard } from './core/auth/auth.guard';
import { adminGuard } from './admin/admin.guard';
import { sellerGuard } from './core/auth/seller.guard';
import { onboardingGuard } from './core/auth/onboarding.guard';
import { storeDomainMatchGuard } from './core/storefront/store-domain.service';
import { LEGACY_SELLER_ROUTES, onPortal, sellerPortalHostMatch } from './core/portal/portal';

/**
 * Everything is lazy-loaded. The storefront branch imported all 19 page
 * components eagerly, which put the whole site in the initial bundle.
 *
 * The routes are split by which site they belong to — the marketplace or the
 * seller portal (see core/portal/portal.ts). `onPortal` sends a page opened on
 * the wrong origin over to the right one, so the two sites never overlap.
 */

// ------------------------------------------------------------ seller portal
// The seller portal's public pages sit at the root of its own origin. Matched
// only on that origin, so on the marketplace `/` and `/about` stay the
// marketplace's own pages.
const sellerPortalPages: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canMatch: [sellerPortalHostMatch],
    loadComponent: () =>
      import('./features/seller/landing/seller-landing').then((m) => m.SellerPage),
    title: 'Sell on KhmerCraft | KhmerCraft Seller',
  },
  {
    path: 'explore',
    canMatch: [sellerPortalHostMatch],
    loadComponent: () =>
      import('./features/seller/explore/seller-explore').then((m) => m.SellerExplore),
    title: 'Tour the seller workspace | KhmerCraft Seller',
  },
  {
    path: 'pricing',
    canMatch: [sellerPortalHostMatch],
    loadComponent: () =>
      import('./features/seller/pricing/seller-pricing').then((m) => m.SellerPricing),
    title: 'Plans & pricing | KhmerCraft Seller',
  },
  {
    path: 'guide',
    canMatch: [sellerPortalHostMatch],
    loadComponent: () =>
      import('./features/seller/guide/seller-guide').then((m) => m.SellerGuide),
    title: 'Seller guide | KhmerCraft Seller',
  },
  {
    path: 'faq',
    canMatch: [sellerPortalHostMatch],
    loadComponent: () =>
      import('./features/seller/faq/seller-faq').then((m) => m.SellerFaq),
    title: 'Seller FAQ | KhmerCraft Seller',
  },
  {
    path: 'about',
    canMatch: [sellerPortalHostMatch],
    loadComponent: () =>
      import('./features/seller/about/seller-about').then((m) => m.SellerAbout),
    title: 'About KhmerCraft Seller | KhmerCraft Seller',
  },
];

// Signed-in seller workspace — always served from the seller portal origin.
const sellerWorkspace: Routes = onPortal('seller', [
  {
    path: 'seller/login',
    loadComponent: () =>
      import('./features/authentication/seller/login/seller-login').then(
        (m) => m.SellerLogin,
      ),
    title: 'Seller sign in | KhmerCraft Seller',
  },
  {
    path: 'seller/onboarding',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./features/seller/onboarding/seller-onboarding').then(
        (m) => m.SellerOnboardingPage,
      ),
    title: 'Create your store | KhmerCraft Seller',
  },
  {
    path: 'seller/dashboard',
    canActivate: [sellerGuard],
    loadComponent: () =>
      import('./pages/seller-dashboard/seller-dashboard').then(
        (m) => m.SellerDashboardPage,
      ),
    title: 'Seller dashboard | KhmerCraft Seller',
  },
  {
    // Plan & billing: what the store is on, when it lapses, and the KHQR to
    // renew it with.
    path: 'seller/billing',
    canActivate: [sellerGuard],
    loadComponent: () =>
      import('./pages/seller-billing.component').then(
        (m) => m.SellerBillingComponent,
      ),
    title: 'Plan & billing | KhmerCraft Seller',
  },
  {
    // Guarded by buyerGuard, not sellerGuard: a seller who has only ever been
    // on Starter may still be a BUYER when they come to pay for their first
    // paid plan, and a sellerGuard would bounce them off their own checkout.
    path: 'seller/plan/pay',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./pages/plan-payment.component').then(
        (m) => m.PlanPaymentComponent,
      ),
    title: 'Activate your plan | KhmerCraft Seller',
  },
  {
    // Last step of store setup — after the plan is paid, or straight after
    // creating a store on the free plan.
    path: 'seller/store-ready',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./pages/seller-store-ready.component').then(
        (m) => m.SellerStoreReadyComponent,
      ),
    title: 'Your store is live | KhmerCraft Seller',
  },
  {
    path: 'seller/orders',
    canActivate: [sellerGuard],
    loadComponent: () =>
      import('./features/seller/orders/seller-orders').then(
        (m) => m.SellerOrders,
      ),
    title: 'Incoming orders | KhmerCraft Seller',
  },
]);

// --------------------------------------------------------------- marketplace
const marketplace: Routes = onPortal('marketplace', [
  // The visual fixture used to mock SellerService, so attempting to finish
  // onboarding here could never create a store. Keep old bookmarks useful by
  // sending them to the real, authenticated onboarding flow.
  { path: '__storefront-design-test', pathMatch: 'full', redirectTo: 'seller/onboarding' },
  // If visited via a dedicated store domain/subdomain (e.g. `seoul-2.localhost:4200` or `?store=seoul-2`),
  // immediately render that store's standalone website as the homepage!
  {
    path: '',
    canMatch: [storeDomainMatchGuard],
    loadComponent: () =>
      import('./pages/store-detail.component').then(
        (m) => m.StoreDetailComponent,
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/home.component').then((m) => m.HomeComponent),
    title: 'KhmerCraft — Cambodia’s local-first marketplace',
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
  {
    // Where an ABA_PAYWAY order goes to actually be paid: the KHQR from ABA,
    // plus polling that settles the order once ABA confirms the transaction.
    path: 'checkout/pay/:orderNumber',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./pages/payway-payment.component').then(
        (m) => m.PaywayPaymentComponent,
      ),
    title: 'Pay with ABA | KhmerCraft',
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
    // Not "confirmed": an ABA order reaches this page unpaid too.
    title: 'Your order | KhmerCraft',
  },

  // ----------------------------------------------------------------- marketing
  {
    path: 'about',
    loadComponent: () =>
      import('./pages/about.component').then((m) => m.AboutComponent),
    title: 'About | KhmerCraft',
  },

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

  // --------------------------------------------------------------------- admin
  {
    // Listed BEFORE the guarded 'admin' tree below, so the login page itself
    // stays reachable without a session.
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/authentication/login/admin-login').then(
        (module) => module.AdminLogin,
      ),
    title: 'Admin sign in | KhmerCraft',
  },
  {
    // Khemara's admin area, lazily loaded as a child route tree behind
    // adminGuard.
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
    title: 'Administration | KhmerCraft',
  },
]);

// -------------------------------------------------------------------- shared
// One account works on both sites, so sign-in, help and legal pages are
// served on whichever origin the visitor is already on.
const shared: Routes = onPortal('shared', [
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
  // Retired simulated reset-code screens. Password reset now happens only
  // through the secure token link produced by /forgot-password.
  { path: 'verify', pathMatch: 'full', redirectTo: 'forgot-password' },
  { path: 'verify-code', pathMatch: 'full', redirectTo: 'forgot-password' },
  {
    // Registration's own verification step — separate from the password-reset
    // /verify placeholder above, and actually wired to the API.
    path: 'verify-email',
    loadComponent: () =>
      import('./features/authentication/buyer/verify-email/verify-email').then(
        (m) => m.VerifyEmail,
      ),
    title: 'Verify your email | KhmerCraft',
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
]);

export const routes: Routes = [
  ...sellerPortalPages,
  ...LEGACY_SELLER_ROUTES,
  ...sellerWorkspace,
  ...marketplace,
  ...shared,
];
