import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { ProductsComponent } from './pages/products.component';
import { StoresComponent } from './pages/stores.component';
import { ProductDetailComponent } from './pages/product-detail.component';
import { CategoriesComponent } from './pages/categories.component';
import { CartComponent } from './pages/cart.component';
import { WishlistComponent } from './pages/wishlist.component';
import { CheckoutDeliveryComponent } from './pages/checkout-delivery.component';
import { CheckoutShippingComponent } from './pages/checkout-shipping.component';
import { CheckoutPaymentComponent } from './pages/checkout-payment.component';
import { CheckoutReviewComponent } from './pages/checkout-review.component';
import { OrderSuccessComponent } from './pages/order-success.component';
import { AboutComponent } from './pages/about.component';
import { BecomeSellerComponent } from './pages/become-seller.component';
import { LoginComponent } from './pages/login.component';
import { SignupComponent } from './pages/signup.component';
import { ForgotPasswordComponent } from './pages/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password.component';
import { VerifyCodeComponent } from './pages/verify-code.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'stores', component: StoresComponent },
  { path: 'product/:id', component: ProductDetailComponent },
  { path: 'categories', component: CategoriesComponent },
  { path: 'cart', component: CartComponent },
  { path: 'wishlist', component: WishlistComponent },

  // 4-step checkout flow
  { path: 'checkout', component: CheckoutDeliveryComponent },
  { path: 'checkout/shipping', component: CheckoutShippingComponent },
  { path: 'checkout/payment', component: CheckoutPaymentComponent },
  { path: 'checkout/review', component: CheckoutReviewComponent },
  { path: 'order-success', component: OrderSuccessComponent },

  // Marketing pages
  { path: 'about', component: AboutComponent },
  { path: 'become-a-seller', component: BecomeSellerComponent },

  // Auth flow
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'verify-code', component: VerifyCodeComponent },

  { path: '**', redirectTo: '' }
];
