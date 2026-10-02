import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';

/**
 * TEMPORARY TESTING SWITCH
 * ------------------------
 * false → anyone can open /admin without logging in (current mode).
 * true  → real protection: only sessions with role ADMIN get in,
 *         everyone else is sent to /admin/login.
 *
 * Flip back to `true` before demo/grading/deployment.
 */
const ADMIN_GUARD_ENABLED = false;

export const adminGuard: CanActivateFn = (_route, state) => {
  if (!ADMIN_GUARD_ENABLED) {
    return true; // testing mode — no redirect
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.loadCurrentUser().pipe(
    map((user) =>
      user?.role === 'ADMIN'
        ? true
        : router.createUrlTree(['/admin/login'], {
            queryParams: { returnUrl: state.url },
          }),
    ),
  );
};