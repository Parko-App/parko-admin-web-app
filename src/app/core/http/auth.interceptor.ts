import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthGateway } from '../auth/auth.gateway';
import { AuthService } from '../auth/auth.service';
import { API_URL } from '../config/tokens';

/**
 * Agrega el token a las llamadas a la API propia y, si el backend responde 401,
 * cierra la sesión y vuelve al login. No toca pedidos a otros orígenes.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(inject(API_URL))) {
    return next(request);
  }

  const gateway = inject(AuthGateway);
  const injector = inject(Injector);

  return from(gateway.idToken()).pipe(
    switchMap((token) =>
      next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request),
    ),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const auth = injector.get(AuthService);
        if (auth.isAuthenticated()) {
          const router = injector.get(Router);
          void auth.logout().then(() =>
            router.navigate(['/login'], { queryParams: { reason: 'expired', returnUrl: router.url } }),
          );
        }
      }
      return throwError(() => error);
    }),
  );
};
