/**
 * Carga de saldos (admin-service, TopUpController):
 *   GET  admin/top-ups?search=&page=&size=&sort=  -> PageResponse<TopUp>
 *   POST admin/top-ups { userId, amount }         -> TopUp (acredita el saldo y registra la carga en efectivo)
 * `search` filtra por número de transacción o por usuario (nombre o correo).
 */
export type TopUpStatus = 'CREDITED' | 'PENDING' | 'REJECTED';
export type TopUpMethod = 'MERCADO_PAGO' | 'CASH';

export interface TopUp {
  id: string;
  /** Ej.: "TX-54EFBE" */
  transactionNumber: string;
  userName: string;
  userEmail: string;
  /** Instante de la carga (ISO 8601). */
  timestamp: string;
  amount: number;
  method: TopUpMethod;
  status: TopUpStatus;
}

export const TOP_UP_STATUS_LABELS: Record<TopUpStatus, string> = {
  CREDITED: 'Acreditada',
  PENDING: 'Pendiente',
  REJECTED: 'Rechazada',
};

export const TOP_UP_METHOD_LABELS: Record<TopUpMethod, string> = {
  MERCADO_PAGO: 'Mercado Pago',
  CASH: 'Efectivo',
};

/** Usuario al que se le puede cargar saldo (resultado de la búsqueda del diálogo). */
export interface TopUpUser {
  id: string;
  fullName: string;
  email: string;
}

/** Carga manual de saldo hecha por un administrador. */
export interface TopUpRequest {
  userId: string;
  amount: number;
}

/** Tope de una carga manual; el backend lo valida con el mismo valor (TOPUP_MAX_AMOUNT). */
export const TOP_UP_MAX_AMOUNT = 100000;
