import { HttpErrorResponse } from '@angular/common/http';
import { toErrorMessage } from '../http/error-message';
import { AuthError } from './auth.models';

/** Mensaje en español para cualquier error del inicio de sesión (Firebase, negocio o HTTP). */
export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    return error.code === 'NOT_ADMIN'
      ? 'Tu cuenta no tiene permisos de administrador.'
      : 'Tu cuenta está desactivada. Contactá a un administrador.';
  }
  if (error instanceof HttpErrorResponse) {
    return error.status === 404
      ? 'No encontramos un perfil asociado a esta cuenta.'
      : toErrorMessage(error);
  }
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Email o contraseña incorrectos.';
    case 'auth/user-disabled':
      return 'Tu cuenta está desactivada. Contactá a un administrador.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Esperá unos minutos e intentá nuevamente.';
    case 'auth/network-request-failed':
      return 'No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.';
    default:
      return 'No se pudo iniciar sesión. Intentá nuevamente.';
  }
}
