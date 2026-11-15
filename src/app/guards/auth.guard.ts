import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const session = await authService.activeSession();

  return session ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
