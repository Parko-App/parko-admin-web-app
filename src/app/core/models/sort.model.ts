export type SortDirection = 'asc' | 'desc';

/** Orden de una tabla: campo y dirección. null = orden por defecto del servidor. */
export interface SortState {
  field: string;
  direction: SortDirection;
}
