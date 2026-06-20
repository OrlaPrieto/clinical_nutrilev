import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../shared/services/toast.service';
import { environment } from '../../environments/environment';
import { supabase } from '../supabase';
import { Router } from '@angular/router';
import { retry, timer, throwError, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

export const httpResilienceInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);

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
        const isLoginPage = router.url.includes('/login');
        
        // Only trigger session refresh/logout if logged in, not on login page, and not during initial loading phase
        if (authService.isLoggedIn() && !isLoginPage && !authService.isInitialLoading()) {
          console.warn('Auth: Unauthorized request detected (expired token). Attempting silent session refresh...');
          
          return from(supabase.auth.refreshSession()).pipe(
            switchMap(({ data, error: refreshError }) => {
              if (!refreshError && data?.session) {
                console.log('Auth: Silent session refresh succeeded. Retrying failed request...');
                
                // Clone request with the new access token
                const retriedReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${data.session.access_token}`
                  }
                });
                return next(retriedReq);
              } else {
                console.error('Auth: Silent session refresh failed. Logging out...', refreshError);
                toastService.show('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'error', 4000);
                authService.logout();
                return throwError(() => error);
              }
            }),
            catchError((refErr) => {
              console.error('Auth: Exception during silent session refresh. Logging out...', refErr);
              toastService.show('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'error', 4000);
              authService.logout();
              return throwError(() => error);
            })
          );
        } else {
          console.warn('Auth: 401 error ignored for logout redirect (loading, not logged in, or on login page).');
        }
      }
      return throwError(() => error);
    })
  );
};


