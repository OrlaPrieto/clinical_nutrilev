import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../shared/services/toast.service';
import { environment } from '../../environments/environment';
import { retry, timer, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const httpResilienceInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);

  return next(req).pipe(
    retry({
      count: 2,
      delay: (error: HttpErrorResponse, count: number) => {
        // Only retry on typical transient server errors or connection resets (0)
        const transientErrors = [0, 500, 502, 503, 504];
        if (!transientErrors.includes(error.status)) {
          return throwError(() => error);
        }
        
        console.warn(`Auth: Transient error ${error.status}. Retry attempt ${count}/2...`);
        return timer(count * 1000); // Exponential-ish backoff
      }
    }),
    catchError((error: HttpErrorResponse) => {
      const isApiRequest = req.url.startsWith('/api') || req.url.startsWith(environment.apiUrl);
      if (error.status === 401 && isApiRequest) {
        console.warn('Auth: Unauthorized request detected (expired or invalid token). Logging out...');
        toastService.show('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'error', 4000);
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};

