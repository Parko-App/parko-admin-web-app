import { HttpErrorResponse } from '@angular/common/http';

/** Mensaje en español, apto para mostrarle al administrador, a partir de cualquier error. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.';
    }
    const serverMessage = extractServerMessage(error.error);
    switch (error.status) {
      case 400:
      case 422:
        return serverMessage ?? 'Los datos enviados no son válidos.';
      case 401:
        return 'Tu sesión expiró. Iniciá sesión nuevamente.';
      case 403:
        return 'No tenés permisos para realizar esta acción.';
      case 404:
        return serverMessage ?? 'No se encontró el recurso solicitado.';
      case 409:
        return serverMessage ?? 'La operación no se pudo completar por un conflicto con los datos existentes.';
      default:
        if (error.status >= 500) {
          return 'Ocurrió un error en el servidor. Intentá nuevamente en unos minutos.';
        }
        return serverMessage ?? 'Ocurrió un error inesperado.';
    }
  }
  return 'Ocurrió un error inesperado.';
}

function extractServerMessage(body: unknown): string | null {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return null;
}
