import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { retry, timer, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const httpResilienceInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    retry({
      count: 2,
      delay: (error: HttpErrorResponse, count: number) => {
        // Only retry on typical transient server errors
        const transientErrors = [500, 502, 503, 504];
        if (!transientErrors.includes(error.status)) {
          return throwError(() => error);
        }
        
        console.warn(`Auth: Transient error ${error.status}. Retry attempt ${count}/2...`);
        return timer(count * 1000); // Exponential-ish backoff
      }
    }),
    catchError((error: HttpErrorResponse) => {
      // Global error handling can be expanded here
      return throwError(() => error);
    })
  );
};
