import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import type { UserRole } from '../models/user-profile.model';
import { AuthService } from '../services/auth.service';

export const roleGuard =
  (...allowedRoles: UserRole[]): CanActivateFn =>
  async (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const session = await authService.activeSession();

    if (!session) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    return allowedRoles.includes(session.role) ? true : router.createUrlTree(['/home']);
  };
