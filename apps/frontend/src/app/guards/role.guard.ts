import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await authService.ready; // Esperar a que Supabase recupere la sesión
    
    const role = authService.userRole();

    if (authService.isLoggedIn() && role && allowedRoles.includes(role)) {
      return true;
    }

    // Redirect to login if not authorized
    router.navigate(['/login']);
    return false;
  };
};
