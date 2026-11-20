import { AccessMovement, AccessUserType, RecentAccess } from './dashboard.model';

/**
 * Contrato SUPUESTO de la pantalla de Accesos (pendiente de confirmar con backend):
 *   GET admin/access-events?search=&movement=&page=&size=&sort=  -> PageResponse<AccessRecord>
 * `search` filtra por patente (parcial); `movement` es ENTRY o EXIT (vacío = todos).
 */

/** Cómo se registró el movimiento: lectura automática de la patente (cámara) o carga manual. */
export type AccessMethod = 'AUTOMATIC' | 'MANUAL';

export interface AccessRecord extends RecentAccess {
  method: AccessMethod;
}

export const ACCESS_METHOD_LABELS: Record<AccessMethod, string> = {
  AUTOMATIC: 'Automático',
  MANUAL: 'Manual',
};

export const ACCESS_MOVEMENT_LABELS: Record<AccessMovement, string> = {
  ENTRY: 'Ingreso',
  EXIT: 'Egreso',
};

export const ACCESS_USER_TYPE_LABELS: Record<AccessUserType, string> = {
  REGISTERED: 'Registrado',
  VISITOR: 'Visitante',
  TEACHER: 'Docente',
  STAFF: 'Personal',
};
