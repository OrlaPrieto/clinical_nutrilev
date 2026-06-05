import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo aplicar a peticiones que van a nuestra API (que empiezan con /api o con la URL base)
  const isApiRequest = req.url.startsWith('/api') || req.url.startsWith(environment.apiUrl);
  
  if (!isApiRequest) {
    return next(req);
  }

  // Obtenemos el token del AuthService usando Angular DI y el signal reactivo de forma limpia
  const authService = inject(AuthService);
  const authToken = authService.accessToken;

  if (authToken) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`
      }
    });
    return next(authReq);
  }

  return next(req);
};
