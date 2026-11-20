import { SortState } from '../../core/models/sort.model';

/** Primer clic en una columna: ascendente; clics siguientes: alterna ascendente / descendente. */
export function nextSort(current: SortState | null, field: string): SortState {
  if (current?.field === field) {
    return { field, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { field, direction: 'asc' };
}

/** Formato del parámetro para el backend (estilo Spring Data): "fullName,asc". */
export function toSortParam(sort: SortState | null): string | undefined {
  return sort ? `${sort.field},${sort.direction}` : undefined;
}

const collator = new Intl.Collator('es-AR', { sensitivity: 'base', numeric: true });

/** Compara dos valores: números por valor, textos sin distinguir tildes ni mayúsculas, vacíos al final. */
export function compareValues(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty || bEmpty) {
    return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return collator.compare(String(a), String(b));
}

/**
 * Ordena una lista en memoria (tablas chicas, sin paginación del servidor).
 * `accessors` indica cómo obtener el valor a comparar de cada columna.
 */
export function sortRows<T>(
  rows: readonly T[],
  sort: SortState | null,
  accessors: Record<string, (row: T) => unknown>,
): T[] {
  const accessor = sort ? accessors[sort.field] : undefined;
  if (!sort || !accessor) {
    return [...rows];
  }
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = accessor(a);
    const right = accessor(b);
    const leftEmpty = left === null || left === undefined || left === '';
    const rightEmpty = right === null || right === undefined || right === '';
    // Los vacíos siempre quedan al final, sin importar la dirección.
    if (leftEmpty || rightEmpty) {
      return compareValues(left, right);
    }
    return compareValues(left, right) * factor;
  });
}
