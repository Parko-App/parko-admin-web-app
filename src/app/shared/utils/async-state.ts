import { Observable, catchError, map, of, startWith } from 'rxjs';
import { toErrorMessage } from '../../core/http/error-message';

export type AsyncStatus = 'loading' | 'error' | 'empty' | 'success';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}

export const LOADING_STATE: AsyncState<never> = { status: 'loading', data: null, error: null };

/**
 * Convierte una consulta HTTP en un flujo de estados (cargando → éxito / vacío / error)
 * listo para usar con <app-async-state>.
 * Uso: state = toSignal(toAsyncState(this.service.list(), (page) => page.content.length === 0));
 */
export function toAsyncState<T>(
  source$: Observable<T>,
  isEmpty: (data: T) => boolean = (data) => Array.isArray(data) && data.length === 0,
): Observable<AsyncState<T>> {
  return source$.pipe(
    map(
      (data): AsyncState<T> => ({
        status: isEmpty(data) ? 'empty' : 'success',
        data,
        error: null,
      }),
    ),
    catchError((error: unknown) =>
      of<AsyncState<T>>({ status: 'error', data: null, error: toErrorMessage(error) }),
    ),
    startWith<AsyncState<T>>(LOADING_STATE),
  );
}
