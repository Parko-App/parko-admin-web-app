import { AccessMovement, AccessUserType, RecentAccess } from './dashboard.model';

/**
 * Contrato de la pantalla de Accesos (admin-service, AccessController):
 *   GET admin/accesos?search=&movement=&page=&size=&sort=  -> PageResponse<AccessRecord>
 * `search` filtra por patente (parcial); `movement` es ENTRY o EXIT (vacío = todos).
 */

/** Cómo se registró el movimiento: lectura automática de la patente (cámara) o carga manual. */
export type AccessMethod = 'AUTOMATIC' | 'MANUAL';

/** Resultado del intento de acceso (columna result de access_log). */
export type AccessResult = 'AUTHORIZED' | 'DENIED';

export interface AccessRecord extends RecentAccess {
  method: AccessMethod;
  /** Si no viene, se asume AUTHORIZED. DENIED = el acceso se intentó pero no se autorizó. */
  result?: AccessResult;
}

export const ACCESS_METHOD_LABELS: Record<AccessMethod, string> = {
  AUTOMATIC: 'Automático',
  MANUAL: 'Manual',
};

/** Texto del movimiento: un acceso denegado se muestra como "Egreso denegado" / "Ingreso denegado". */
export function accessMovementText(record: Pick<AccessRecord, 'movement' | 'result'>): string {
  const label = ACCESS_MOVEMENT_LABELS[record.movement];
  return record.result === 'DENIED' ? `${label} denegado` : label;
}

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
