import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { supabase } from '../supabase';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo aplicar a peticiones que van a nuestra API (que empiezan con /api o con la URL base)
  const isApiRequest = req.url.startsWith('/api') || req.url.startsWith(environment.apiUrl);
  
  if (!isApiRequest) {
    return next(req);
  }

  // Intentamos obtener la sesión de Supabase de forma sincrónica si es posible, 
  // o confiamos en que el cliente de Supabase ya tiene la sesión cargada.
  // Nota: supabase.auth.getSession() es asíncrono, pero para un interceptor 
  // a menudo queremos evitar convertirlo todo en una promesa si no es necesario.
  // Sin embargo, Supabase expone la sesión internamente.
  
  const session = (supabase.auth as any).session?.() || (supabase.auth as any).currentSession;
  const token = (supabase.auth as any).session?.access_token || 
                (supabase.auth as any).data?.session?.access_token;

  // Una forma más robusta usando el almacenamiento interno si el getter falla
  let authToken = token;
  if (!authToken) {
    // Intentar recuperar del estado interno del cliente
    try {
      // @ts-ignore - Accediendo a propiedad interna para rapidez en interceptor
      authToken = supabase.auth.session()?.access_token;
    } catch {}
  }

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
