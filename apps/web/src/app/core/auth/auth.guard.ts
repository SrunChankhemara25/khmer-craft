import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const buyerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.loadCurrentUser().pipe(
    map((user) =>
      user?.role === 'BUYER'
        ? true
        : router.createUrlTree(['/login'], {
            queryParams: { returnUrl: '/account/change-password' },
          }),
    ),
  );
};
