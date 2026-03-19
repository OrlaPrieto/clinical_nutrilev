import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const role = authService.userRole();

    if (authService.isLoggedIn() && role && allowedRoles.includes(role)) {
      return true;
    }

    // Redirect to login if not authorized
    router.navigate(['/login']);
    return false;
  };
};
