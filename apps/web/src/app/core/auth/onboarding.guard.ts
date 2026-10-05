import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { SellerService } from '../api/seller.service';
import { AuthService } from './auth.service';

/**
 * Store onboarding is for people who don't have a store yet.
 *
 * Every "Start selling" link on the seller pages points here, so a store
 * owner who clicked one (or signed in from a page that bounced them with
 * returnUrl=/seller/onboarding) used to land on a blank create-store form and
 * end up making a duplicate store. Anyone who already owns a store goes to
 * their dashboard instead — unless they explicitly asked for another one
 * (`?new=1`, set by the dashboard's "Create another store" button).
 */
export const onboardingGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const sellers = inject(SellerService);
  const router = inject(Router);

  return auth.loadCurrentUser().pipe(
    switchMap((user) => {
      if (!user) {
        return of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
      }
      // A non-seller can't open the dashboard (sellerGuard), so redirecting
      // them there would just bounce them back to a login page.
      if (route.queryParamMap.get('new') === '1' || user.role !== 'SELLER') {
        return of(true);
      }
      return sellers.getMyStores().pipe(
        map((stores) => (stores.length ? router.createUrlTree(['/seller/dashboard']) : true)),
        // If the store lookup fails, let them through rather than lock them out.
        catchError(() => of(true)),
      );
    }),
  );
};
