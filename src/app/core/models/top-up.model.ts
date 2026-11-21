/**
 * Contrato SUPUESTO de la pantalla de Carga de saldos (pendiente de confirmar con backend):
 *   GET admin/top-ups?search=&page=&size=&sort=  -> PageResponse<TopUp>
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
